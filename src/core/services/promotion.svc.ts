import { Err, Ok, Result } from 'ts-results';
import { AppError, ErrorCode } from '@core/lib/appError';
import { Value } from '@sinclair/typebox/value';
import { nanoid } from 'nanoid';
import { type Promotion, UpdatePromotionAction } from '@core/entities/promotion';
import { type CreatePromotionBody } from '@infrastructure/http/schemas/promotion.schemas';
import { PromotionDAO } from '@infrastructure/repositories/dao/promotion.dao.schema';
import { ActionHandlersList } from '@core/services/actions';
import { IPromotionRepository } from '@core/repositories/promotion.repo';
import { UpdateEntityActionsRunner } from '@core/lib/updateEntityActionsRunner';
import { ChangeNameActionHandler } from './actions/changeName.handler';
import { Config } from '@infrastructure/http/plugins/config';
import { green, magenta } from 'kolorist';
import { ct } from '@core/lib/ct';

class CTAdapter {
  private server;
  private ct;
  private debug: boolean = false;
  private Customer = { customerGroup: 'VIP' };
  private Categories = new Map<string, string>([
    ['SKU1', 'shoes'],
    ['SKU2', 'trainers'],
    ['SKU3', 'shirts'],
    ['SKU4', 'shirts']
  ]);

  constructor(server: any) {
    this.server = server;
    // Create apiRoot from the imported ClientBuilder and include your Project key
    this.ct = ct(this.server);
    this.debug = server.config.DEBUG;
  }

  convertCart(cart: any) {
    const products = cart.lineItems.map((lineItem: any) => ({
      id: lineItem.productId,
      sku: lineItem.variant.sku,
      centAmount: lineItem.price.value.centAmount,
      quantity: lineItem.quantity,
      categories: [this.Categories.get(lineItem.variant.sku)]
    }));
    return {
      customer: this.Customer,
      products,
      total: cart.totalPrice.centAmount
    };
  }

  // Fetch a commercetools Cart by ID
  async getCart(cartId: string) {
    const start = process.hrtime.bigint();

    const query = `query Cart {
                      cart(id: "${cartId}") {
                          id
                          lineItems {
                            id
                            productId,
                            variant { sku }
                            price{ value { centAmount } }
                            quantity
                          }
                          totalPrice {centAmount}
                      }
                  }`;

    const cart = await this.ct
      .graphql()
      .post({ body: { query } })
      .execute()
      .then((response: any) => response.body.data.cart);

    // const cart = await this.ct
    //   .carts()
    //   .withId({ ID: cartId })
    //   .get()
    //   .execute()
    //   .then((response: any) => response.body);

    const end = process.hrtime.bigint();
    const diff = (Number(end - start) / 1000000).toFixed(3);
    console.log(`${green('Get cart took')} ${magenta(diff)}ms`);
    return cart;
  }

  // Add a customline for each type=lineDiscount
  async addDiscounts(cart: any, discounts: any[]) {
    let count = 1;
    return await this.ct
      .carts()
      .withId({ ID: cart.id })
      .post({
        body: {
          version: cart.version,
          actions: cart.customLineItems
            .map((customLineItem: any) => ({
              action: 'removeCustomLineItem',
              customLineItemId: customLineItem.id
            }))
            .concat(
              discounts.map((discount: any) => ({
                action: 'addCustomLineItem',
                name: { en: `Discount [${discount.promotionId}] for ${discount.sku ? discount.sku : 'order'}` },
                quantity: 1,
                money: {
                  currencyCode: 'EUR',
                  centAmount: discount.centAmount
                },
                slug: `discount-${discount.sku ? discount.sku : 'order'}-${count++}`,
                taxCategory: {
                  typeId: 'tax-category',
                  id: '42e4dd43-da43-4c7a-b0df-e660eb527c05'
                },
                priceMode: 'External'
              }))
            )
        }
      })
      .execute()
      .then((r) => r.body)
      .catch((e) => e.body);
  }
}

// SERVICE INTERFACE
export interface IPromotionService {
  createPromotion: (payload: CreatePromotionBody) => Promise<Result<Promotion, AppError>>;
  updatePromotion: (id: string, version: number, actions: any) => Promise<Result<Promotion, AppError>>;
  findPromotionById: (id: string) => Promise<Result<Promotion, AppError>>;
  find: (query: any, options?: any) => Promise<Result<Promotion[], AppError>>;
  savePromotion: (category: Promotion) => Promise<Result<Promotion, AppError>>;
  calculate: (cartId: string, facts: any, promotionId: string) => Promise<Result<any, AppError>>;
}

const toEntity = ({ _id, ...remainder }: PromotionDAO): Promotion => ({
  id: _id,
  ...remainder
});

// SERVICE IMPLEMENTATION
export class PromotionService implements IPromotionService {
  private static instance: IPromotionService;
  private repo: IPromotionRepository;
  private actionHandlers: ActionHandlersList;
  private actionsRunner: UpdateEntityActionsRunner<PromotionDAO, IPromotionRepository>;
  private config: Config;
  private messages;
  private server;
  private ctAdapter: CTAdapter;

  private constructor(server: any) {
    this.server = server;
    this.repo = server.db.repo.promotionRepository as IPromotionRepository;
    this.actionHandlers = {
      changeName: new ChangeNameActionHandler(server)
    };
    this.actionsRunner = new UpdateEntityActionsRunner<PromotionDAO, IPromotionRepository>();
    this.config = server.config;
    this.messages = server.messages;
    this.ctAdapter = new CTAdapter(server);
  }

  public static getInstance(server: any): IPromotionService {
    if (!PromotionService.instance) {
      PromotionService.instance = new PromotionService(server);
    }
    return PromotionService.instance;
  }

  // CREATE PROMOTION
  public async createPromotion(payload: CreatePromotionBody): Promise<Result<Promotion, AppError>> {
    // Save the entity
    const result = await this.repo.create({
      id: nanoid(),
      ...payload
    });
    if (result.err) return result;
    return new Ok(toEntity(result.val));
  }

  // UPDATE PROMOTION
  public async updatePromotion(
    id: string,
    version: number,
    actions: UpdatePromotionAction[]
  ): Promise<Result<Promotion, AppError>> {
    // Find the Entity
    let result = await this.repo.findOne(id, version);
    if (result.err) return result;
    const entity: PromotionDAO = result.val;
    const toUpdateEntity = Value.Clone(entity);
    // Execute actions
    const actionRunnerResults = await this.actionsRunner.run(
      entity,
      toUpdateEntity,
      this.repo,
      this.actionHandlers,
      actions
    );
    if (actionRunnerResults.err) return actionRunnerResults;
    // Compute difference, and save if needed
    const difference = Value.Diff(entity, toUpdateEntity);
    if (difference.length > 0) {
      // Save the entity
      const saveResult = await this.repo.updateOne(id, version, actionRunnerResults.val.update);
      if (saveResult.err) return saveResult;
      toUpdateEntity.version = version + 1;
      // Send differences via messagging
      this.messages.publish(this.config.EXCHANGE, this.config.ENTITY_UPDATE_ROUTE, {
        entity: 'promotion',
        source: entity,
        difference,
        metadata: { type: 'entityUpdate' }
      });
      // Send side effects via messagging
      actionRunnerResults.val.sideEffects?.forEach((sideEffect: any) => {
        this.messages.publish(this.config.EXCHANGE, sideEffect.action, {
          ...sideEffect.data,
          metadata: { type: sideEffect.action }
        });
      });
    }
    // Return udated entity
    return Ok(toEntity(toUpdateEntity));
  }

  // FIND PROMOTION
  public async findPromotionById(id: string): Promise<Result<Promotion, AppError>> {
    const result = await this.repo.findOne(id);
    if (result.err) return result;
    return new Ok(toEntity(result.val));
  }

  // FIND MANY PROMOTIONS
  async find(query: any, options: any): Promise<Result<Promotion[], AppError>> {
    const result = await this.repo.find(query, options);
    if (result.err) return result;
    return new Ok(result.val.map((e: PromotionDAO) => toEntity(e)));
  }

  // SAVE PROMOTION
  public async savePromotion(category: Promotion): Promise<Result<Promotion, AppError>> {
    const result = await this.repo.save(category);
    if (result.err) return result;
    return new Ok(toEntity(result.val));
  }

  // CALCULATE PROMOTIONS
  public async calculate(cartId: string, facts: any, promotionId: string): Promise<Result<any, AppError>> {
    //console.log('Calculating promotions for', cartId ? cartId : '[body data]');
    let cart: any;
    if (cartId) {
      cart = await this.ctAdapter.getCart(cartId);
      facts = this.ctAdapter.convertCart(cart);
      //console.log(facts);
    } else {
      facts.total = facts.products.reduce((acc: number, item: any) => acc + item.centAmount * item.quantity, 0); // Added for quick testing
    }
    const result = await this.server.promotionsEngine.run(facts, promotionId);
    if (result.err) return result;
    // console.log(result.val);
    // if (cartId) {
    //   const discountsResult = await this.ct.addDiscounts(cart, result.val);
    //   if (discountsResult.errors)
    //     return new Err(new AppError(ErrorCode.BAD_REQUEST, discountsResult.errors[0].message));
    // }
    return Ok(result.val);
  }
}

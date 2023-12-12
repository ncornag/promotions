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
import fetch from 'node-fetch';

// COMMERCETOOLS
const TOKEN = 'DRE11ON7zjGIaEI-QJ_SBzwF1oeXWaeF';

// Add a customline for each type=lineDiscount
async function addDiscounts(cart: any, discounts: any[]) {
  let count = 1;
  const response = await fetch(`https://api.europe-west1.gcp.commercetools.com/nico-test-project/carts/${cart.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
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
    })
  });
  return response.json();
}

// Fetch a commercetools Cart by ID using node-fetch
async function getCart(cartId: string) {
  const response = await fetch(`https://api.europe-west1.gcp.commercetools.com/nico-test-project/carts/${cartId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    }
  });
  return response.json();
}

const Customer = { customerGroup: 'VIP' };
const Categories = new Map<string, string>([
  ['SKU1', 'shoes'],
  ['SKU2', 'trainers'],
  ['SKU3', 'shirts'],
  ['SKU4', 'shirts']
]);

function convertCart(cart: any) {
  const products = cart.lineItems.map((lineItem: any) => ({
    id: lineItem.productId,
    sku: lineItem.variant.sku,
    centAmount: lineItem.price.value.centAmount,
    quantity: lineItem.quantity,
    categories: [Categories.get(lineItem.variant.sku)]
  }));
  return {
    customer: Customer,
    products,
    total: cart.totalPrice.centAmount
  };
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

  private constructor(server: any) {
    this.server = server;
    this.repo = server.db.repo.promotionRepository as IPromotionRepository;
    this.actionHandlers = {
      changeName: new ChangeNameActionHandler(server)
    };
    this.actionsRunner = new UpdateEntityActionsRunner<PromotionDAO, IPromotionRepository>();
    this.config = server.config;
    this.messages = server.messages;
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
      cart = await getCart(cartId);
      facts = convertCart(cart);
      // console.log(facts);
    } else {
      facts.total = facts.products.reduce((acc: number, item: any) => acc + item.centAmount * item.quantity, 0); // Added for quick testing
    }
    const result = await this.server.promotionsEngine.run(facts, promotionId);
    if (result.err) return result;
    // console.log(result.val);
    if (cartId) {
      const discountsResult = await addDiscounts(cart, result.val);
      if (discountsResult.errors)
        return new Err(new AppError(ErrorCode.BAD_REQUEST, discountsResult.errors[0].message));
    }
    return Ok(result.val);
  }
}

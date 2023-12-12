import { Ok, Err, Result } from 'ts-results';
import { AppError, ErrorCode } from './appError';
import { PromotionService, IPromotionService } from '@core/services/promotion.svc';
import { Promotion, Then, When } from '@core/entities/promotion';
import jsonata, { Expression } from 'jsonata';
import { green, magenta, yellow } from 'kolorist';

const cache = new Map<string, Expression>();
const debug = false;

// EXPRESSIONS

function productWithSku(products: any, sku: string) {
  // const e = expression(`products["products[sku='${sku}']`);
  return products.find((p: any) => p.sku === sku);
}

function productInCategory(products: any, category: string) {
  // const e = expression(`products["${category}" in categories][0]`);
  return products.find((p: any) => p.categories.find((c: any) => c === category) != undefined);
}

function lowestPricedProductInCategory(products: any, category: string) {
  // const e = expression(`products['${category}' in categories]^(centAmount)[0]`);
  let min: number = Number.MAX_SAFE_INTEGER;
  let result: any;
  for (const product of products) {
    if (product.categories.find((c: any) => c === category) != undefined && product.centAmount < min) {
      min = product.centAmount;
      result = product;
    }
  }
  return result;
}

function expression(expression: string): Expression {
  let compiled: Expression | undefined = cache.get(expression);
  if (!compiled) {
    compiled = jsonata(expression);
    compiled.registerFunction('productInCategory', productInCategory, '<as:o>');
    compiled.registerFunction('lowestPricedProductInCategory', lowestPricedProductInCategory, '<as:o>');
    compiled.registerFunction('productWithSku', productWithSku, '<as:o>');
    cache.set(expression, compiled);
    return compiled;
  }
  return compiled;
}

// ACTIONS

async function createLineDiscount(facts: any, bindings: any, promotionId: any, action: any) {
  if (debug) console.log(yellow('  creating LineDiscount'));
  const skuExpression = expression(action.sku);
  const skuExpressionResult = await skuExpression.evaluate(facts, bindings);
  const discountExpression = expression(action.discount);
  const discountExpressionResult = await discountExpression.evaluate(facts, bindings);
  if (debug) console.log(`    ${green('sku')}: ${action.sku} = ${green(skuExpressionResult)}`);
  if (debug) console.log(`    ${green('discount')}: ${action.discount} = ${green(discountExpressionResult)}`);
  bindings.discounts.push({
    promotionId,
    type: 'lineDiscount',
    sku: skuExpressionResult,
    centAmount: -(discountExpressionResult * 100).toFixed(0) / 100
  });
}

async function createOrderDiscount(facts: any, bindings: any, promotionId: any, action: any) {
  if (debug) console.log(yellow('  creating OrderDiscount'));
  const discountExpression = expression(action.discount);
  const discountExpressionResult = await discountExpression.evaluate(facts, bindings);
  if (debug) console.log(`    ${green('discount')}: ${action.discount} = ${green(discountExpressionResult)}`);
  bindings.discounts.push({
    promotionId,
    type: 'orderDiscount',
    centAmount: -(discountExpressionResult * 100).toFixed(0) / 100
  });
}

async function tagAsUsed(facts: any, bindings: any, promotionId: any, action: any) {
  if (debug) console.log(yellow('  tagging as used'));
  for await (const product of action.products) {
    const productIdExpression = expression(product.productId);
    const productIdExpressionResult = await productIdExpression.evaluate(facts, bindings);
    const productIndex = facts.products.findIndex((p: any) => p.id === productIdExpressionResult);
    if (productIndex != -1) {
      const quantityExpression = expression(product.quantity);
      const quantityExpressionResult = await quantityExpression.evaluate(facts, bindings);
      if (debug)
        console.log(
          `    ${green('productId')}: ${product.productId} = ${green(productIdExpressionResult)} | ${green(
            'quantity'
          )}: ${product.quantity} = ${green(quantityExpressionResult)} | ${facts.products[productIndex].quantity} => ${
            facts.products[productIndex].quantity - quantityExpressionResult
          }`
        );
      facts.products[productIndex].quantity -= quantityExpressionResult;
      if (facts.products[productIndex].quantity <= 0) {
        facts.products.splice(productIndex, 1);
      }
    } else {
      throw new Error(`Product ${product.productId} ${productIdExpressionResult} not found`);
    }
  }
}

const Actions = {
  createLineDiscount,
  createOrderDiscount,
  tagAsUsed
};

// ENGINE

export class PromotionsEngine {
  private server: any;
  private promotionsService: IPromotionService;
  // private promotions: Promotion[];

  constructor(server: any) {
    this.server = server;
    this.promotionsService = PromotionService.getInstance(server);
  }

  async evaluateWhen(when: When, facts: any, bindings: any) {
    // const start = process.hrtime.bigint();
    let result = true;
    for (const [key, value] of Object.entries(when)) {
      const valueExpression = expression(value);
      const valueExpressionResult = await valueExpression.evaluate(facts, bindings);
      if (debug)
        console.log(
          `  ${green(key)}: ${value} = ${green(
            valueExpressionResult?.sku ? valueExpressionResult.sku : valueExpressionResult
          )}`
        );
      if (
        valueExpressionResult == undefined ||
        (typeof valueExpressionResult === 'boolean' && valueExpressionResult !== true)
      ) {
        result = false;
        break;
      }
      bindings[key] = valueExpressionResult;
    }
    // const end = process.hrtime.bigint();
    //if (debug) console.log(`${green('  evaluateWhen')} in ${magenta(Number(end - start))}ns`);
    return result;
  }

  async evaluateThen(promotionId: any, then: Then, facts: any, bindings: any) {
    for await (const action of then) {
      if (!Actions[action.action]) {
        throw new AppError(ErrorCode.BAD_REQUEST, `Action ${action.action} not found`);
      }
      // const start = process.hrtime.bigint();
      await Actions[action.action](facts, bindings, promotionId, action);
      // const end = process.hrtime.bigint();
      // if (debug) console.log(`${green('    evaluateThen')} in ${magenta(Number(end - start))}ns`);
    }
  }

  async run(facts: any, promotionId?: string): Promise<Result<any, AppError>> {
    //const p = await this.firstProductInCategory(facts, 'shoes');
    const bindings = { discounts: [] };
    const promotionsFilter: any = {
      active: {
        $ne: false
      }
    };
    if (promotionId) {
      promotionsFilter._id = promotionId;
    }
    const result = await this.promotionsService.find(promotionsFilter); // Fetch them everytime for now
    if (result.err) throw result.err;
    const promotions: Promotion[] = result.val;
    const securityStopExecutionTimes = 999;
    const start = process.hrtime.bigint();
    const linesInCart = facts.products.length;
    const productsInCart = facts.products.reduce((acc: number, item: any) => acc + item.quantity, 0);
    // Run each promotion in order
    for await (const promotion of promotions) {
      if (debug) console.log(`${yellow(promotion.name)} (${promotion.times ? promotion.times : '∞'})`);
      let rulesResult = false;
      let executions = 0;
      let maxExecutions = promotion.times || securityStopExecutionTimes;
      do {
        rulesResult = await this.evaluateWhen(promotion.when, facts, bindings);
        if (rulesResult === true) {
          // Actions
          facts.discounts = facts.discounts || [];
          await this.evaluateThen(promotion.id, promotion.then, facts, bindings);
        }
        executions++;
      } while (rulesResult === true && executions < maxExecutions);
    }
    const end = process.hrtime.bigint();
    const diff = (Number(end - start) / 1000000).toFixed(3);
    const perMs = ((1000000 * promotions.length) / Number(end - start)).toFixed(2);
    console.log(
      `${green('PromotionsEngine.run in')} ${magenta(diff)}ms. ${yellow(
        promotions.length
      )} promotions checked at ${magenta(perMs)} promotions/ms. in a cart with ${magenta(
        linesInCart
      )} lines and ${magenta(productsInCart)} products. ${yellow(bindings.discounts.length)} discounts created.`
    );
    return new Ok(bindings.discounts);
  }
}

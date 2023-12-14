import { Expressions } from './expressions';
import { green, yellow } from 'kolorist';

export class EngineActions {
  private server: any;
  private expressions: Expressions;
  private debug: boolean = false;

  constructor(server: any, expressions: Expressions, debug: boolean = false) {
    this.server = server;
    this.expressions = expressions;
    this.debug = debug;
  }

  async createLineDiscount(facts: any, bindings: any, promotionId: any, action: any) {
    if (this.debug) console.log(yellow('    ACTION: LineDiscount'));
    const skuExpressionResult = await this.expressions.evaluate(action.sku, facts, bindings);
    const discountExpressionResult = await this.expressions.evaluate(action.discount, facts, bindings);
    if (this.debug) console.log(`      ${green('sku')}: ${action.sku} = ${green(skuExpressionResult)}`);
    if (this.debug) console.log(`      ${green('discount')}: ${action.discount} = ${green(discountExpressionResult)}`);
    bindings.discounts.push({
      promotionId,
      type: 'lineDiscount',
      sku: skuExpressionResult,
      centAmount: -(discountExpressionResult * 100).toFixed(0) / 100
    });
  }

  async createOrderDiscount(facts: any, bindings: any, promotionId: any, action: any) {
    if (this.debug) console.log(yellow('    ACTION: OrderDiscount'));
    const discountExpressionResult = await this.expressions.evaluate(action.discount, facts, bindings);
    if (this.debug) console.log(`      ${green('discount')}: ${action.discount} = ${green(discountExpressionResult)}`);
    bindings.discounts.push({
      promotionId,
      type: 'orderDiscount',
      centAmount: -(discountExpressionResult * 100).toFixed(0) / 100
    });
  }

  async tagAsUsed(facts: any, bindings: any, promotionId: any, action: any) {
    if (this.debug) console.log(yellow('    ACTION: tagging as used'));
    for await (const product of action.products) {
      const productIdExpressionResult = await this.expressions.evaluate(product.productId, facts, bindings);
      const productIndex = facts.products.findIndex((p: any) => p.id === productIdExpressionResult);
      if (productIndex != -1) {
        const quantityExpressionResult = await this.expressions.evaluate(product.quantity, facts, bindings);
        if (this.debug)
          console.log(
            `      ${green('productId')}: ${product.productId} = ${green(productIdExpressionResult)} | ${green(
              'quantity'
            )}: ${product.quantity} = ${green(quantityExpressionResult)} | ${
              facts.products[productIndex].quantity
            } => ${facts.products[productIndex].quantity - quantityExpressionResult}`
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

  public Actions = {
    createLineDiscount: this.createLineDiscount,
    createOrderDiscount: this.createOrderDiscount,
    tagAsUsed: this.tagAsUsed
  };
}

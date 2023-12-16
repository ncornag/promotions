import { Ok, Err, Result } from 'ts-results';
import { AppError, ErrorCode } from '../appError';
import { PromotionService, IPromotionService } from '@core/services/promotion.svc';
import { Promotion, Then, When } from '@core/entities/promotion';
import { green, magenta, yellow, gray, reset } from 'kolorist';
import { EngineActions } from './actions';
import { Expressions } from './expressions';

export class PromotionsEngine {
  private debug = false;
  private server: any;
  private promotionsService: IPromotionService;
  private Actions: EngineActions;
  private expressions: Expressions;
  // private promotions: Promotion[];

  constructor(server: any) {
    this.server = server;
    this.expressions = new Expressions(this.server);
    this.Actions = new EngineActions(this.server, this.expressions, this.debug);
    this.promotionsService = PromotionService.getInstance(server);
    this.debug = server.config.DEBUG;
  }

  async evaluateWhen(when: When, facts: any, bindings: any) {
    // const start = process.hrtime.bigint();
    let result = true;
    for (const [key, value] of Object.entries(when)) {
      const expressionResult = await this.expressions.evaluate(value, facts, bindings);
      if (this.debug)
        if (expressionResult == undefined || (typeof expressionResult === 'boolean' && expressionResult !== true)) {
          console.log(
            gray(`    ${key}: ${value} = ${expressionResult?.sku ? expressionResult.sku : expressionResult}`)
          );
        } else {
          console.log(
            green(`    ${key}: ${reset(value)} = ${expressionResult?.sku ? expressionResult.sku : expressionResult}`)
          );
        }
      if (expressionResult == undefined || (typeof expressionResult === 'boolean' && expressionResult !== true)) {
        result = false;
        break;
      }
      bindings[key] = expressionResult;
    }
    // const end = process.hrtime.bigint();
    //if (this.debug) console.log(`${green('  evaluateWhen')} in ${magenta(Number(end - start))}ns`);
    return result;
  }

  async evaluateThen(promotionId: any, then: Then, facts: any, bindings: any) {
    for await (const action of then) {
      if (!this.Actions[action.action]) {
        throw new AppError(ErrorCode.BAD_REQUEST, `Action ${action.action} not found`);
      }
      // const start = process.hrtime.bigint();
      await this.Actions[action.action](facts, bindings, promotionId, action);
      // const end = process.hrtime.bigint();
      // if (this.debug) console.log(`${green('    evaluateThen')} in ${magenta(Number(end - start))}ns`);
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
      if (this.debug) console.log(magenta(promotion.name));
      let rulesResult = false;
      let executions = 0;
      let maxExecutions = promotion.times || securityStopExecutionTimes;
      do {
        if (this.debug) console.log(yellow(`  Pass ${executions + 1}/${promotion.times ? promotion.times : '∞'}`));
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

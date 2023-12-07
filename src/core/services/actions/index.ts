import { ChangeNameActionHandler } from './changeName.handler';
import { Result } from 'ts-results';
import { AppError } from '@core/lib/appError';

export interface ActionHandlerDAO {
  [key: string]: any;
}
export interface ActionData {}
export interface ActionHandlerRepository {}

export interface ActionHandler {
  run(
    entity: ActionHandlerDAO,
    toUpdateEntity: ActionHandlerDAO,
    action: ActionData,
    classificationCategoryRepository: ActionHandlerRepository
  ): Promise<Result<ActionHandlerResult, AppError>>;
}

export interface ActionHandlersList {
  [key: string]: ActionHandler;
}

export const actionHandlersList = (server: any): ActionHandlersList => ({
  changeName: new ChangeNameActionHandler(server)
});

export type ActionHandlerResult = { update: any; sideEffects?: any[] };

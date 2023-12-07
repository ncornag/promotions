import { Ok, Result } from 'ts-results';
import { AppError } from '@core/lib/appError';
import { UpdateClassificationCategoryChangeName } from '@core/entities/classificationCategory';
import { ActionHandlerResult } from '@core/services/actions';

interface DAOwithName {
  [key: string]: any;
  key: string;
}

export class ChangeNameActionHandler<Repository> {
  private server: any;
  constructor(server: any) {
    this.server = server;
  }
  async run(
    entity: DAOwithName,
    toUpdateEntity: DAOwithName,
    action: UpdateClassificationCategoryChangeName,
    classificationCategoryRepository: Repository
  ): Promise<Result<ActionHandlerResult, AppError>> {
    if (entity.name === action.name) return new Ok({ update: {} });
    toUpdateEntity.name = action.name;
    return new Ok({ update: { $set: { name: action.name } } });
  }
}

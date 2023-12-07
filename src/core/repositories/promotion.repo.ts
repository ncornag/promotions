import { Result } from 'ts-results';
import { AppError } from '@core/lib/appError';
import { Promotion } from '@core/entities/promotion';
import { PromotionDAO } from '@infrastructure/repositories/dao/promotion.dao.schema';

export interface IPromotionRepository {
  create: (category: Promotion) => Promise<Result<PromotionDAO, AppError>>;
  save: (category: Promotion) => Promise<Result<PromotionDAO, AppError>>;
  updateOne: (id: string, categoryVersion: number, update: any) => Promise<Result<any, AppError>>;
  update: (filter: any, update: any) => Promise<Result<any, AppError>>;
  findOne: (id: string, version?: number) => Promise<Result<PromotionDAO, AppError>>;
  find: (query: any, options?: any) => Promise<Result<PromotionDAO[], AppError>>;
  aggregate: (pipeline: any[], options?: any) => Promise<Result<any[], AppError>>;
}

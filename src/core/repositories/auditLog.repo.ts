import { Result } from 'ts-results';
import { AppError } from '@core/lib/appError';
import { AuditLog } from '@core/entities/auditLog';
import { AuditLogDAO } from '@infrastructure/repositories/dao/auditLog.dao.schema';

export interface IAuditLogRepository {
  create: (category: AuditLog) => Promise<Result<AuditLogDAO, AppError>>;
  findOne: (id: string, version?: number) => Promise<Result<AuditLogDAO, AppError>>;
  find: (query: any, options?: any) => Promise<Result<AuditLogDAO[], AppError>>;
}

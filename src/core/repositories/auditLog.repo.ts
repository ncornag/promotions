import tsresult, { type Result } from 'ts-results';
const { Ok, Err } = tsresult;
import { AppError } from '#core/lib/appError';
import { type AuditLog } from '#core/entities/auditLog';
import { type AuditLogDAO } from '#infrastructure/repositories/dao/auditLog.dao.schema';

export interface IAuditLogRepository {
  create: (category: AuditLog) => Promise<Result<AuditLogDAO, AppError>>;
  findOne: (id: string, version?: number) => Promise<Result<AuditLogDAO, AppError>>;
  find: (query: any, options?: any) => Promise<Result<AuditLogDAO[], AppError>>;
}

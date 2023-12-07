import { Db, Collection } from '@fastify/mongodb/node_modules/mongodb/mongodb';
import { Ok, Err, Result } from 'ts-results';
import { ErrorCode, AppError } from '@core/lib/appError';
import { type IAuditLogRepository } from '@core/repositories/auditLog.repo';
import { AuditLog } from '@core/entities/auditLog';
import { AuditLogDAO } from '@infrastructure/repositories/dao/auditLog.dao.schema';
import { ITreeRepo } from '@core/lib/tree';

export const getAuditLogCollection = (db: Db): Collection<AuditLogDAO> => {
  return db.collection<AuditLogDAO>('AuditLog');
};

// TODO: Use a different collection per ProjectId
export class AuditLogRepository implements IAuditLogRepository, ITreeRepo<AuditLogDAO> {
  private col: Collection<AuditLogDAO>;

  constructor(server: any) {
    this.col = server.db.col.auditLog;
  }

  // CREATE AUDITLOG
  async create(auditLog: AuditLog): Promise<Result<AuditLogDAO, AppError>> {
    const { id: _id, ...data } = auditLog;
    const auditLogDAO = { _id, ...data };
    const result = await this.col.insertOne(auditLogDAO);
    return new Ok(auditLogDAO);
  }

  // FIND ONE AUDITLOG
  async findOne(id: string, version?: number): Promise<Result<AuditLogDAO, AppError>> {
    const filter: any = { _id: id };
    if (version !== undefined) filter.version = version;
    const entity = await this.col.findOne(filter);
    if (!entity) {
      return new Err(new AppError(ErrorCode.BAD_REQUEST, `Can't find auditLog with id [${id}]`));
    }
    return new Ok(entity);
  }

  // FIND MANY AUDITLOGS
  async find(query: any, options: any): Promise<Result<AuditLogDAO[], AppError>> {
    const entities = await this.col.find(query, options).toArray();
    return new Ok(entities);
  }
}

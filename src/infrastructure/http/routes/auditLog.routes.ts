import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import tsresult, { type Result } from 'ts-results';
const { Ok, Err } = tsresult;
import { AppError } from '#core/lib/appError';
import { AuditlogService } from '#core/services/auditLog.svc';
import { type FindAuditLogParms, type FindAuditLogsQueryString } from '#infrastructure/http/schemas/auditLog.schemas';
import { type AuditLog } from '#core/entities/auditLog';

export default async function (server: FastifyInstance, opts: FastifyPluginOptions) {
  let service = AuditlogService.getInstance(server);

  // GET ONE
  server.route({
    method: 'GET',
    url: '/:id',
    handler: async (request: FastifyRequest<{ Params: FindAuditLogParms }>, reply: FastifyReply) => {
      const result: Result<AuditLog, AppError> = await service.findAuditLogById(request.params.id);
      if (!result.ok) return reply.sendAppError(result.val);
      return reply.send(result.val);
    }
  });

  // FIND
  server.route({
    method: 'GET',
    url: '/',
    handler: async (request: FastifyRequest<{ Querystring: FindAuditLogsQueryString }>, reply: FastifyReply) => {
      const result: Result<AuditLog[], AppError> = await service.findAuditLogs(request.query.catalogId);
      if (!result.ok) return reply.sendAppError(result.val);
      return reply.send(result.val);
    }
  });
};

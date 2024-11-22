import tsresult, { type Result } from 'ts-results';
const { Ok, Err } = tsresult;
import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '#core/lib/appError';
import { PromotionService } from '#core/services/promotion.svc';
import {
  postPromotionSchema,
  updatePromotionSchema,
  type CreatePromotionBody,
  type FindPromotionParms,
  type UpdatePromotionBody,
  type CalculatePromotionQueryString
} from '#infrastructure/http/schemas/promotion.schemas';
import { type Promotion } from '#core/entities/promotion';

export default async function (server: FastifyInstance, opts: FastifyPluginOptions) {
  let service = PromotionService.getInstance(server);

  // CREATE
  server.route({
    method: 'POST',
    url: '/',
    schema: postPromotionSchema,
    handler: async (request: FastifyRequest<{ Body: CreatePromotionBody }>, reply: FastifyReply) => {
      const result: Result<Promotion, AppError> = await service.createPromotion(request.body);

      if (!result.ok) return reply.sendAppError(result.val);
      return reply.code(201).send(result.val);
    }
  });

  // UPDATE
  server.route({
    method: 'PATCH',
    url: '/:id',
    schema: updatePromotionSchema,
    handler: async (
      request: FastifyRequest<{ Params: FindPromotionParms; Body: UpdatePromotionBody }>,
      reply: FastifyReply
    ) => {
      const result: Result<Promotion, AppError> = await service.updatePromotion(
        request.params.id,
        request.body.version,
        request.body.actions
      );

      if (!result.ok) return reply.sendAppError(result.val);
      return reply.send(result.val);
    }
  });

  // GET
  server.route({
    method: 'GET',
    url: '/:id',
    handler: async (request: FastifyRequest<{ Params: FindPromotionParms }>, reply: FastifyReply) => {
      const result: Result<Promotion, AppError> = await service.findPromotionById(request.params.id);
      if (!result.ok) return reply.sendAppError(result.val);
      return reply.send(result.val);
    }
  });

  // CALCULATE PROMOTIONS
  server.route({
    method: 'POST',
    url: '/calculate',
    handler: async (request: FastifyRequest<{ Querystring: CalculatePromotionQueryString }>, reply: FastifyReply) => {
      const result: Result<Promotion, AppError> = await service.calculate(
        request.query.cartId,
        request.body,
        request.query.promotionId
      );
      if (!result.ok) return reply.sendAppError(result.val);
      return reply.send(result.val);
    }
  });
};

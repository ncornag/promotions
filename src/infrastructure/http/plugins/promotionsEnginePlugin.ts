import fp from 'fastify-plugin';
import { FastifyPluginCallback } from 'fastify';
import { PromotionsEngine } from '@core/lib/promotionsEngine/engine';

declare module 'fastify' {
  export interface FastifyInstance {
    promotionsEngine: PromotionsEngine;
  }
}

const promotionsEnginePlugin: FastifyPluginCallback = (fastify, options, done) => {
  fastify.decorate('promotionsEngine', new PromotionsEngine(fastify));
  done();
};

export default fp(promotionsEnginePlugin, { name: 'promotionsEnginePlugin' });

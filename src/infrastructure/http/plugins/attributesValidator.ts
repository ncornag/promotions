import fp from 'fastify-plugin';
import { FastifyPluginCallback } from 'fastify';
import { Validator } from '@core/lib/validator';

declare module 'fastify' {
  export interface FastifyInstance {
    validator: Validator;
  }
}

const attributesValidator: FastifyPluginCallback = (fastify, options, done) => {
  fastify.decorate('validator', new Validator(fastify));
  done();
};

export default fp(attributesValidator, { name: 'attributesValidator' });

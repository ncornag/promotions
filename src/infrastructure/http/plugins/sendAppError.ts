import fp from 'fastify-plugin';
import { type FastifyPluginCallback } from 'fastify';
import { AppError } from '#core/lib/appError';

declare module 'fastify' {
  interface FastifyReply {
    sendAppError: Function;
  }
}

const sendAppError: FastifyPluginCallback = (fastify, options, done) => {
  fastify.decorateReply('sendAppError', function (error: AppError) {
    let data = { statusCode: error.statusCode, message: error.message } as any;
    if (error.errors[0]) data.errors = error.errors;
    this.status(error.statusCode).send(data);
  });
  done();
};

export default fp(sendAppError, { name: 'sendAppError' });

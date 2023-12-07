import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict', 5);

import { requestContext } from '@fastify/request-context';
import type {
  FastifyReply,
  FastifyRequest,
  FastifyInstance,
  HookHandlerDoneFunction,
  FastifyServerOptions,
  FastifyBaseLogger
} from 'fastify';
import fp from 'fastify-plugin';

export const PROJECT_ID_STORE_KEY = 'projectId';
export const REQUEST_ID_STORE_KEY = 'reqId';

declare module '@fastify/request-context' {
  interface RequestContextData {
    [REQUEST_ID_STORE_KEY]: string;
    [PROJECT_ID_STORE_KEY]: string;
  }
}

export function getRequestIdFastifyAppConfig(): Pick<FastifyServerOptions, 'genReqId' | 'requestIdHeader'> {
  return {
    genReqId: () => nanoid(5),
    requestIdHeader: 'x-request-id'
  };
}

function plugin(fastify: FastifyInstance, opts: { projectId: string }, done: () => void) {
  fastify.addHook('onRequest', (req: FastifyRequest, res: FastifyReply, next: HookHandlerDoneFunction) => {
    requestContext.set(REQUEST_ID_STORE_KEY, req.id);
    requestContext.set(PROJECT_ID_STORE_KEY, opts.projectId);
    next();
  });

  fastify.addHook('onSend', (req: FastifyRequest, res: FastifyReply, payload, next: HookHandlerDoneFunction) => {
    void res.header('x-request-id', req.id);
    next();
  });

  done();
}

export const requestContextProvider = fp(plugin, {
  fastify: '4.x',
  name: 'request-context-provider-plugin'
});

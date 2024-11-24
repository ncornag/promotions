import fp from 'fastify-plugin';
import { type PublishOptions, JSONCodec, connect } from 'nats';
import { type FastifyInstance } from 'fastify';
import { requestContext } from '@fastify/request-context';
import { REQUEST_ID_STORE_KEY, PROJECT_ID_STORE_KEY } from '#infrastructure/http/plugins/requestContext';
import { green, red, yellow, magenta, bold } from 'kolorist';
import pino from 'pino';

declare module 'fastify' {
  export interface FastifyInstance {
    messages: {
      publish: Function;
      subscribe: Function;
    };
  }
}

export default fp(async function (server: FastifyInstance) {
  const options: any = {
    connection_name: 'catalog',
    drainOnClose: true
  };
  const msgOut = bold(yellow('→')) + yellow('MSG:');
  const { NATS_URL: nats_url } = server.config;
  const logger = server.log.child({}, { level: server.config.LOG_LEVEL_NATS ?? server.config.LOG_LEVEL }) as pino.Logger
  const connectParams = { name: options.connection_name, servers: nats_url }

  try {
    const nc = await connect(connectParams);
    server.addHook('onClose', async (instance) => {
      if (options.drainOnClose === true) {
        await nc.drain();
      } else {
        await nc.flush();
        await nc.close();
      }
    });
    server.decorate('messages', {
      subscribe: (subject: string, handler: Function) => {
        nc.subscribe(subject, {
          callback: (err, msg) => {
            if (err) {
              server.log.error(err);
              return;
            }
            const data = JSONCodec().decode(msg.data);
            handler(data);
          }
        });
      },
      publish: (subject: string, payload: any, options?: PublishOptions) => {
        const metadata = payload.metadata || {};
        metadata.projectId = metadata.projectId || requestContext.get(PROJECT_ID_STORE_KEY);
        metadata.requestId = metadata.requestId || requestContext.get(REQUEST_ID_STORE_KEY);
        if (logger.isLevelEnabled('debug'))
          logger.debug(
            `${magenta('#' + metadata.requestId || '')} ${msgOut} ${green('publishing to')} [${subject}] ${green(JSON.stringify(payload))}`
          );
        nc.publish(subject, JSONCodec().encode(payload), options);
      }
    });
    server.log.info(`${yellow('Nats')} ${green('starting in')} [${nats_url}]`);
  } catch (err) {
    server.log.warn(`${yellow('Nats')} error connecting to ${JSON.stringify(connectParams)}`);
    server.decorate('messages', {
      subscribe: (subject: string, handler: Function) => {
      },
      publish: (subject: string, payload: any, options?: PublishOptions) => {
      }
    })
  }

});

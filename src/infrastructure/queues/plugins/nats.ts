import fp from 'fastify-plugin';
import { PublishOptions, JSONCodec, connect } from 'nats';
import { FastifyInstance } from 'fastify';
import { requestContext } from '@fastify/request-context';
import { REQUEST_ID_STORE_KEY, PROJECT_ID_STORE_KEY } from '@infrastructure/http/plugins/requestContext';
import { green, yellow } from 'kolorist';

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
  const { NATS_URL: nats_url } = server.config;
  const nc = await connect({ name: options.connection_name, servers: nats_url });
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
      nc.publish(subject, JSONCodec().encode(payload), options);
    }
  });

  server.log.info(`${yellow('Nats')} ${green('starting in')} [${nats_url}]`);
});

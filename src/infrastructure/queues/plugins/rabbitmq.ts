import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import RabbitMQProducer from '@rabbitmq-ts/fastify-producer';
import RabbitMQConsumer from '@rabbitmq-ts/fastify-consumer';
import { TSubscribeFunc } from '@rabbitmq-ts/fastify-consumer/lib/interface';
import { TPublishFunc } from '@rabbitmq-ts/fastify-producer/lib/interface';
import type { TPublish } from '@rabbitmq-ts/core';
import { requestContext } from '@fastify/request-context';
import { REQUEST_ID_STORE_KEY, PROJECT_ID_STORE_KEY } from '@infrastructure/http/plugins/requestContext';

declare module 'fastify' {
  export interface FastifyInstance {
    messages: {
      subscribe: TSubscribeFunc;
      publish: TPublishFunc;
    };
  }
}

export default fp(async function (server: FastifyInstance) {
  const {
    EXCHANGE: rmq_exchange,
    RABBITMQ_HOST: rmq_host,
    RABBITMQ_PORT: rmq_port,
    RABBITMQ_USERNAME: rmq_user,
    RABBITMQ_PASSWORD: rmq_pass,
    RABBITMQ_VIRTUAL_HOST: rmq_vh
  } = server.config;
  await server.register(RabbitMQProducer, {
    urls: {
      host: rmq_host,
      port: rmq_port,
      username: rmq_user,
      password: rmq_pass,
      virtualHost: rmq_vh
    },
    configurations: {
      exchanges: [
        {
          exchange: rmq_exchange,
          type: 'topic',
          options: {
            durable: false
          }
        }
      ]
    }
  } as any);
  await server.register(RabbitMQConsumer, {
    urls: [
      {
        host: rmq_host,
        port: rmq_port,
        username: rmq_user,
        password: rmq_pass,
        virtualHost: rmq_vh
      }
    ]
  } as any);
  server.decorate('messages', {
    subscribe: server.rabbitMQConsumer.subscribe.bind(server.rabbitMQConsumer),
    publish: (
      exchange: string,
      routingKey: string,
      content: Buffer | string | unknown,
      options?: TPublish
    ): Promise<boolean> => {
      const metadata = (content as any).metadata || {};
      metadata.projectId = metadata.projectId || requestContext.get(PROJECT_ID_STORE_KEY);
      metadata.requestId = metadata.requestId || requestContext.get(REQUEST_ID_STORE_KEY);
      return server.rabbitMQProducer.publish(exchange, routingKey, content, options);
    }
  });

  server.log.info(`Connected to RabbitMQ at [${rmq_host}:${rmq_port}]`);
});

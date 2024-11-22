import fp from 'fastify-plugin';
import { type FastifyPluginAsync } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';
import { Ajv } from 'ajv';

const NodeEnv: Record<string, string> = {
  development: 'development',
  test: 'test',
  production: 'production'
}

const ConfigSchema = Type.Strict(
  Type.Object({
    NODE_ENV: Type.Enum(NodeEnv),
    LOG_LEVEL: Type.String(),
    LOG_LEVEL_DB: Type.Optional(Type.String()),
    LOG_LEVEL_NATS: Type.Optional(Type.String()),
    LOG_LEVEL_AUDITLOG: Type.Optional(Type.String()),
    API_HOST: Type.String(),
    API_PORT: Type.Number(),
    MONGO_URL: Type.String(),
    PROJECTID: Type.Optional(Type.String()),
    NATS_URL: Type.Optional(Type.String()),
    CACHE_JSON_SCHEMAS: Type.Boolean({ default: true }),
    TYPESENSE_HOST: Type.Optional(Type.String()),
    TYPESENSE_PORT: Type.Optional(Type.String()),
    TYPESENSE_API_KEY: Type.Optional(Type.String()),
    CATALOGS_TO_INDEX: Type.Optional(Type.String()),
    CT_SCOPE: Type.Optional(Type.String()),
    CT_AUTHHOST: Type.Optional(Type.String()),
    CT_HTTPHOST: Type.Optional(Type.String()),
    CT_PROJECTKEY: Type.Optional(Type.String()),
    CT_CLIENTID: Type.Optional(Type.String()),
    CT_CLIENTSECRET: Type.Optional(Type.String())
  })
);

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true,
  allowUnionTypes: true
});

export type Config = Static<typeof ConfigSchema>;

const configPlugin: FastifyPluginAsync = async (server) => {
  const validate = ajv.compile(ConfigSchema);
  const valid = validate(process.env);
  if (!valid) {
    throw new Error('.env file validation failed - ' + JSON.stringify(validate.errors, null, 2));
  }
  server.decorate('config', process.env as any);
};

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}

export default fp(configPlugin);

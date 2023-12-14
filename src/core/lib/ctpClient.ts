import fetch from 'node-fetch';

import {
  ClientBuilder,
  // Import middlewares
  type AuthMiddlewareOptions, // Required for auth
  type HttpMiddlewareOptions // Required for sending HTTP requests
} from '@commercetools/sdk-client-v2';

export const ctpClient = (server: any) => {
  const {
    CT_REGION: region,
    CT_PROJECTKEY: projectKey,
    CT_SCOPE: [scopes],
    CT_CLIENTID: clientId,
    CT_CLIENTSECRET: clientSecret
  } = server.config;

  // Configure authMiddlewareOptions
  const authMiddlewareOptions: AuthMiddlewareOptions = {
    host: `https://auth.${region}.commercetools.com`,
    projectKey,
    credentials: {
      clientId,
      clientSecret
    },
    scopes,
    fetch
  };

  // Configure httpMiddlewareOptions
  const httpMiddlewareOptions: HttpMiddlewareOptions = {
    host: `https://api.${region}.commercetools.com`,
    fetch
  };

  // Return the ClientBuilder
  return (
    new ClientBuilder()
      // .withProjectKey() is not required if the projectKey is included in authMiddlewareOptions
      // .withProjectKey(projectKey)
      .withClientCredentialsFlow(authMiddlewareOptions)
      .withHttpMiddleware(httpMiddlewareOptions)
      //.withLoggerMiddleware() // Include middleware for logging
      .build()
  );
};

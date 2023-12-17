import fetch from 'node-fetch';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

import {
  ClientBuilder,
  // Import middlewares
  type AuthMiddlewareOptions, // Required for auth
  type HttpMiddlewareOptions // Required for sending HTTP requests
} from '@commercetools/sdk-client-v2';
import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';

export class CT {
  private server: any;
  public api: ByProjectKeyRequestBuilder;

  public constructor(server: any) {
    this.server = server;
    this.api = this.apiBuilder();
  }

  private apiBuilder = (): ByProjectKeyRequestBuilder => {
    const {
      CT_AUTHHOST: authHost,
      CT_HTTPHOST: httpHost,
      CT_PROJECTKEY: projectKey,
      CT_SCOPE: [scopes],
      CT_CLIENTID: clientId,
      CT_CLIENTSECRET: clientSecret
    } = this.server.config;

    // Configure authMiddlewareOptions
    const authMiddlewareOptions: AuthMiddlewareOptions = {
      host: `https://${authHost}`,
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
      host: `https://${httpHost}`,
      fetch
    };

    // Return the ClientBuilder
    const ctpClient = new ClientBuilder()
      //.withProjectKey(projectKey)
      .withClientCredentialsFlow(authMiddlewareOptions)
      .withHttpMiddleware(httpMiddlewareOptions)
      .build();

    return createApiBuilderFromCtpClient(ctpClient).withProjectKey({ projectKey });
  };
}

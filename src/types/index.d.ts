import { ApolloClient } from '@apollo/client/core';

declare global {
  namespace Express {
    interface Request {
      apolloClient: ApolloClient<any>;
    }
  }
}

export {};
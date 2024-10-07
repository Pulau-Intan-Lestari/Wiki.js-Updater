import { ApolloClient } from '@apollo/client/core';
import { PrismaClient } from '@prisma/client';
import { PrismaClient as PCPIL } from "../../dist/prismapil";

declare global {
  namespace Express {
    interface Request {
      apolloClient: ApolloClient<any>;
      prisma: PrismaClient;
      prismapil: PCPIL;
    }
  }
}

export { };
/// <reference types="./node_modules/.prisma/client/index" />

declare module "@prisma/client" {
  export { PrismaClient } from ".prisma/client/default";
  export * from ".prisma/client/default";
}


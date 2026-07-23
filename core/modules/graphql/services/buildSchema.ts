import { makeExecutableSchema } from '@graphql-tools/schema';
import type { GraphQLSchema } from 'graphql';

import { buildResolvers } from './buildResolvers.js';
import { buildTypeDefs } from './buildTypes.js';

const resolvers = await buildResolvers(true);

const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs: buildTypeDefs(true),
  resolvers
});

export async function rebuildSchema(): Promise<GraphQLSchema> {
  const resolvers = await buildResolvers(true);

  const schema = makeExecutableSchema({
    typeDefs: buildTypeDefs(true),
    resolvers
  });

  return schema;
}

export default schema;
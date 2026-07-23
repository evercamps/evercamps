import { makeExecutableSchema } from '@graphql-tools/schema';
import type { GraphQLSchema } from 'graphql';

import { buildResolvers } from './buildResolvers.js';
import { buildTypeDefs } from './buildTypes.js';

const resolvers = await buildResolvers(false);

const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs: buildTypeDefs(),
  resolvers
});

export async function rebuildStoreFrontSchema(): Promise<GraphQLSchema> {
  const resolvers = await buildResolvers(false);

  const schema = makeExecutableSchema({
    typeDefs: buildTypeDefs(),
    resolvers
  });

  return schema;
}

export default schema;
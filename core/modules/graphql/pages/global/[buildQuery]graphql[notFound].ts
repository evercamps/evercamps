import {
  execute,
  NoUnusedFragmentsRule,
  parse,
  specifiedRules,
  validate,
  type GraphQLSchema
} from 'graphql';
import type { Response, NextFunction } from 'express';

import { debug } from '../../../../lib/log/logger.js';
import { isDevelopmentMode } from '../../../../lib/util/isDevelopmentMode.js';
import adminSchema, { rebuildSchema } from '../../services/buildSchema.js';
import storeFrontSchema, {
  rebuildStoreFrontSchema
} from '../../services/buildStoreFrontSchema.js';
import { getContext } from '../../services/contextHelper.js';
import { graphqlErrorMessageFormat } from '../../services/graphqlErrorMessageFormat.js';
import type { EvercampsRequest } from '../../../../types/request.js';

export default async function graphql(
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
) {
  const { currentRoute } = request;

  let schema: GraphQLSchema;

  if (isDevelopmentMode()) {
    schema =
      currentRoute && currentRoute.isAdmin
        ? await rebuildSchema()
        : await rebuildStoreFrontSchema();
  } else {
    schema =
      currentRoute && currentRoute.isAdmin ? adminSchema : storeFrontSchema;
  }

  try {
    const { body } = request;
    const { graphqlQuery, graphqlVariables, propsMap } = body;

    if (!graphqlQuery) {
      next();
      return;
    }

    const query = graphqlQuery.replace(/(\r\n|\n|\r|\s)/gm, '');

    if (query === 'queryQuery{}') {
      next();
      return;
    }

    const document = parse(graphqlQuery);

    const validationErrors = validate(
      schema,
      document,
      specifiedRules.filter((rule) => rule !== NoUnusedFragmentsRule)
    );

    if (validationErrors.length > 0) {
      const formattedErrorMessage = graphqlErrorMessageFormat(
        graphqlQuery,
        validationErrors[0].locations?.[0]?.line ?? 0,
        validationErrors[0].locations?.[0]?.column ?? 0
      );

      debug(`GraphQL validation error: ${formattedErrorMessage}`);
      next(validationErrors[0]);
      return;
    }

    const context = getContext(request);

    context.user = request.locals?.user;
    context.customer = request.locals?.customer;

    const data = await execute({
      schema,
      contextValue: context,
      document,
      variableValues: graphqlVariables
    });

    if (data.errors) {
      next(data.errors[0]);
      return;
    }

    response.locals = response.locals || {};

    response.locals.graphqlResponse = JSON.parse(
      JSON.stringify(data.data)
    );

    response.locals.propsMap = propsMap;

    next();
  } catch (error) {
    next(error);
  }
}
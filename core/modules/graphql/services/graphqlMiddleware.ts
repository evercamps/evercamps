import { execute, parse, validateSchema } from 'graphql';
import type { GraphQLSchema } from 'graphql';
import type { Response, NextFunction } from 'express';

import { OK } from '../../../lib/util/httpStatus.js';
import { getContext } from './contextHelper.js';
import { EvercampsRequest } from '../../../types/request.js';

export const graphqlMiddleware = (schema: GraphQLSchema) =>
  async function graphqlMiddleware(
    request: EvercampsRequest,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    const { body } = request;
    const { query, variables } = body;

    try {
      if (!query) {
        response.status(OK).json({
          data: {}
        });
        return;
      }

      const document = parse(query);

      const validationErrors = validateSchema(schema);

      if (validationErrors.length > 0) {
        next(new Error(validationErrors[0].message));
      } else {
        const data = await execute({
          schema,
          contextValue: getContext(request),
          document,
          variableValues: variables
        });

        if (data.errors) {
          next(data.errors[0]);
        } else {
          response.status(OK).json({
            data: data.data
          });
        }
      }
    } catch (error) {
      next(error);
    }
  };
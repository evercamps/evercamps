import path from 'path';
import url from 'url';
import { loadFiles } from '@graphql-tools/load-files';
import { mergeResolvers } from '@graphql-tools/merge';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../../lib/helpers.js';
import { isDevelopmentMode } from '../../../lib/util/isDevelopmentMode.js';

export async function buildResolvers(isAdmin = false) {
  const typeSources: string[] = [
    path.join(
      CONSTANTS.ROOTPATH,
      'dist',
      'modules',
      '*/graphql/types/**/*.resolvers.js'
    )
  ];

  const extensions = getEnabledExtensions();

  extensions.forEach((extension) => {
    typeSources.push(
      path.join(extension.path, 'graphql/types/**/*.resolvers.{js,ts}')
    );
  });

  const resolvers = mergeResolvers(
    await loadFiles(typeSources, {
      ignoredExtensions: isAdmin
        ? ['.ts', '.d.ts']
        : ['.admin.resolvers.js', '.admin.resolvers.ts', '.ts', '.d.ts'],

      requireMethod: async (filePath: string) => {
        if (isDevelopmentMode()) {
          const module = await import(
            `${url.pathToFileURL(filePath).href}?t=${Date.now()}`
          );
          return module;
        } else {
          const module = await import(url.pathToFileURL(filePath).href);
          return module;
        }
      }
    })
  );

  return resolvers;
}
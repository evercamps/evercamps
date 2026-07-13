import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig } from './util/getConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootPath = path.resolve(__dirname, '..', '..');

export const CONSTANTS = Object.freeze({
  ROOTPATH: rootPath,
  LIBPATH: path.resolve(rootPath, 'includes', 'lib'),
  COREPATH: path.resolve(rootPath, 'core'),
  CONTENTPATH: path.resolve(rootPath, 'content'),
  THEMEPATH: path.resolve(rootPath, 'content', 'theme'),
  TRANSLATIONPATH: path.resolve(rootPath, 'content', 'translations'),
  PLUGINPATH: path.resolve(rootPath, 'content', 'plugin'),
  MEDIAPATH: path.resolve(rootPath, 'content', 'media'),
  PUBLICPATH: path.resolve(rootPath, 'public'),
  NODEMODULEPATH: path.resolve(rootPath, 'node_modules'),
  CACHEPATH: path.resolve(rootPath, 'evercamps'),
  BUILDPATH: path.resolve(rootPath, 'evercamps', 'build'),
  ADMIN_COLLECTION_SIZE: getConfig('admin_collection_size', 20)
});

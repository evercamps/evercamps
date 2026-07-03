import config from 'config';
import type { ConfigPathValue, ConfigPaths } from './config.js';

export function getConfig<P extends ConfigPaths>(
  path: P,
  defaultValue?: ConfigPathValue<P>
): ConfigPathValue<P> {
  return config.has(path) ? config.get(path) : (defaultValue as ConfigPathValue<P>);
}

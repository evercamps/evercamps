import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { error, debug } from '../../lib/log/logger.js';

async function loadModuleSubscribers(modulePath) {
  const subscribers = [];
  const subscribersDir = path.join(modulePath, 'subscribers');

  if (!fs.existsSync(subscribersDir)) {
    return subscribers;
  }

  const eventDirs = fs
    .readdirSync(subscribersDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  let files = [];
  for (const eventName of eventDirs) {
    const eventSubscribersDir = path.join(subscribersDir, eventName);

    // get only .js files
    files = files.concat(fs
      .readdirSync(eventSubscribersDir, { withFileTypes: true })
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.js'))
      .map((dirent) => { return { eventName, subscriberPath: path.join(eventSubscribersDir, dirent.name) } }));
  }

  debug(`files: ${JSON.stringify(files)}`);
  for (const file of files) {
    try {
      // if(file.subscriberPath.indexOf("localGenerateProductImageVariant") === -1) {
        debug(`adding event subscriber for event ${file.eventName}, path to file: ${pathToFileURL(file.subscriberPath)}`);
        const module = await import(pathToFileURL(file.subscriberPath));
        
        subscribers.push({
          event: file.eventName,
          subscriber: module.default
        });
    }
    catch (e) {
      debug(`Error adding event subscriber for event ${file.eventName}, path to file: ${pathToFileURL(file.subscriberPath)}, error: ${JSON.stringify(e)}`);
      error(e);
    }
  }
  debug(`All subscribers added without errors`);
  return subscribers;
}

export async function loadSubscribers(modules) {
  const subscribers = [];
  /** Loading subscriber  */
  await Promise.all(
    modules.map(async (module) => {
      try {
        // Load subscribers
        const subs = await loadModuleSubscribers(module.path);
        subscribers.push(...subs);
      } catch (e) {
        error(e);
        process.exit(0);
      }
    })
  );
  return subscribers;
}

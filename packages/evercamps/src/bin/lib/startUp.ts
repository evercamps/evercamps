import http from 'http';
import type { ChildProcess } from 'child_process';
import config from 'config';
import { error, debug } from '../../lib/log/logger.js';
import { lockHooks } from '../../lib/util/hookable.js';
import { lockRegistry } from '../../lib/util/registry.js';
import { validateConfiguration } from '../../lib/util/validateConfiguration.js';
import { getEnabledExtensions } from '../extension/index.js';
import { createApp } from './app.js';
import { type BootstrapContext, loadBootstrapScript } from './bootstrap/bootstrap.js';
import { migrate } from './bootstrap/migrate.js';
import { getCoreModules } from './loadModules.js';
import { normalizePort } from './normalizePort.js';
import { onError } from './onError.js';
import { onListening } from './onListening.js';
import { startCronProcess } from './startCronProcess.js';
import { startSubscriberProcess } from './startSubscriberProcess.js';

export const start = async function start(
  context: BootstrapContext,
  cb?: () => void
): Promise<void> {
  const app = await createApp();
  const server = http.createServer(app);
  const modules = [...getCoreModules(), ...getEnabledExtensions()];

  try {
    for (const module of modules) {
      await loadBootstrapScript(module, context);
    }
    lockHooks();
    lockRegistry();
    validateConfiguration(config);
  } catch (e) {
    error(e);
    process.exit(0);
  }
  process.env.ALLOW_CONFIG_MUTATIONS = 'false';

  try {
    await migrate(modules);
  } catch (e) {
    error(e);
    process.exit(0);
  }

  const port = normalizePort();
  app.set('port', port);

  server.on('listening', () => {
    onListening();
    if (cb) {
      cb();
    }
  });
  server.on('error', onError);
  server.listen(port);

  debug('Starting subscriber process');
  let subscriberChild: ChildProcess = startSubscriberProcess(context);
  let jobChild: ChildProcess = startCronProcess(context);

  process.on('exit', (code) => {
    if (subscriberChild?.pid) {
      subscriberChild.kill('SIGTERM');
    }
    if (jobChild?.pid) {
      jobChild.kill('SIGTERM');
    }
    if (code === 100) {
      debug('Restarting the server');
      process.send?.('RESTART_ME');
    }
  });

  process.on('RESTART_CRONJOB', () => {
    debug('Restarting the cron job process');
    jobChild.kill('SIGTERM');
    jobChild = startCronProcess(context);
  });

  process.on('RESTART_SUBSCRIBER', () => {
    debug('Restarting the subscriber process');
    subscriberChild.kill('SIGTERM');
    subscriberChild = startSubscriberProcess(context);
  });
};

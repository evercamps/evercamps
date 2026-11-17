import path from 'path';
import { fileURLToPath } from 'url';
import { registerJob } from '../../lib/cronjob/jobManager.js';
import { warning } from '../../lib/log/logger.js';
import { getConfig } from '../../lib/util/getConfig.js';
import { isDevelopmentMode } from '../../lib/util/isDevelopmentMode.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';
import { smtpTransport } from './services/smtpTransport.js';
import { registerEmailTemplate } from './services/templates.js';
import { registerEmailTransport } from './services/transports.js';
import { coreEmailTemplates } from './templates/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async (context: { process?: string } = {}) => {
  registerEmailTransport(smtpTransport);
  coreEmailTemplates.forEach((template) => registerEmailTemplate(template));

  addProcessor('configurationSchema', (schema: Record<string, any>) => {
    merge(schema, {
      properties: {
        system: {
          type: 'object',
          properties: {
            email: {
              type: 'object',
              properties: {
                smtp: {
                  type: 'object',
                  properties: {
                    host: { type: 'string' },
                    port: { type: ['number', 'string'] },
                    security: { type: 'string', enum: ['none', 'starttls', 'ssl'] },
                    username: { type: 'string' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    });
    return schema;
  });

  registerJob({
    name: 'purgeEmailLog',
    schedule: '15 3 * * *',
    resolve: path.resolve(__dirname, 'jobs', 'purgeEmailLog.js'),
    enabled: true
  });
  registerJob({
    name: 'retryFailedEmails',
    schedule: '*/15 * * * *',
    resolve: path.resolve(__dirname, 'jobs', 'retryFailedEmails.js'),
    enabled: true
  });

  if (context.process === 'main' && !isDevelopmentMode() && !getConfig('shop.homeUrl', '')) {
    warning('shop.homeUrl is not set: links in emails will point to localhost');
  }
};

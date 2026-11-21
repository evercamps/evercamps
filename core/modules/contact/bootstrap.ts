import path from 'path';
import { fileURLToPath } from 'url';
import { registerJob } from '../../lib/cronjob/jobManager.js';
import { registerWidget } from '../../lib/widget/widgetManager.js';
import { registerEmailTemplate } from '../email/services/templates.js';
import contactMessage from './templates/contactMessage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async () => {
  registerEmailTemplate(contactMessage);

  registerWidget({
    type: 'contact_form',
    settingComponent: path.resolve(__dirname, 'components', 'ContactFormSetting.js'),
    component: path.resolve(__dirname, 'components', 'ContactForm.js'),
    name: 'Contact form',
    description: 'A contact form; messages are emailed to the store and listed in the admin',
    defaultSettings: {
      className: 'page-width'
    },
    enabled: true
  });

  registerJob({
    name: 'purgeContactMessages',
    schedule: '30 3 * * *',
    resolve: path.resolve(__dirname, 'jobs', 'purgeContactMessages.js'),
    enabled: true
  });
};

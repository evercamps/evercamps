import { defineEmailTemplate } from '../services/templateContent.js';

export default defineEmailTemplate({
  code: 'email_test',
  name: 'Test email',
  variables: ['store.name', 'transport'],
  sampleData: { transport: 'SMTP' },
  nl: {
    subject: 'Testmail van {{ store.name }}',
    body: `<p>Dit is een testmail van {{ store.name }}.</p>
<p>Verzonden via: {{ transport }}. Als je dit leest, werkt het versturen van e-mails.</p>`
  },
  fr: {
    subject: 'E-mail de test de {{ store.name }}',
    body: `<p>Ceci est un e-mail de test de {{ store.name }}.</p>
<p>Envoyé via : {{ transport }}. Si vous lisez ceci, l'envoi d'e-mails fonctionne.</p>`
  },
  en: {
    subject: 'Test email from {{ store.name }}',
    body: `<p>This is a test email from {{ store.name }}.</p>
<p>Sent with: {{ transport }}. If you can read this, sending emails works.</p>`
  }
});

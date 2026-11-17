import { defineEmailTemplate } from '../services/templateContent.js';

export default defineEmailTemplate({
  code: 'registration_confirmation',
  name: 'Registration confirmation (added by admin)',
  variables: [
    'store.name',
    'customer.name',
    'participant.name',
    'product.name',
    'variant.title',
    'period',
    'accountUrl'
  ],
  sampleData: {
    customer: { name: 'An Peeters' },
    participant: { name: 'Emma Peeters' },
    product: { name: 'Zomerkamp' },
    variant: { title: 'Week 1' },
    period: '6 juli 2026 – 10 juli 2026',
    accountUrl: 'https://example.com/account'
  },
  nl: {
    subject: 'Inschrijving van {{ participant.name }} voor {{ product.name }}',
    body: `<p>Dag {{ customer.name }},</p>
<p>We hebben {{ participant.name }} ingeschreven voor:</p>
<p><strong>{{ product.name }}</strong> {{ variant.title }}<br>{{ period }}</p>
<p>Je inschrijvingen bekijk je in <a href="{{ accountUrl }}">je account</a>.</p>
<p>Sportieve groeten,<br>{{ store.name }}</p>`
  },
  fr: {
    subject: 'Inscription de {{ participant.name }} pour {{ product.name }}',
    body: `<p>Bonjour {{ customer.name }},</p>
<p>Nous avons inscrit {{ participant.name }} pour :</p>
<p><strong>{{ product.name }}</strong> {{ variant.title }}<br>{{ period }}</p>
<p>Vous pouvez consulter vos inscriptions dans <a href="{{ accountUrl }}">votre compte</a>.</p>
<p>Sportivement,<br>{{ store.name }}</p>`
  },
  en: {
    subject: 'Registration of {{ participant.name }} for {{ product.name }}',
    body: `<p>Hi {{ customer.name }},</p>
<p>We registered {{ participant.name }} for:</p>
<p><strong>{{ product.name }}</strong> {{ variant.title }}<br>{{ period }}</p>
<p>You can view your registrations in <a href="{{ accountUrl }}">your account</a>.</p>
<p>Kind regards,<br>{{ store.name }}</p>`
  }
});

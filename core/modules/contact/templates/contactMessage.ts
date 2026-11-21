import { defineEmailTemplate } from '../../email/services/templateContent.js';

export default defineEmailTemplate({
  code: 'contact_message',
  name: 'Contact form message',
  variables: [
    'store.name',
    'contact.name',
    'contact.email',
    'contact.phone',
    'contact.message'
  ],
  sampleData: {
    contact: {
      name: 'An Peeters',
      email: 'an@example.com',
      phone: '+32 470 12 34 56',
      message: 'Is er nog plaats in het surfkamp van week 2?'
    }
  },
  nl: {
    subject: 'Nieuw bericht via het contactformulier van {{ contact.name }}',
    body: `<p>Er is een nieuw bericht binnengekomen via het contactformulier van {{ store.name }}.</p>
<p><strong>Naam:</strong> {{ contact.name }}<br>
<strong>E-mail:</strong> {{ contact.email }}<br>
<strong>Telefoon:</strong> {{ contact.phone }}</p>
<p style="white-space: pre-wrap">{{ contact.message }}</p>
<p>Antwoord op deze e-mail om {{ contact.name }} rechtstreeks te antwoorden.</p>`
  },
  fr: {
    subject: 'Nouveau message via le formulaire de contact de {{ contact.name }}',
    body: `<p>Un nouveau message est arrivé via le formulaire de contact de {{ store.name }}.</p>
<p><strong>Nom :</strong> {{ contact.name }}<br>
<strong>E-mail :</strong> {{ contact.email }}<br>
<strong>Téléphone :</strong> {{ contact.phone }}</p>
<p style="white-space: pre-wrap">{{ contact.message }}</p>
<p>Répondez à cet e-mail pour répondre directement à {{ contact.name }}.</p>`
  },
  en: {
    subject: 'New contact form message from {{ contact.name }}',
    body: `<p>A new message came in through the contact form of {{ store.name }}.</p>
<p><strong>Name:</strong> {{ contact.name }}<br>
<strong>Email:</strong> {{ contact.email }}<br>
<strong>Phone:</strong> {{ contact.phone }}</p>
<p style="white-space: pre-wrap">{{ contact.message }}</p>
<p>Reply to this email to answer {{ contact.name }} directly.</p>`
  }
});

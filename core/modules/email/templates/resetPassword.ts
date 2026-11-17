import { defineEmailTemplate } from '../services/templateContent.js';

export default defineEmailTemplate({
  code: 'reset_password',
  name: 'Reset password',
  variables: ['store.name', 'customer.name', 'resetUrl', 'expiresInHours'],
  sampleData: {
    customer: { name: 'An Peeters' },
    resetUrl: 'https://example.com/account/update-password?token=abc',
    expiresInHours: 48
  },
  nl: {
    subject: 'Stel je wachtwoord opnieuw in',
    body: `<p>Dag {{ customer.name }},</p>
<p>We kregen een aanvraag om het wachtwoord van je account bij {{ store.name }} opnieuw in te stellen.</p>
<p><a href="{{ resetUrl }}">Nieuw wachtwoord instellen</a></p>
<p>Deze link is {{ expiresInHours }} uur geldig. Heb je dit niet aangevraagd? Dan mag je deze e-mail negeren; je wachtwoord blijft ongewijzigd.</p>
<p>{{ store.name }}</p>`
  },
  fr: {
    subject: 'Réinitialisez votre mot de passe',
    body: `<p>Bonjour {{ customer.name }},</p>
<p>Nous avons reçu une demande de réinitialisation du mot de passe de votre compte chez {{ store.name }}.</p>
<p><a href="{{ resetUrl }}">Choisir un nouveau mot de passe</a></p>
<p>Ce lien est valable {{ expiresInHours }} heures. Vous n'avez rien demandé ? Ignorez cet e-mail ; votre mot de passe reste inchangé.</p>
<p>{{ store.name }}</p>`
  },
  en: {
    subject: 'Reset your password',
    body: `<p>Hi {{ customer.name }},</p>
<p>We received a request to reset the password of your account at {{ store.name }}.</p>
<p><a href="{{ resetUrl }}">Set a new password</a></p>
<p>This link is valid for {{ expiresInHours }} hours. Didn't ask for this? You can ignore this email; your password stays the same.</p>
<p>{{ store.name }}</p>`
  }
});

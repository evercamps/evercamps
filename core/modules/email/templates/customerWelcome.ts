import { defineEmailTemplate } from '../services/templateContent.js';

export default defineEmailTemplate({
  code: 'customer_welcome',
  name: 'Welcome (new account)',
  variables: ['store.name', 'customer.name', 'loginUrl'],
  sampleData: {
    customer: { name: 'An Peeters' },
    loginUrl: 'https://example.com/account/login'
  },
  nl: {
    subject: 'Welkom bij {{ store.name }}',
    body: `<p>Dag {{ customer.name }},</p>
<p>Je account bij {{ store.name }} is aangemaakt. Via je account schrijf je je kinderen sneller in en bekijk je je bestellingen.</p>
<p><a href="{{ loginUrl }}">Aanmelden</a></p>
<p>Sportieve groeten,<br>{{ store.name }}</p>`
  },
  fr: {
    subject: 'Bienvenue chez {{ store.name }}',
    body: `<p>Bonjour {{ customer.name }},</p>
<p>Votre compte chez {{ store.name }} a été créé. Avec votre compte, vous inscrivez vos enfants plus rapidement et consultez vos commandes.</p>
<p><a href="{{ loginUrl }}">Se connecter</a></p>
<p>Sportivement,<br>{{ store.name }}</p>`
  },
  en: {
    subject: 'Welcome to {{ store.name }}',
    body: `<p>Hi {{ customer.name }},</p>
<p>Your account at {{ store.name }} has been created. With your account you register your children faster and see your orders.</p>
<p><a href="{{ loginUrl }}">Log in</a></p>
<p>Kind regards,<br>{{ store.name }}</p>`
  }
});

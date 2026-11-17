import { defineEmailTemplate } from '../services/templateContent.js';

export default defineEmailTemplate({
  code: 'order_canceled',
  name: 'Order canceled',
  variables: ['store.name', 'customer.name', 'order.number', 'order.date', 'itemsTable'],
  sampleData: {
    customer: { name: 'An Peeters' },
    order: { number: '10001', date: '6 juli 2026' },
    itemsTable: '<table><tr><td>Zomerkamp – Week 1</td><td>€ 150,00</td></tr></table>'
  },
  nl: {
    subject: 'Je bestelling #{{ order.number }} is geannuleerd',
    body: `<p>Dag {{ customer.name }},</p>
<p>Je bestelling #{{ order.number }} van {{ order.date }} is geannuleerd.</p>
{{{ itemsTable }}}
<p>Heb je hier vragen over? Antwoord dan gewoon op deze e-mail.</p>
<p>Sportieve groeten,<br>{{ store.name }}</p>`
  },
  fr: {
    subject: 'Votre commande #{{ order.number }} a été annulée',
    body: `<p>Bonjour {{ customer.name }},</p>
<p>Votre commande #{{ order.number }} du {{ order.date }} a été annulée.</p>
{{{ itemsTable }}}
<p>Des questions ? Répondez simplement à cet e-mail.</p>
<p>Sportivement,<br>{{ store.name }}</p>`
  },
  en: {
    subject: 'Your order #{{ order.number }} was canceled',
    body: `<p>Hi {{ customer.name }},</p>
<p>Your order #{{ order.number }} of {{ order.date }} was canceled.</p>
{{{ itemsTable }}}
<p>Any questions? Just reply to this email.</p>
<p>Kind regards,<br>{{ store.name }}</p>`
  }
});

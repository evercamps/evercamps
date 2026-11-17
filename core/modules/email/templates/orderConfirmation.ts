import { defineEmailTemplate } from '../services/templateContent.js';

export default defineEmailTemplate({
  code: 'order_confirmation',
  name: 'Order confirmation',
  variables: [
    'store.name',
    'customer.name',
    'order.number',
    'order.date',
    'order.total',
    'order.paymentMethod',
    'order.url',
    'itemsTable'
  ],
  sampleData: {
    customer: { name: 'An Peeters' },
    order: {
      number: '10001',
      date: '6 juli 2026',
      total: '€ 150,00',
      paymentMethod: 'Bancontact',
      url: 'https://example.com/account'
    },
    itemsTable: '<table><tr><td>Zomerkamp – Week 1</td><td>€ 150,00</td></tr></table>'
  },
  nl: {
    subject: 'Bevestiging van je bestelling #{{ order.number }}',
    body: `<p>Dag {{ customer.name }},</p>
<p>Bedankt voor je bestelling bij {{ store.name }}. We hebben ze goed ontvangen.</p>
<p><strong>Bestelling:</strong> #{{ order.number }}<br>
<strong>Datum:</strong> {{ order.date }}<br>
<strong>Betaalmethode:</strong> {{ order.paymentMethod }}</p>
{{{ itemsTable }}}
<p>Je bestellingen bekijk je in <a href="{{ order.url }}">je account</a>.</p>
<p>Sportieve groeten,<br>{{ store.name }}</p>`
  },
  fr: {
    subject: 'Confirmation de votre commande #{{ order.number }}',
    body: `<p>Bonjour {{ customer.name }},</p>
<p>Merci pour votre commande chez {{ store.name }}. Nous l'avons bien reçue.</p>
<p><strong>Commande :</strong> #{{ order.number }}<br>
<strong>Date :</strong> {{ order.date }}<br>
<strong>Mode de paiement :</strong> {{ order.paymentMethod }}</p>
{{{ itemsTable }}}
<p>Vous pouvez consulter vos commandes dans <a href="{{ order.url }}">votre compte</a>.</p>
<p>Sportivement,<br>{{ store.name }}</p>`
  },
  en: {
    subject: 'Your order #{{ order.number }} is confirmed',
    body: `<p>Hi {{ customer.name }},</p>
<p>Thank you for your order at {{ store.name }}. We have received it.</p>
<p><strong>Order:</strong> #{{ order.number }}<br>
<strong>Date:</strong> {{ order.date }}<br>
<strong>Payment method:</strong> {{ order.paymentMethod }}</p>
{{{ itemsTable }}}
<p>You can view your orders in <a href="{{ order.url }}">your account</a>.</p>
<p>Kind regards,<br>{{ store.name }}</p>`
  }
});

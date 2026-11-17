import { defineEmailTemplate } from '../services/templateContent.js';

export default defineEmailTemplate({
  code: 'admin_new_order',
  name: 'New order (admin notification)',
  variables: [
    'customer.name',
    'order.number',
    'order.date',
    'order.total',
    'order.paymentMethod',
    'order.customerEmail',
    'order.adminUrl',
    'itemsTable'
  ],
  sampleData: {
    customer: { name: 'An Peeters' },
    order: {
      number: '10001',
      date: '6 juli 2026',
      total: '€ 150,00',
      paymentMethod: 'Bancontact',
      customerEmail: 'an@example.com',
      adminUrl: 'https://example.com/admin/order/edit/x'
    },
    itemsTable: '<table><tr><td>Zomerkamp – Week 1</td><td>€ 150,00</td></tr></table>'
  },
  nl: {
    subject: 'Nieuwe bestelling #{{ order.number }} ({{ order.total }})',
    body: `<p>Er is een nieuwe bestelling geplaatst.</p>
<p><strong>Bestelling:</strong> #{{ order.number }}<br>
<strong>Datum:</strong> {{ order.date }}<br>
<strong>Klant:</strong> {{ customer.name }} ({{ order.customerEmail }})<br>
<strong>Betaalmethode:</strong> {{ order.paymentMethod }}</p>
{{{ itemsTable }}}
<p><a href="{{ order.adminUrl }}">Bekijk de bestelling in de admin</a></p>`
  },
  fr: {
    subject: 'Nouvelle commande #{{ order.number }} ({{ order.total }})',
    body: `<p>Une nouvelle commande a été passée.</p>
<p><strong>Commande :</strong> #{{ order.number }}<br>
<strong>Date :</strong> {{ order.date }}<br>
<strong>Client :</strong> {{ customer.name }} ({{ order.customerEmail }})<br>
<strong>Mode de paiement :</strong> {{ order.paymentMethod }}</p>
{{{ itemsTable }}}
<p><a href="{{ order.adminUrl }}">Voir la commande dans l'admin</a></p>`
  },
  en: {
    subject: 'New order #{{ order.number }} ({{ order.total }})',
    body: `<p>A new order was placed.</p>
<p><strong>Order:</strong> #{{ order.number }}<br>
<strong>Date:</strong> {{ order.date }}<br>
<strong>Customer:</strong> {{ customer.name }} ({{ order.customerEmail }})<br>
<strong>Payment method:</strong> {{ order.paymentMethod }}</p>
{{{ itemsTable }}}
<p><a href="{{ order.adminUrl }}">View the order in the admin</a></p>`
  }
});

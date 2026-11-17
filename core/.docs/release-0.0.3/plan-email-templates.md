# Email: templates, SMTP sending and an email log (core)

## Context

From `planning.md` (release 0.0.3, features > emails, line 10):

> create email template logic inside the application. So emails can be sent. Have default emails as a
> fallback. Smtp settings should be added. Have a log of sent emails, that are auto-erased after x-time.

The next item (line 11) is a separate Brevo plugin with open/click tracking. It is planned in
`plan-brevo-email-plugin.md` and plugs into the transport and log described here. This plan keeps
the extension points it needs (transport registry, tracking columns, `recordEmailEvent`) in core.

Earlier docs list "no emails at all" as gap G1 (`release-0.0.2/analysis-user-test-flows.md:341`) and
note that admin-created registrations would skip any future order email
(`release-0.0.2/analysis-admin-registration-finances.md:47`).

## Current state

**Nothing sends email.** There is no `nodemailer` (or other mail library) in `package.json`, and no
code that mentions SMTP or a mailer. The only subscribers are catalog URL-rewrite subscribers
(`core/modules/catalog/subscribers/*`).

**Events that already exist**

| Event | Emitted at | Data |
|---|---|---|
| `order_placed` | COD: `core/modules/cod/api/createOrder/[placeOrder]addOrderPlacedEvent.ts:17` (on order creation) | full `order` row |
| `order_placed` | Mollie: `core/modules/mollie/api/mollieWebhook/[bodyJson]webhook.ts:134` (first `paid`, guarded at `:85-89`) | `order` row loaded *before* the payment status update, so `payment_status` is stale |
| `order_placed` | Stripe `stripeWebHook/[bodyJson]webhook.ts:116,159`, PayPal `paypalReturn/index.js:52` | `order` row |
| `customer_registered` | `core/modules/customer/services/customer/createCustomer.ts:104-107` (only when `status = 1`) | `customer` row without password |
| `order_status_updated` | `core/modules/oms/services/updateOrderStatus.ts:88-104` (direct insert into `event`) | `{ order_id, before, after }` |

`createParticipant.ts:10` and `createRegistration.ts:10` (camp services) import `emit` but never call it.

**How events are processed** (`includes/lib/event/`)

- `emit()` only inserts a row into the `event` table (`emitter.ts:9-16`).
- A separate child process (`event-manager.js`, started by `includes/bin/lib/startUp.ts:61`) polls
  every 10 s. It loads **only events that have a subscriber** (`event-manager.js:66-71`) and deletes
  them once processed (`:88-98`).
- Subscribers are `subscribers/<eventName>/*.js` files in any module or plugin
  (`loadSubscribers.js:8-15`).
- Errors in a subscriber are logged and swallowed (`callSubscibers.js`); the event is still marked
  done, so there is **no retry**.

Consequences for email that the plan must handle:

1. **Backlog.** `order_placed`, `customer_registered` and `order_status_updated` have never had a
   subscriber, so every row since go-live is still in `event`. The first subscriber would mail all
   past customers.
2. **Stale settings.** `getSetting()` caches all settings per process (`core/modules/setting/services/setting.ts:9-21`).
   `saveSetting` refreshes only the web process (`api/saveSetting/saveSetting.ts:42`). The event and
   cron processes keep the values from their start, so new SMTP settings wouldn't be used.
3. **No routes outside the web process.** `buildUrl()` throws when the route is unknown
   (`includes/lib/router/buildUrl.ts:16-20`). Routes are loaded only in `includes/bin/lib/app.ts:15-31`;
   `event-manager.js:20-34` and `includes/lib/cronjob/cronjob.ts:11-26` only run bootstrap scripts.
   So links in emails (order page, login) can't be built in a subscriber today.
4. `buildAbsoluteUrl()` falls back to `http://localhost:<port>` when `shop.homeUrl` is missing
   (`includes/lib/router/buildAbsoluteUrl.ts:20`). `shop.homeUrl` is not in `config/default.json`.

**Password reset is half done.**

- `core/modules/customer/api/resetPassword/[bodyParser]resetPassword.ts:44-57` stores a hashed token
  and then puts the **plain token** in `response.$body`, which `apiResponse` sends back to the caller
  (`core/modules/base/api/middleware/apiResponse.ts:11`). The route is public (`customer/api/routes.ts:146-155`).
  Anyone who knows an email address can request a token and reset that account's password. The
  comment says "Email sending is handled by extensions" (`:59`). This must be fixed together with
  the reset email.
- The storefront already says "We have sent you an email…" (`pages/frontStore/resetPasswordPage/ResetPasswordForm.tsx:30-32`).
- The update password page `/account/update-password` has no form: `pages/frontStore/updatePasswordPage/UpdatePasswordForm.tsx`
  contains a copy of the checkout contact step (`:28`, `layout.areaId: 'checkoutSteps'` at `:89-92`).
  The API `POST /customers/password` (`api/updatePassword/[bodyParser]updatePassword.ts:42-98`) works
  and checks the token lifetime (`:49-52`, default 48 h).

**Cron jobs exist but are unused.** `includes/lib/cronjob/jobManager.ts:73-102` (`registerJob`, needs an
absolute path to a `.js` file and a valid cron expression), scheduled by `cronjob.ts:27-47` in its own
process (`startCronProcess.ts`). Bootstrap scripts run in all three processes
(`includes/bin/lib/bootstrap/bootstrap.ts:12`). Nobody calls `registerJob` yet. `node-cron` is
already a dependency.

**Settings.** Key/value rows in `setting` (`core/modules/setting/migration/Version-1.0.0.ts`), saved by
`POST /settings` (`saveSetting.ts`). That route runs *after* `escapeHtml` (`setting/api/routes.ts:97`),
which escapes `<tag>` patterns in every string (`core/modules/base/services/escapePayload.ts:3-13`), so
HTML can't be stored as a setting. Patterns to copy:

- settings page with left menu: `core/modules/camp/pages/admin/campSetting/CampSetting.tsx` (with `dataFilter`, `:33-43`);
  menu card in area `settingPageMenu` (`setting/pages/admin/all/CampSettingMenu.tsx`; sortOrders in use: 5, 10, 15, 20, 25);
- a settings page whose cards come from other modules: `setting/pages/admin/paymentSetting/PaymentSetting.tsx:31`
  (`<Area id="paymentSetting">`), filled by `mollie/pages/admin/paymentSetting/MolliePayment.tsx:93`;
- secrets: config first, setting as fallback (`mollie/services/getMollieApiKey.ts:7-22`). Note that
  Mollie returns the stored key unmasked to the admin (`MollieSetting.admin.resolvers.ts:37-38`);
  WooCommerce import never resolves its secret (`WooCommerceSetting.resolvers.ts:6-8`). We follow the
  WooCommerce approach. (Its form posts an empty password field, `WooCommerceSettings.tsx:287-293`,
  and `serializeForm` keeps empty values, `includes/lib/util/formToJson.js:34-45`, so check that it
  doesn't wipe the saved secret. Our form drops the empty field in a `dataFilter`.)

**Pluggable lists.** `registerPaymentMethod` (`core/modules/checkout/services/getAvailablePaymentMethos.ts:49-53`)
adds a factory to the `checkoutPaymentMethods` registry value; `getAvailablePaymentMethods` (`:9-42`)
reads and validates them. Plugins call `addProcessor` from their bootstrap
(`content/plugins/belgian-administration/src/bootstrap.ts:72-86`). We use the same pattern for transports
and templates.

**Translations.** One shop language (`shop.language`, default `en`). `translate()` reads
`content/translations/<language>/*.csv` (`includes/lib/locale/translate/translate.ts:8-20`,
`includes/lib/webpack/loaders/loadTranslationFromCsv.ts:12-18`). The CSVs are loaded in every process
by `core/modules/base/bootstrap.ts:6`. Customers have no language column. Available folders include
`nl` and `fr`.

**Module registration.** Core modules are a hardcoded list in `includes/bin/lib/loadModules.js:8-88`.
Migrations run per module from `migration/Version-x.y.z.js` (`includes/bin/lib/bootstrap/migrate.js`).

**Editor.** `includes/components/form/fields/Ckeditor.tsx:299` (`CkeditorField`) exists but is not used
anywhere. CKEditor removes markup it doesn't know (table layouts, inline styles), which is not great for email HTML.

**Data for order emails.** `order` (`checkout/migration/Version-1.0.0.ts:108-149`), `order_item`
(`:191-228`, has `product_name`, `variant_options`), `order_item_registration` (participant
`first_name`, `last_name`, `registration_id`, `extra_data`; `oms/migration/Version-1.0.0.ts:6`,
`Version-1.0.1/1.0.4`). Store name/email/address are settings (`setting/graphql/types/StoreSetting/StoreSetting.graphql`).

**Imports create customers.** `content/plugins/woocommerce-import/src/lib/runOrderImport.ts:231-235`
calls `createCustomer`, which emits `customer_registered`. A welcome email would go to every imported customer.

## Decisions

- **New core module `email`** (`core/modules/email`), so the Brevo plugin and other plugins can
  depend on it. It owns templates, rendering, sending, transports, the log and the jobs.
- **Templates: defaults in code, overrides in the database.** Each template has a default subject and
  body per language in code. An admin can customize it; the override is stored in `email_template`.
  "Reset to default" deletes the override. Lookup order: override for (code, shop language) →
  default for the shop language → default `en`.
- **Simple placeholders, no template engine dependency.** `{{ order.number }}` inserts an
  HTML-escaped value; `{{{ itemsTable }}}` inserts HTML that code builds (lists, tables). No loops or
  conditions in templates; code prepares blocks. This keeps admin-edited templates safe and simple.
  (Open question 1 if loops are needed.)
- **Layout in code.** A shared HTML layout (store name header, footer with store address/email,
  inline CSS) wraps the body. Admins edit only the body. A plain-text part is generated from the HTML.
- **Body editor: HTML textarea + live preview**, not CKEditor (see above). Open question 2.
- **Transports are pluggable.** Core ships `smtp` (nodemailer). Plugins register more (Brevo).
  One active transport, chosen in settings. If the chosen transport is not registered (plugin
  disabled), fall back to `smtp`.
- **Sending is synchronous inside the caller**, which is a subscriber (event process) for event
  emails, or the API middleware for password reset (the token should not be written to the `event` table).
- **Every send attempt is logged** in `email_log`, also when sending is disabled (`skipped`) or fails.
  The log stores the rendered subject and body, so it can be viewed and resent.
- **Tracking columns live in core** (`delivered_at`, `opened_at`, `clicked_at`, counters, plus an
  `email_log_event` table). SMTP leaves them empty. The Brevo plugin fills them through a core
  service `recordEmailEvent`. This avoids a plugin altering a core table and lets the core log
  UI show opens/clicks when the active transport supports tracking.
- **Idempotency.** One-time emails (order confirmation, welcome) get an `idempotency_key`
  (e.g. `order_confirmation:order:123`) with a unique index. A redelivered event doesn't send twice.
- **Auto-erase** with a daily cron job: delete log rows older than `emailLogRetentionDays`
  (default 90).
- **Retry** failed sends with a cron job (every 15 min, max 3 attempts, only within 24 h), because
  subscribers have no retry.
- **Single language** for now (shop language). Templates are stored per language so a later
  per-customer language needs no schema change.

## Templates

| Code | Trigger | To | Default |
|---|---|---|---|
| `order_confirmation` | `order_placed` | `order.customer_email` | enabled |
| `admin_new_order` | `order_placed` | `emailAdminRecipients` setting (fallback `storeEmail`) | disabled |
| `order_canceled` | `order_status_updated` with `after = 'canceled'` | `order.customer_email` | enabled |
| `customer_welcome` | `customer_registered` | `customer.email` | enabled, but skipped for imports (step 3.3) |
| `reset_password` | `POST /customers/reset-password` | the customer | enabled, cannot be disabled |
| `email_test` | "Send test email" button | typed address | internal, not editable |

Variables per template are declared in code (shown in the editor as a help list), for example for
`order_confirmation`: `store.name`, `store.email`, `customer.name`, `order.number`, `order.date`,
`order.total` (formatted with currency), `order.paymentMethod`, `order.url` (account order page),
`{{{ itemsTable }}}` (product, participant names, price). For `reset_password`: `customer.name`,
`resetUrl`, `expiresInHours`.

Plugins can add templates with `registerEmailTemplate()` (for example a fiscal attest email in
`belgian-administration` later).

## Data model (migration `core/modules/email/migration/Version-1.0.0.ts`)

`email_template` (only overrides and on/off flags; defaults live in code)

| Column | Type | Notes |
|---|---|---|
| `email_template_id` | INT identity PK | |
| `uuid` | UUID | unique |
| `code` | varchar NOT NULL | e.g. `order_confirmation` |
| `language` | varchar NOT NULL DEFAULT 'en' | |
| `enabled` | boolean NOT NULL DEFAULT true | |
| `subject` | text NULL | NULL = use default |
| `body_html` | text NULL | NULL = use default |
| `created_at`, `updated_at` | timestamptz | |
| | | UNIQUE (`code`, `language`) |

`email_log`

| Column | Type | Notes |
|---|---|---|
| `email_log_id` | INT identity PK | |
| `uuid` | UUID | unique; also sent as a custom header so providers can echo it |
| `template_code` | varchar NOT NULL | |
| `recipient` | varchar NOT NULL | one row per recipient |
| `subject` | text NOT NULL | rendered |
| `body_html` | text NULL | rendered; needed for view/resend/retry |
| `status` | varchar NOT NULL | `queued`, `sent`, `failed`, `skipped`; tracking may set `delivered`, `bounced`, `spam`, `blocked` |
| `transport` | varchar NULL | `smtp`, `brevo`, … |
| `provider_message_id` | varchar NULL | indexed |
| `error` | text NULL | |
| `attempts` | INT NOT NULL DEFAULT 0 | |
| `entity_type`, `entity_id` | varchar, INT NULL | e.g. `order`, 123; indexed together |
| `idempotency_key` | varchar NULL | unique where not null |
| `sent_at`, `delivered_at` | timestamptz NULL | |
| `opened_at`, `clicked_at` | timestamptz NULL | first open/click |
| `open_count`, `click_count` | INT NOT NULL DEFAULT 0 | |
| `created_at`, `updated_at` | timestamptz | `created_at` indexed (purge) |

`email_log_event` (raw provider events, for the detail view)

| Column | Type | Notes |
|---|---|---|
| `email_log_event_id` | INT identity PK | |
| `email_log_id` | INT NOT NULL | FK, `ON DELETE CASCADE` (purge removes events too) |
| `event` | varchar NOT NULL | normalized: `delivered`, `opened`, `clicked`, `soft_bounce`, `hard_bounce`, `spam`, `blocked`, `invalid`, `deferred`, `unsubscribed`, `error` |
| `occurred_at` | timestamptz NOT NULL | |
| `data` | jsonb NULL | e.g. clicked `link`, bounce `reason`, `proxy` flag |

Same migration, **backlog cleanup**: `DELETE FROM event WHERE name IN ('order_placed',
'customer_registered', 'order_status_updated')`. Migrations run before the event process starts
(`startUp.ts:42` then `:61`), so no new event is lost.

## Settings

Stored in `setting` through the existing `saveSetting` API.

| Setting | Default | Notes |
|---|---|---|
| `emailSendingEnabled` | 0 | master switch; when off, sends are logged as `skipped` |
| `emailTransport` | `smtp` | code of the active transport |
| `emailFromName` | `storeName` | |
| `emailFromAddress` | `storeEmail` | |
| `emailReplyTo` | empty | |
| `emailAdminRecipients` | empty | comma separated, for `admin_new_order` |
| `emailLogRetentionDays` | 90 | 1–3650 |
| `smtpHost`, `smtpPort` | empty, 587 | |
| `smtpSecurity` | `starttls` | `none`, `starttls`, `ssl` |
| `smtpUsername` | empty | |
| `smtpPassword` | empty | never returned by GraphQL; empty field = keep current |

Config override (like Mollie): `system.email.smtp.{host,port,security,username,password}` in
`config/production.json` wins over the settings, so the password can stay out of the database.
Add `system.email` to the configuration schema in the module bootstrap (pattern:
`core/modules/base/bootstrap.ts:8-30`).

The email service calls `refreshSetting()` before each send (cheap; one query) to fix the stale
cache in the event/cron processes.

## Code design

```
core/modules/email/
  bootstrap.ts                    register smtp transport, default templates, cron jobs, config schema
  migration/Version-1.0.0.ts
  services/
    sendEmail.ts                  sendEmail({ template, to, data, language?, entity?, idempotencyKey? })
    renderTemplate.ts             placeholder rendering + layout + text part
    templates.ts                  registerEmailTemplate / getEmailTemplates / resolveTemplate
    transports.ts                 registerEmailTransport / getActiveTransport
    smtpTransport.ts              nodemailer implementation
    recordEmailEvent.ts           used by tracking transports (Brevo)
    emailSettings.ts              reads settings + config override
    orderEmailData.ts             loads order + items + registrations for templates
    index.ts                      public exports for plugins
  templates/defaults/<code>.ts    { variables, en: { subject, body }, nl: {...}, fr: {...} }
  templates/layout.ts
  subscribers/order_placed/sendOrderConfirmation.ts
  subscribers/order_placed/sendAdminNewOrder.ts
  subscribers/order_status_updated/sendOrderCanceled.ts
  subscribers/customer_registered/sendCustomerWelcome.ts
  jobs/purgeEmailLog.ts
  jobs/retryFailedEmails.ts
  api/… graphql/… pages/admin/…   (see Admin UI)
```

Transport interface (in `services/transports.ts`):

```ts
interface EmailMessage {
  logUuid: string; templateCode: string;
  from: { name: string; email: string }; replyTo?: string;
  to: string; subject: string; html: string; text: string;
}
interface EmailTransport {
  code: string; name: string;
  supportsTracking?: boolean;
  isConfigured(): Promise<boolean>;
  send(message: EmailMessage): Promise<{ providerMessageId?: string }>;
}
export function registerEmailTransport(t: EmailTransport): void   // addProcessor('emailTransports', …)
```

`sendEmail` flow:

1. `refreshSetting()`; load the resolved template. If the template is disabled → return.
2. If `idempotencyKey` is set and a row with that key and status `sent`/`queued` exists → return.
3. Render subject/body/text. Insert `email_log` (`queued`).
4. If `emailSendingEnabled` is off → set `skipped`, return.
5. Pick the transport. If not configured → `failed` with "No email transport configured".
6. `transport.send()` → `sent`, `sent_at`, `provider_message_id`, `attempts+1`; on error → `failed`, `error`, `attempts+1`.
7. Never throw to the caller (a failed email must not break checkout or the password reset response). Log with `error()`.

`recordEmailEvent({ logUuid?, providerMessageId?, event, occurredAt, data })` finds the log row
(uuid first, then provider id), inserts `email_log_event`, and updates the row: `delivered` →
`delivered_at` and status `delivered` (only from `sent`); `opened` → `opened_at` (first),
`open_count+1`; `clicked` → `clicked_at` (first), `click_count+1`; bounces/spam/blocked/invalid →
status. Opens/clicks never change `status`, so the status stays a delivery status.

## Admin UI

1. **Settings > Email** (`/admin/setting/email`, menu card in `settingPageMenu`, sortOrder 30):
   - General card: master switch, transport select (from registered transports), from name/address,
     reply-to, admin recipients, log retention days.
   - `<Area id="emailTransportSetting">` with the core SMTP card (host, port, security, username,
     password "leave blank to keep"). The Brevo plugin adds its card here. Same pattern as
     `PaymentSetting.tsx:31`.
   - "Send test email" (address input + button) → `POST /api/email/test`, shows the result and
     links to the log row.
2. **Email templates** (`/admin/email-templates`, under Settings or Marketing menu): list with name,
   code, trigger, enabled, "customized" badge.
   Edit page (`/admin/email-templates/:code`): enabled toggle, subject, body (HTML textarea),
   variables help list, live preview (sandboxed iframe, sample data from the template definition),
   "Send test to me", "Reset to default". Save via `PATCH /api/email-templates/:code`.
   **This API must run before `escapeHtml`** (`after: ['payloadValidate'], before: ['escapeHtml']`
   in `routes.ts`) or the HTML gets escaped. Access `private`.
3. **Email log** (`/admin/email-logs`): grid with date, template, recipient, subject, status,
   transport, and Opened/Clicked columns when the active transport `supportsTracking`. Filters:
   recipient, template, status, date. Detail view: metadata, rendered body (sandboxed iframe),
   events timeline (`email_log_event`), "Resend" (new log row, same body).
4. **Order page**: an "Emails" card in `leftSide` (order edit, after Activities at sortOrder 30,
   `oms/pages/admin/orderEdit/Activities.tsx:116-117`) listing log rows for `entity_type = 'order'`,
   with "Resend order confirmation".

GraphQL (admin only, `*.admin.graphql`): `emailTemplates`, `emailTemplate(code)`, `emailLogs(filters)`
(collection like `core/modules/customer/services/CustomerCollection.ts`), `emailLog(uuid)`,
`Order.emailLogs`, `Setting.email*` and `smtp*` (no password; `smtpPasswordSet: Boolean`),
`emailTransports { code name supportsTracking configured }`.

## Implementation steps

### Phase 0 – prerequisites

1. **Routes in the event and cron processes.** In `includes/lib/event/event-manager.js:20-34` and
   `includes/lib/cronjob/cronjob.ts:11-26`, call `loadModuleRoutes(module.path)`
   (`includes/lib/router/loadModuleRoutes.ts:7`, filesystem scan only) for every module before the
   bootstrap scripts. Then `buildAbsoluteUrl` works in subscribers and jobs.
2. **`shop.homeUrl`** must be set in each environment's config. Document it in the README and log
   a warning in the email bootstrap when it's missing outside development.
3. **Fix the update password page.** Replace `customer/pages/frontStore/updatePasswordPage/UpdatePasswordForm.tsx`
   with a real form (read `token` from the query string, new password + confirm, POST to
   `url(routeId: "updatePassword")`, success → login link).

### Phase 1 – module, settings, SMTP, log

4. Add `nodemailer` and `@types/nodemailer` to `package.json`.
5. Create `core/modules/email` and add it to `includes/bin/lib/loadModules.js` (before `oms`/`setting` is fine; order doesn't matter for migrations).
6. Migration `Version-1.0.0.ts`: the three tables, indexes, backlog `DELETE` (see Data model).
7. `services/emailSettings.ts`, `services/transports.ts`, `services/smtpTransport.ts` (create the
   nodemailer transport per send, or cache it keyed on the settings), `services/sendEmail.ts`,
   `services/recordEmailEvent.ts`, `services/index.ts`.
8. `bootstrap.ts`: `registerEmailTransport(smtpTransport)`, config schema.
9. Settings page `pages/admin/emailSetting/{route.json,index.ts,EmailSetting.tsx,SmtpSetting.tsx}`,
   menu card `pages/admin/all/EmailSettingMenu.tsx`, GraphQL `graphql/types/EmailSetting/*`.
   `dataFilter` drops an empty `smtpPassword`.
10. Test API `api/sendTestEmail/` (`POST /email/test`, private).

### Phase 2 – templates

11. `services/renderTemplate.ts` (escape, `{{{ }}}` raw, unknown placeholder → empty + warning, layout, text part).
12. `services/templates.ts` with `registerEmailTemplate` (registry value `emailTemplates`) and
    `resolveTemplate(code, language)`.
13. Default templates in `templates/defaults/*.ts` in `en`, `nl`, `fr` (Dutch first, it's the main market).
14. Template GraphQL, list page `pages/admin/emailTemplateGrid/`, edit page `pages/admin/emailTemplateEdit/`,
    APIs `api/updateEmailTemplate/` (before `escapeHtml`), `api/resetEmailTemplate/`, `api/previewEmailTemplate/`.

### Phase 3 – triggers

15. `services/orderEmailData.ts`: reload the order by `order_id` (the event data can be stale),
    items, `order_item_registration` names, formatted totals (`checkout/services/toPrice.ts`),
    `buildAbsoluteUrl` for the order page.
16. Subscribers: `order_placed/sendOrderConfirmation.ts` (key `order_confirmation:order:<id>`),
    `order_placed/sendAdminNewOrder.ts`, `order_status_updated/sendOrderCanceled.ts`
    (only `after === 'canceled'`), `customer_registered/sendCustomerWelcome.ts` (key per customer).
17. Imports: let `createCustomer` take `context.skipEvents` (`createCustomer.ts:68`, skip the emit at
    `:104-107`) and pass it from `woocommerce-import/src/lib/runOrderImport.ts:231`. Imported orders
    don't emit `order_placed` (they insert `order` directly, `runOrderImport.ts:294`), so no change there.
18. Password reset: change `resetPassword.ts:54-57` to keep the token in `response.locals` and set
    `$body = { email }` only. Add middleware `customer/api/resetPassword/sendResetPasswordEmail.ts`
    (entry in `customer/api/routes.ts` after `resetPassword`, before `apiResponse`) that calls
    `sendEmail({ template: 'reset_password', … resetUrl: buildAbsoluteUrl('updatePasswordPage') + '?token=…' })`.
    Respond the same way whether the email exists or not (already the case).

### Phase 4 – log UI

19. Log GraphQL + collection, `pages/admin/emailLogGrid/`, `pages/admin/emailLogView/`, API `api/resendEmail/`.
20. Order page card `pages/admin/orderEdit/OrderEmails.tsx` (`leftSide`, sortOrder 40).
21. Admin menu item (Settings group, or a new "Emails" item).

### Phase 5 – jobs

22. `jobs/purgeEmailLog.ts`: `DELETE FROM email_log WHERE created_at < now() - make_interval(days => $retention)`
    (events cascade). Register in `bootstrap.ts` with `registerJob({ name: 'purgeEmailLog', schedule: '15 3 * * *', resolve: <absolute dist path>, enabled: true })`.
    Register only once: `registerJob` warns on duplicates, and bootstrap runs in every process, which is fine.
23. `jobs/retryFailedEmails.ts` (`*/15 * * * *`): status `failed`, `attempts < 3`, `created_at > now() - 24h`;
    resend the stored body with the active transport.

### Phase 6 – translations and docs

24. Add UI strings to `content/translations/nl/*.csv` (and `fr`).
25. Update `analysis-user-test-flows.md` G1 when done; add a short "Emails" section to the README
    (SMTP config, Mailpit for local testing, `shop.homeUrl`).

## Open questions

1. Are placeholders + code-built blocks enough, or do admins need conditions/loops (then add
   `handlebars`, which escapes by default)?
2. HTML textarea + preview, or CKEditor for the body? CKEditor is friendlier but strips email markup.
3. Retention default: 90 days? Should `body_html` be cleared earlier (e.g. 30 days) and the
   metadata kept longer?
4. Should the welcome email be on by default? Customers mostly register during checkout and also get
   the order confirmation.
5. Order confirmation for COD is sent at order creation; for Mollie only after payment. Do we also
   want a "payment failed/expired" email (Mollie `failed`/`expired`, `webhook.ts:137-147`)? This
   relates to the 0.0.3 analysis on failed payments keeping seats.
6. Admin-created registrations have no order and get no email (`analysis-admin-registration-finances.md:47`).
   Add a `registration_confirmation` template triggered from the camp module now or later?
7. Attach anything (e.g. invoice PDF, fiscal attest)? The transport interface would need `attachments`.

## Testing

Unit (jest, next to the services):

- `renderTemplate`: escaping, raw blocks, unknown placeholders, language fallback (`nl` → `en`).
- `sendEmail` with a fake transport: disabled → `skipped`; not configured → `failed`; success →
  `sent` with provider id; throwing transport → `failed`, no exception; idempotency key blocks a second send.
- `recordEmailEvent`: first open sets `opened_at`, second only increments; bounce sets status; unknown id ignored.
- Purge: rows older than retention deleted, events cascade.

Manual (local Mailpit, SMTP `localhost:1025`, security `none`):

1. Settings > Email: save SMTP, password field stays empty after reload and the password is kept.
2. Send test email: arrives in Mailpit; log row `sent`.
3. Upgrade a DB copy with old `order_placed` events: after start no old emails are sent, `event` has no backlog.
4. COD order: confirmation arrives once (restart the event process mid-way: still once).
5. Mollie test order: confirmation only after `paid`; failed payment: no confirmation.
6. Cancel an order in admin: cancel email.
7. Register on the storefront: welcome email. Run a WooCommerce import: no welcome emails.
8. Forgot password: the API response contains no token; the email link opens the update password
   form; the new password works; the link fails after 48 h.
9. Edit a template, preview, save with HTML: stored unescaped; reset to default.
10. Change SMTP settings and place an order without restarting: the new settings are used.
11. Wrong SMTP password: log `failed` with error; fix it; the retry job sends it within 15 min.
12. Set retention to 1 day, change a row's `created_at`, run the purge job: the row is gone.
13. Turn the master switch off: orders still work, log shows `skipped`.

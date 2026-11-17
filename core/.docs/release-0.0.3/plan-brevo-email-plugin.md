# Brevo email plugin: send through Brevo, track opens and clicks

## Context

From `planning.md` (release 0.0.3, features > emails, line 11):

> Create separate plugin to send emails by using brevo. add open, clicked to the email logs [plan]

This plan depends on the core email module from `plan-email-templates.md` (same folder). That plan
already provides what this plugin needs:

- a transport registry: `registerEmailTransport({ code, name, supportsTracking, isConfigured, send })`;
- the active transport chosen in Settings > Email (`emailTransport`), with fallback to `smtp` when
  the chosen transport is not registered;
- tracking columns on `email_log` (`delivered_at`, `opened_at`, `clicked_at`, `open_count`,
  `click_count`), the `email_log_event` table, and the service `recordEmailEvent()`;
- a `uuid` per log row that is passed to the transport as `message.logUuid`;
- an area `emailTransportSetting` on the email settings page for transport cards.

So the plugin only does three things: **send** through the Brevo API, **receive** Brevo webhooks
and pass them to `recordEmailEvent`, and offer a **settings card**.

## Current state

**Plugins**

- Registered in `config/default.json` under `system.extensions`, toggled at `/plugin-management`
  (DB override `plugin_enabled.<name>`, applied after a restart; `content/plugins/README.md`, sections
  "How a plugin gets loaded" and "Enabling / disabling").
- Layout and build: `content/plugins/belgian-administration/package.json` (swc `compile` script),
  `tsconfig.json`, `src/bootstrap.ts`.
- Plugins can't import core `.ts` sources; they re-export from the compiled `dist/` in one file,
  `src/core.ts` (`content/plugins/belgian-administration/src/core.ts:1-13`).
- Bootstrap registers processors/hooks (`belgian-administration/src/bootstrap.ts:72-86`). Bootstrap
  scripts run in the web, event and cron processes (`includes/bin/lib/bootstrap/bootstrap.ts:12`),
  so a transport registered there is also available to subscribers and jobs.
- A plugin adds an API route with `src/api/<routeId>/route.json` + middleware files; a plugin can also
  add a card to an existing page by folder name + `layout.areaId` (README, "Pages").

**Webhook pattern in core.** Mollie: public route `POST /mollie/webhook`
(`core/modules/mollie/api/mollieWebhook/route.json`), a body parser middleware `bodyJson.ts`, ordered
after `escapeHtml` (`core/modules/mollie/api/routes.ts:36-45`). It always answers 200 for unknown
ids (`[bodyJson]webhook.ts:44-47`).

**Secret settings pattern.** Config wins over settings (`core/modules/mollie/services/getMollieApiKey.ts:7-22`).
The WooCommerce plugin never returns its secret over GraphQL
(`content/plugins/woocommerce-import/src/graphql/types/WooCommerceSetting/WooCommerceSetting.resolvers.ts:6-8`)
and shows "Leave blank to keep the currently saved secret" (`pages/admin/wooCommerceSettings/WooCommerceSettings.tsx:287-293`).

**Outgoing HTTP.** Global `fetch` is already used against an external API
(`core/modules/mollie/api/mollieWebhook/[bodyJson]webhook.ts:99-107`), so no HTTP library or Brevo SDK is needed.

**Brevo API** (checked against the Brevo developer docs):

- Send: `POST https://api.brevo.com/v3/smtp/email`, header `api-key`, body `sender`, `to`, `replyTo`,
  `subject`, `htmlContent`, `textContent`, `headers`, `tags`. Response `201 { messageId }`.
- Transactional webhook payload fields: `event`, `email`, `message-id`, `date`, `ts_event` (seconds,
  UTC), `ts_epoch` (ms), `tags` (or `tag` for some events), `link` (on `click`), `reason` (bounces,
  deferred), `X-Mailin-custom` (echo of the custom header we set when sending).
- Payload `event` values: `request`, `delivered`, `opened`, `unique_opened`, `click`, `soft_bounce`,
  `hard_bounce`, `spam`, `invalid_email`, `deferred`, `blocked`, `error`, `unsubscribed`,
  `proxy_open`, `unique_proxy_open`.
- Create webhook: `POST https://api.brevo.com/v3/webhooks` with `url`, `description`,
  `type: 'transactional'`, `events` (config names: `request`, `delivered`, `hardBounce`, `softBounce`,
  `blocked`, `spam`, `invalid`, `deferred`, `click`, `opened`, `uniqueOpened`, `unsubscribed`),
  optional `batched`, `auth { type, token }` and custom `headers`. Response `201 { id }`.
  Max 40 webhooks per account.
- Brevo also recommends allowlisting its IP ranges for the webhook endpoint.

## Decisions

- **Plugin `content/plugins/brevo-email`** (name `brevo-email`), registered in `config/default.json`
  with `enabled: false`. Core keeps working with SMTP when the plugin is off.
- **Send with the HTTP API**, not Brevo's SMTP relay. The API returns a message id, accepts custom
  headers and tags, and gives clear errors. (Brevo's SMTP relay through the core SMTP transport
  still works for people who don't install the plugin, but without tracking.)
- **Match webhook events to log rows with our own id.** Send header `X-Mailin-custom: <email_log.uuid>`;
  Brevo echoes it in every webhook. Fallback: `message-id` → `email_log.provider_message_id`.
- **Tracking data lives in core columns**, filled through `recordEmailEvent`. The plugin has no
  migration in this version. Raw events go to `email_log_event`.
- **Webhook security:** a random token generated by the plugin. When Brevo is set up through our
  "Register webhook" button, Brevo sends it as `Authorization: Bearer <token>` (`auth: { type:
  'bearer', token }`). For a manually created webhook, the same token is accepted as `?token=` in the
  URL. Compare with `crypto.timingSafeEqual`. IP allowlisting is optional (open question 3).
- **Opens are unreliable** (Apple Mail Privacy Protection, image blocking). `proxy_open` /
  `unique_proxy_open` are stored as `opened` with `data.proxy = true` and don't count in `open_count`;
  the UI shows "opened (proxy)" separately. Clicks are reliable.
- **Status.** Delivery events update `email_log.status` (`delivered`, `soft_bounce` stays `sent`,
  `hard_bounce`/`invalid` → `bounced`, `spam`, `blocked`, `error` → `failed`). Opens/clicks only fill
  `opened_at`/`clicked_at` and counters (core rule, see the core plan).
- **No automatic fallback to SMTP** when a Brevo send fails. The core retry job retries with the
  active transport. (Open question 4.)

## Settings

Stored in `setting` through core `saveSetting`, edited on Settings > Email in the Brevo card.

| Setting | Default | Notes |
|---|---|---|
| `brevoApiKey` | empty | never returned by GraphQL (`brevoApiKeySet: Boolean` instead); empty field = keep |
| `brevoWebhookToken` | generated on first save | shown read-only with the webhook URL; "Regenerate" button |
| `brevoWebhookId` | empty | set by "Register webhook"; used to update/delete it |
| `brevoTrackingEnabled` | 1 | when 0 the webhook still answers 200 but stores nothing |

Config override: `system.brevo.apiKey` (and optionally `system.brevo.webhookToken`) in
`config/production.json`, like `system.mollie`.

Sender: core `emailFromName` / `emailFromAddress`. The sender domain must be verified in Brevo;
Brevo rejects unverified senders (shown as a send error in the log).

## Admin UI

1. **Settings > Email, Brevo card** (`src/pages/admin/emailSetting/BrevoSetting.tsx`,
   `layout: { areaId: 'emailTransportSetting', sortOrder: 20 }`):
   - API key (password field, "leave blank to keep"), status "configured / not configured";
   - webhook URL (`<homeUrl>/api/brevo/webhook`), token (read-only, copy button, regenerate);
   - "Register webhook in Brevo" button → plugin API creates or updates the webhook; shows the Brevo id;
   - "Check connection" button → `GET https://api.brevo.com/v3/account` with the key, shows the account email.
   The transport select in the core General card lists "Brevo" once the plugin is enabled.
2. **Email log** (core page): the Opened / Clicked columns appear because the Brevo transport has
   `supportsTracking: true`. The detail view shows the event timeline, including clicked links.
   Nothing to add in the plugin.
3. **Order "Emails" card** (core): shows opened/clicked per email once tracking data exists.

## Implementation steps

### Phase 1 – plugin skeleton

1. `content/plugins/brevo-email/package.json` (copy from `belgian-administration`, no dependencies),
   `tsconfig.json`, `README.md`.
2. Register in `config/default.json` `system.extensions` with `enabled: false`, `priority: 100`.
3. `src/core.ts`: re-export `registerEmailTransport`, `recordEmailEvent`, `getEmailSettings` from
   `../../../../dist/modules/email/services/index.js`, plus `getSetting`, `refreshSetting`, `pool`,
   `buildAbsoluteUrl`, `getConfig`, `debug`, `error` (same style as `belgian-administration/src/core.ts`).

### Phase 2 – transport

4. `src/services/brevoSettings.ts`: read API key (config first), webhook token, tracking flag.
5. `src/services/brevoTransport.ts`:
   ```ts
   export const brevoTransport = {
     code: 'brevo', name: 'Brevo', supportsTracking: true,
     isConfigured: async () => Boolean(await getBrevoApiKey()),
     send: async (m) => {
       const res = await fetch('https://api.brevo.com/v3/smtp/email', {
         method: 'POST',
         headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
         body: JSON.stringify({
           sender: m.from, to: [{ email: m.to }], replyTo: m.replyTo ? { email: m.replyTo } : undefined,
           subject: m.subject, htmlContent: m.html, textContent: m.text,
           headers: { 'X-Mailin-custom': m.logUuid }, tags: [m.templateCode]
         })
       });
       if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
       return { providerMessageId: (await res.json()).messageId };
     }
   };
   ```
   Add a 10 s timeout (`AbortSignal.timeout`). Don't log the API key or the body.
6. `src/bootstrap.ts`: `registerEmailTransport(brevoTransport)`.

### Phase 3 – webhook

7. `src/api/brevoWebhook/route.json`: `{ "methods": ["POST"], "path": "/brevo/webhook", "access": "public" }`.
   Middleware files: a JSON body parser (`express.json({ limit: '1mb' })`, like Mollie's `bodyJson.ts`
   but JSON) and `[bodyJson]webhook.ts`. Check during implementation whether the API region's
   default body parser already handles JSON for this route; then the extra parser is not needed.
8. `webhook.ts`:
   1. Verify the token (`Authorization: Bearer …` or `?token=`). Wrong/missing → 401.
   2. Accept a single object or an array (batched webhooks).
   3. For each item: map `event` (table below); skip `request` and unknown events.
      Find the log row by `X-Mailin-custom`, else by `message-id`. Call
      `recordEmailEvent({ logUuid, providerMessageId, event, occurredAt: ts_event * 1000, data: { link, reason, proxy, tags } })`.
   4. Always answer 200 once authenticated, also for unknown log rows (Brevo retries non-2xx).
   5. Keep it fast: only DB writes, no outgoing calls.

   | Brevo `event` | Core event | Effect (core) |
   |---|---|---|
   | `request` | – | ignored (we already log `sent`) |
   | `delivered` | `delivered` | `delivered_at`, status `delivered` |
   | `opened`, `unique_opened` | `opened` | `opened_at` (first), `open_count+1` only for `opened` |
   | `proxy_open`, `unique_proxy_open` | `opened` + `data.proxy` | event stored, no counter |
   | `click` | `clicked` | `clicked_at` (first), `click_count+1`, `data.link` |
   | `soft_bounce`, `deferred` | `soft_bounce` / `deferred` | event only |
   | `hard_bounce`, `invalid_email` | `hard_bounce` / `invalid` | status `bounced` |
   | `spam` | `spam` | status `spam` |
   | `blocked` | `blocked` | status `blocked` |
   | `error` | `error` | status `failed` |
   | `unsubscribed` | `unsubscribed` | event only |

   Dedupe: `unique_opened` and `opened` both arrive for a first open. Count only `opened`; use
   either to set `opened_at`.

### Phase 4 – settings and webhook registration

9. GraphQL `src/graphql/types/BrevoSetting/BrevoSetting.admin.graphql` + resolvers: `brevoApiKeySet`,
   `brevoWebhookUrl`, `brevoWebhookToken`, `brevoWebhookId`, `brevoTrackingEnabled`.
10. `src/pages/admin/emailSetting/BrevoSetting.tsx` (card in the core area). Its fields are posted
    with the core email settings form; drop an empty `brevoApiKey` in the form's `dataFilter` (core
    plan: the core page must let area components extend the filter, or the card renders the key
    field without a `name` and saves it through its own API; pick the second, simpler option).
11. APIs (private): `src/api/saveBrevoApiKey/`, `src/api/registerBrevoWebhook/` (create with
    `POST /v3/webhooks`, or `PUT /v3/webhooks/{id}` when `brevoWebhookId` exists; events
    `delivered, opened, uniqueOpened, click, softBounce, hardBounce, invalid, spam, blocked, deferred,
    unsubscribed`; `auth: { type: 'bearer', token }`), `src/api/regenerateBrevoWebhookToken/`
    (also updates the Brevo webhook), `src/api/checkBrevoConnection/`.
    Webhook URL: `buildAbsoluteUrl('brevoWebhook')`; refuse to register when it points to `localhost`.

### Phase 5 – docs and tests

12. Plugin `README.md`: setup (API key, verify sender domain, register webhook, select "Brevo" as
    transport), what is tracked, limits on opens, local testing with a tunnel.
13. Unit tests (`node --test dist/`, like `belgian-administration/package.json` `test` script):
    event mapping, token check, payload with array/object, lookup by custom header vs message id.

## Open questions

1. Is open tracking wanted at all for camp emails (privacy)? Opens are tracked by Brevo's pixel and
   can be turned off in the Brevo account. Should the privacy policy mention it?
2. Should click tracking rewrite links in password reset emails? Brevo wraps links; a reset link
   through a tracking domain may look suspicious. Option: send `reset_password` with tracking off
   (Brevo supports per-message tags but not per-message tracking flags in all plans; check).
3. Allowlist Brevo's IP ranges on the webhook as well as the token?
4. If Brevo is down or the key is invalid, fall back to SMTP automatically?
5. Use Brevo templates (managed in Brevo) instead of our own? Recommendation: no; keep templates in
   the app so switching transport doesn't change the content.
6. Do we want bounce handling beyond the log, e.g. flag `customer.email` as invalid after a hard bounce?

## Testing

1. Enable the plugin (`/plugin-management`, restart). Settings > Email shows the Brevo card and
   "Brevo" in the transport list.
2. Save an API key: field is blank after reload, "configured" shows; "Check connection" shows the account.
3. Select Brevo, send a test email: log row `sent`, transport `brevo`, `provider_message_id` filled.
4. Expose the dev server (tunnel), set `shop.homeUrl`, "Register webhook": Brevo shows the webhook
   with bearer auth.
5. Open the test email: `opened_at` and `open_count = 1`; open again: `open_count = 2`, `opened_at` unchanged.
6. Click a link: `clicked_at`, `click_count`, link in the event timeline.
7. Send to a non-existing domain: status `bounced`.
8. POST to the webhook without/with a wrong token: 401, nothing stored. With a token and an unknown
   message id: 200, nothing stored.
9. Batched payload (array) is processed.
10. Disable the plugin and restart: sending falls back to SMTP; old log rows keep their tracking data.
11. Invalid API key: log `failed` with the Brevo error; no exception in checkout.
12. Run the core purge job: events of purged rows are deleted (cascade).

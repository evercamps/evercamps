# Developer Experience Improvements

Ten recommendations to lower the barrier for new contributors.

---

## 1. Finish the TypeScript migration

The conversion is in progress (recent commits show module-by-module conversion) but partial TS is worse than none — devs working in still-JS files get no IDE support and can unknowingly violate contracts defined in the typed modules. Prioritize `lib/webpack/`, `bin/`, and the remaining module `bootstrap.js` files.

## 2. Add typed hook definitions

`addProcessor`, `hookBefore`, and `hookAfter` all accept string keys with no type safety. A new `lib/util/hookTypes.ts` listing every filter and action hook with its argument types gives new devs autocomplete and catches misspelled hook names at compile time — otherwise they have to grep the entire codebase to find what hooks exist.

```typescript
// lib/util/hookTypes.ts
export interface FilterHooks {
  cartFields: CartField[];
  cartItemFields: CartItemField[];
  configurationSchema: Record<string, any>;
  paymentMethods: PaymentMethod[];
  orderStatuses: StatusMap;
}

export interface ActionHooks {
  changePaymentStatus: [orderId: string, newStatus: string];
  placeOrder: [cartId: string];
  createCustomer: [customerData: Record<string, any>];
  login: [email: string];
}
```

## 3. Add a dev setup guide

The onboarding path is invisible. The Webpack custom loaders (AreaLoader, LayoutLoader, TailwindLoader), the bootstrap lifecycle, the `src/ → dist/` compile step for themes/extensions, and the DB migration runner are all non-obvious and undocumented together. A single `CONTRIBUTING.md` covering "how the area system works," "how to add a module," and "how to run the dev server from scratch" would save new devs days.

## 4. Docker Compose for the database

PostgreSQL is a hard dependency with no setup automation. A `docker-compose.yml` that spins up Postgres with the right credentials (matching `config/local.json`) reduces onboarding from "figure out how to install and configure Postgres" to `docker-compose up -d`.

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: evercamps
      POSTGRES_PASSWORD: evercamps
      POSTGRES_DB: evercamps
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

## 5. Add a test suite

There are no tests in the repo. The hook/registry system (`registry.ts`, `hookable.ts`), DB migrations, and the extension/theme loaders are the riskiest areas to change without coverage. Even 20–30 focused unit tests on these core primitives would give new devs the confidence to refactor without fear of silent breakage.

## 6. Add ESLint + Prettier

No consistent linting config is visible. Without it, every PR from a new contributor introduces style noise, and reviewers spend time on formatting instead of logic. Given the SWC setup, `@typescript-eslint/eslint-plugin` + Prettier with a shared config is a low-effort, high-signal addition.

## 7. A dev-mode area visualizer

The area/sortOrder layout system is the hardest architectural concept to grasp — you can't see which `areaId` slots exist on a given page without reading Webpack output or cross-referencing multiple files. A dev-only React component that renders labeled outlines around each area (toggled by a query param like `?debug-areas=1`) would cut the time to "I understand how layouts work" from hours to minutes.

## 8. Module/extension scaffolding CLI

`packages/evercamps/src/bin/evercamps.js` already exists with CLI commands. Adding a `create-module` command that generates the correct folder structure (`api/`, `pages/admin/`, `pages/frontStore/`, `graphql/`, `bootstrap.ts`, `migration/`) removes the guesswork from "how do I add a feature the right way" and enforces consistency.

## 9. Upgrade React from 17 to 18

React 17 shipped in 2020. React 18 adds concurrent rendering, automatic batching, and `useId` — but more importantly, it's the version the ecosystem (libraries, tooling, docs) now targets. Running 17 means hitting version-specific bugs that were fixed years ago, and many third-party component libraries now require 18+.

## 10. Type the configuration system

`getConfig()` returns `any`, meaning misconfigured keys (wrong path, wrong value type) are silent until runtime. Defining a `Config` interface covering all known keys (`system.theme`, `system.extensions`, `themeConfig.*`, shop settings, etc.) and narrowing `getConfig<T>(key: keyof Config)` would catch a whole class of integration errors at the editor before they ever reach the server.

---

## Suggested order of attack

The highest-leverage starting points are **#2** and **#3** — both are documentation/typing work that pays off immediately for every new dev, with no risk of breaking anything. **#4** and **#6** are small one-time investments with outsized onboarding returns. **#1** and **#10** build on each other and can be parallelized with feature work as modules are touched.

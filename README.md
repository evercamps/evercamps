# EverCamps

<p>
  <a href="https://opensource.org/licenses/GPL-3.0">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License">
  </a>
</p>

## Introduction

EverCamps is an open-source project that aims to provide an easy-to-use and customizable platform for sports camp registrations. Built upon the robust e-commerce solution of [EverShop](https://evershop.io), EverCamps will empower sports organizations, schools, and camps to manage sign-ups, payments, and participant data, all while leveraging the flexibility of an open-source community-driven development approach.

## Why EverCamps?

The primary goal of EverCamps is to fill a gap in the sports registration space by creating a solution that is:

* **Flexible**: Easily customizable to meet the needs of different types of sports camps.
* **User-friendly**: Providing a seamless experience for camp organizers and participants alike.
* **Open-Source**: Freely available to use, modify, and distribute, EverCamps fosters collaboration and innovation within the open-source community.


## Goals for EverCamps

1. **Simplify Registration**
   Provide an intuitive interface for parents and participants to easily sign up for camps, select sessions, and complete payments.

2. **Payment Integration**
   Implement secure payment gateways that support multiple payment methods, including credit cards and PayPal.

3. **Admin Panel**
   A powerful, user-friendly admin dashboard that allows camp organizers to track registrations, manage schedules, and generate reports.

4. **Participant & Registration Management**
   Enable camp organizers to easily view, modify, and contact registered participants.

5. **Customizability**
   Allow customization of camp-specific settings (dates, locations, prices, etc.) with minimal technical know-how. Be able to add plugin to be able to adapt to regional specifications and needs. 

## Target Audience

* **Sports Camp Organizers**: Schools, independent coaches, and sports facilities who need a reliable way to manage camp sign-ups and payments.
* **Digital Agencies**: Agencies looking for an easy solution to registration to offer for their customers.
* **Sport Federations or umbrella organisations**: Be able to export data to those organisations.
* **Open-Source Contributors**: Developers who are interested in contributing to the project, whether through code, bug fixes, or documentation.

## Core Features - TBC

* **Registration Forms**: Customize fields based on camp-specific needs (e.g., skill level, preferences).
* **Automated Confirmation Emails**: After registration, participants automatically receive confirmation with relevant details.
* **Multi-Language Support**: Future enhancements will allow the platform to support multiple languages to cater to diverse audiences.

## Contributing to EverCamps**

Being an open-source project, **EverCamps** thrives on collaboration and community contributions. Whether you're a developer, designer, or user, you can contribute by:

* **Submitting bug reports** and feature requests
* **Contributing code** to enhance the platform
* **Improving documentation** to make it easier for others to get started
* **Testing** the platform and providing valuable feedback

Please refer to our [Contribution Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## Roadmap

1. **Open Source it** (September 2025)

   * Code of conduct
   * Licensing
   * Issue templates
   * Basic Extention: Participant, Registration Entities

2. **Beta Version** (November 2025)

   * Test with first user
   * Basic registration form setup
   * Payment gateway integration
   * Reporting & analytics
   * Multi-language support

3. **1.0 Release** (januari 2026)

   * Fully tested and first life release
   
4. **2.x Releases** (june 2026)
   * Extended management of registrations and participants
   * Extended communication possibilities
   * Report to external contributors (umbrella organisations)

## Project Structure

EverCamps is a fork of [EverShop](https://evershop.io) (Node.js/Express/React/PostgreSQL/GraphQL). The repository is organized as a single app, split into a framework layer and an application/content layer:

```
evercamps/
├── core/                # Application modules: business logic, admin & storefront pages, GraphQL, migrations
│   ├── modules/            # One folder per domain (auth, camp, catalog, checkout, cms, customer,
│   │                        #   mollie, oms, paypal, promotion, setting, stripe, tax, ...)
│   ├── components/         # Shared React components used across core admin/front-store pages
│   └── .docs/               # Architecture notes and design docs for maintainers
├── includes/              # Framework internals — the engine core/ and plugins run on
│   ├── bin/                  # CLI entry points: dev, build, start, install, user mgmt, extension loading
│   ├── lib/                   # Routing, middleware, hooks/registry, widgets, cron, events, webpack, DB connection
│   ├── components/          # Shared low-level React building blocks (Area, form, grid, list, modal, ...)
│   └── types/                 # Shared TypeScript types
├── content/                # Site-specific, non-framework content (the "wp-content" equivalent)
│   ├── plugins/               # Installable plugins — see content/plugins/README.md
│   ├── themes/                 # Storefront theme overrides
│   ├── translations/            # Locale files
│   └── media/                   # Uploaded media (generated, gitignored)
├── config/                 # default.json / local.json — shop settings + registered plugins (generated, gitignored)
├── dist/                    # Compiled output of core/ + includes/ (generated by `npm run compile`, gitignored)
├── public/                   # Built static assets served by the app (generated, gitignored)
└── .env                       # Database connection info (generated by `npm run setup`, gitignored)
```

A few things worth knowing before you dig in:

- **`core/` and `includes/` are compiled together into one `dist/` folder.** `npm run compile` runs swc over both and merges the output, so anything at runtime (including plugins) reaches framework code via `dist/...`, not the TypeScript sources directly.
- **Plugins never live inside `core/` or `includes/`.** They live in `content/plugins/<name>` and are registered in `config/default.json` under `system.extensions`. See [`content/plugins/README.md`](./content/plugins/README.md) for the full plugin architecture and a guide to writing one.
- **`config/`, `dist/`, `public/`, `.env` and `content/media/` are all generated**, not committed. `npm run setup` creates `.env`; `config/default.json` is created from `includes/bin/install/templates/config.json` (or hand-edited) and holds the `system.extensions` list plugins are registered in.

## Getting Started (Developer Setup)

Prerequisites:

- Node.js 22.x
- npm
- PostgreSQL 13 or higher

Steps:

1. **Install dependencies** (this also installs any plugin workspaces under `content/plugins/*`):
   ```sh
   npm install
   ```
2. **Compile the TypeScript source to `dist/`.** This is required before the next steps — `setup`, `dev`, `build` and `start` all run compiled JS out of `dist/bin/...`:
   ```sh
   npm run compile
   ```
3. **Run the interactive setup wizard.** It asks for your Postgres connection details and an admin user, writes `.env`, and creates the initial database schema + admin user:
   ```sh
   npm run setup
   ```
   > If you're running Postgres via the provided `docker-compose.yml`, set the DB environment variables there instead and skip straight to `npm run start`.
4. **Start the dev server** (webpack dev middleware with hot reload; watches and recompiles `core/`, `includes/` and enabled plugins on change):
   ```sh
   npm run dev
   ```
5. Open the storefront at `http://localhost:3000` and the admin panel at `http://localhost:3000/admin`.

Other useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run build` | Production build (webpack) |
| `npm run start` | Run the production build |
| `npm run start:debug` | Run the production build with `--debug` |
| `npm run test` | Run the Jest unit test suite |
| `npm run lint` | Run ESLint (`--fix`) across the codebase |
| `npm run user:create` | Create an admin user |
| `npm run user:changePassword` | Change an admin user's password |

For contribution workflow (branching, PRs, code of conduct), see [CONTRIBUTING.md](./CONTRIBUTING.md).

**Join Us!**
By contributing to EverCamps, you help create a community-driven, adaptable solution that meets the unique needs of sports camps worldwide. Together, we can make sports camp registration easier, more efficient, and accessible for all.

## License

This project is based on [EverShop](https://github.com/evershopcommerce/evershop), originally licensed under the GNU General Public License v3.0.

Modifications have been made to the original source code. All changes are documented in the [CHANGELOG.md](./changelog.md).

This adapted version is also licensed under the GNU General Public License v3.0. You may redistribute and/or modify it under the terms of the GPLv3.

For full license details, see [LICENSE](./LICENSE).

# Themes are chosen per deployment at build time and styled through tokens first

Each client gets its own evercamps deployment, and the storefront theme is picked with `system.theme` in that deployment's config and compiled into the build. Client themes live in their own (private) repositories and are cloned into `content/themes/<name>` at build time. The public repo ships only core and, at most, a sample theme. A theme changes the look in two layers. First it overrides design tokens: CSS variables for colours, fonts, radius, buttons and logo, which core components and the Tailwind config refer to instead of hard-coded values. Only when tokens are not enough does it override or add React components. We chose this so that a client's look can be swapped by changing one config value and rebuilding, without touching core and without client branding in the open-source repo.

## Considered Options

- **Runtime multi-tenant theming (one platform, theme chosen per domain).** Rejected: webpack aliases and Tailwind are resolved at build time, so this would be a large re-architecture for a need we don't have.
- **Commit client themes in this repo.** Rejected: client branding, logos and copy don't belong in a public open-source repo. A git submodule was also rejected, because it would publish the private theme's URL.
- **Load the client's existing CSS framework (Bootstrap) in the storefront.** Rejected: its reset clashes with Tailwind's and restyles every core component (cart, checkout, account). Reproducing the look with tokens and Tailwind is cheaper.

## Consequences

- Switching theme means a rebuild, not a setting in the admin.
- Core components must use tokens, never hard-coded colours or fonts, otherwise a theme has to override whole components just to change a colour.
- A theme's `tailwind.config.js` extends the default config instead of replacing its `theme` key.
- Client theme folders under `content/themes/` are gitignored; the deploy pipeline must clone them before `npm run build`.

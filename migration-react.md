# React 18 Migration Plan

## Current state

| Package | Current | Target |
|---|---|---|
| `react` | ^17.0.1 | ^18 |
| `react-dom` | ^17.0.1 | ^18 |
| `@types/react` | ^19.1.2 ⚠️ | ^18 |
| `@types/react-dom` | (not declared) | ^18 |

> **Note:** `@types/react` is currently set to 19 while the runtime is 17 — a mismatch that causes incorrect type inference today. This migration also fixes that.

---

## What needs to change

### Breaking changes (must fix)

#### 1. `ReactDOM.render()` → `createRoot()` — 1 file

**File:** `packages/evercamps/src/components/common/react/client/Index.jsx`

```tsx
// BEFORE
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));

// AFTER
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

#### 2. `ReactDOM.hydrate()` → `hydrateRoot()` — 1 file (generated)

**File:** `packages/evercamps/src/bin/lib/buildEntry.js`

This file generates hydration entry code at build time. Update the generated string:

```js
// BEFORE (generated code)
import ReactDOM from 'react-dom';
ReactDOM.hydrate(<App />, document.getElementById('root'));

// AFTER (generated code)
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />);
```

Also check `packages/evercamps/src/components/common/react/client/Hydrate.jsx` — if it contains a standalone hydrate call, update it the same way.

---

### Dependency updates

```json
// package.json (packages/evercamps)
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-toastify": "^9.1.3"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18"
  }
}
```

**Why react-toastify needs an upgrade:**  
v6 was released before React 18's automatic batching and can trigger warnings about state updates outside of act(). v9 is the first version fully compatible with React 18.

**All other dependencies are compatible as-is:**  
`urql` v3, `react-select` v5, `@ckeditor/ckeditor5-react` v5, `@stripe/react-stripe-js` v1.5+ all support React 18.

---

### Recommended improvement (not breaking, do alongside)

#### Switch JSX transform to `react-jsx`

Currently `tsconfig.json` uses `"jsx": "react"`, which requires `import React from 'react'` in every JSX file. React 18 ships with the new JSX transform, which removes this requirement.

**`packages/evercamps/tsconfig.json`:**
```json
// BEFORE
"jsx": "react"

// AFTER
"jsx": "react-jsx"
```

After this change, remove the `import React from 'react'` lines from component files — or leave them in place (they become no-ops, not errors). A codemod can bulk-remove them:

```bash
npx react-codemod update-react-imports packages/evercamps/src
```

---

## Automatic batching — awareness, not a fix

React 18 batches **all** state updates automatically, including those inside `setTimeout`, `Promise.then`, and native event listeners. Previously only React event handlers were batched.

In practice this is a performance improvement, but it can change component behavior if something relied on intermediate re-renders between two `setState` calls in async code.

With 124 `useState` and 78 `useEffect` calls across the codebase, run through the main flows manually after upgrading:
- Cart add / update / remove
- Checkout step transitions
- Alert modal open / close
- Login / logout

If any component needs the old non-batched behavior, wrap it with `flushSync` from `react-dom`:

```tsx
import { flushSync } from 'react-dom';
flushSync(() => setA(1));
flushSync(() => setB(2)); // forces two renders
```

---

## StrictMode double-invoke in development

React 18 `StrictMode` intentionally mounts and unmounts components twice in development to surface missing cleanup in `useEffect`. If the app currently uses `<React.StrictMode>`, you may see effects firing twice during local development — this is expected and does not happen in production.

Check each `useEffect` that creates subscriptions, timers, or external listeners has a proper cleanup return:

```tsx
useEffect(() => {
  const sub = subscribe();
  return () => sub.unsubscribe(); // ← must be present
}, []);
```

---

## Migration steps

1. **Update packages**
   ```bash
   npm install react@^18 react-dom@^18 react-toastify@^9
   npm install -D @types/react@^18 @types/react-dom@^18
   ```

2. **Fix `Index.jsx`** — replace `ReactDOM.render` with `createRoot`

3. **Fix `buildEntry.js`** — update generated hydration code to use `hydrateRoot`

4. **Fix `Hydrate.jsx`** — if it contains a standalone `ReactDOM.hydrate` call, update it

5. **Switch JSX transform** — update `tsconfig.json` + run codemod (optional but recommended)

6. **Run the app locally** — check browser console for React 18 migration warnings

7. **Smoke test main flows** — cart, checkout, auth, camp registration

8. **Check react-toastify** — verify notifications still trigger correctly after the v6 → v9 upgrade (the API changed slightly; see the [v7→v9 migration guide](https://fkhadra.github.io/react-toastify/migration-v9))

---

## Verification checklist

- [ ] No `ReactDOM.render` calls remain (`grep -r "ReactDOM.render" src/`)
- [ ] No `ReactDOM.hydrate` calls remain (`grep -r "ReactDOM.hydrate" src/`)
- [ ] Browser console shows no React deprecation warnings
- [ ] Cart → checkout → order creation flow works end-to-end
- [ ] Toast notifications appear correctly
- [ ] Admin panel loads without errors
- [ ] Hot reload still works in development

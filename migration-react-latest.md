# React 19 Migration Plan (from React 18)

Latest stable: **19.2.7** (released June 1, 2026)

> This document covers the migration from React 18. Complete `migration-react.md` first.

---

## Good news first

`@types/react` is already pinned to `^19.1.2` in `packages/evercamps/package.json`, so TypeScript types are already aligned. Most React 19 breaking changes are deprecations with warnings rather than hard errors.

---

## Dependency update

```bash
npm install react@^19 react-dom@^19
npm install react-toastify@^10
```

`@types/react` and `@types/react-dom` stay at `^19`.

**react-toastify:** v6 → v10 is a large jump. The toast API changed in v7+ (auto-close default, positioning, theme). Review the [v10 migration guide](https://fkhadra.github.io/react-toastify/migration-to-v10) and test all notification flows after upgrading.

---

## Breaking changes

### 1. `defaultProps` on function components removed — 161 occurrences

React 19 removes support for `defaultProps` on function components (class components are unaffected). Convert to ES6 default parameter destructuring.

**Pattern to apply across all affected components:**

```tsx
// BEFORE
function Button({ label, disabled, variant }) { ... }
Button.defaultProps = { disabled: false, variant: 'primary' };

// AFTER
function Button({ label, disabled = false, variant = 'primary' }) { ... }
```

**Affected files (sample):**
`Button.jsx`, `Badge.jsx`, `Editor.jsx`, `Link.jsx`, form fields (`Checkbox.jsx`, `Date.jsx`, `Input.jsx`, `Select.jsx`), grid components (`Action.jsx`, `Pagination.jsx`, `Sortable.jsx`) — 161 total.

Run this to find all of them:
```bash
grep -rl "\.defaultProps\s*=" packages/evercamps/src/components/
```

---

### 2. `propTypes` runtime checking removed from React core — 361 files

React 19 no longer runs `propTypes` checks internally. The `prop-types` npm package still works as a standalone library, so **this is not a hard error** — your existing `import PropTypes from 'prop-types'` imports continue to function. However, the dev-mode warnings will silently stop in a future patch if the package is not called explicitly.

**Recommended path** (aligns with the ongoing TypeScript migration):

For any component being converted to `.tsx` as part of the TS migration, drop the `propTypes` block and rely on TypeScript interface props instead. Don't mass-remove propTypes from `.jsx` files — let the TS migration absorb them gradually.

For any `.jsx` file that is not yet being migrated, leave propTypes as-is. They cause no errors.

```tsx
// Once migrated to .tsx — replace propTypes with an interface
interface ButtonProps {
  label: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

function Button({ label, disabled = false, variant = 'primary' }: ButtonProps) { ... }
// No .propTypes block needed
```

---

## Deprecations (warnings, not errors)

### 3. `forwardRef` deprecated — 6 files

`ref` is now a plain prop in React 19. `forwardRef` still works but logs a deprecation warning. All 6 affected files are form field components in `src/components/common/form/fields/`.

```tsx
// BEFORE
const Input = forwardRef<HTMLInputElement, InputProps>(({ value, onChange }, ref) => (
  <input ref={ref} value={value} onChange={onChange} />
));

// AFTER
function Input({ value, onChange, ref }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} value={value} onChange={onChange} />;
}
```

Files to update:
- `src/components/common/form/fields/Date.jsx`
- `src/components/common/form/fields/DateTime.jsx`
- `src/components/common/form/fields/Input.jsx`
- `src/components/common/form/fields/MultiSelect.jsx`
- `src/components/common/form/fields/Password.jsx`
- `src/components/common/form/fields/Select.jsx`

---

### 4. `<Context.Provider>` deprecated — 19 occurrences

React 19 allows rendering `<Context>` directly. `<Context.Provider>` still works but is deprecated.

```tsx
// BEFORE
<CheckoutContext.Provider value={state}>
  {children}
</CheckoutContext.Provider>

// AFTER
<CheckoutContext value={state}>
  {children}
</CheckoutContext>
```

Affected context files:
- `src/components/admin/auth/AuthContext.jsx`
- `src/components/common/context/app.jsx`
- `src/components/common/context/checkout.jsx`
- `src/components/common/context/checkoutSteps.jsx`
- `src/components/common/form/Form.jsx`
- `src/components/common/modal/Alert.jsx`

---

## New React 19 features worth adopting

These are optional but reduce boilerplate for new features:

### `use()` — read context or promises inline

```tsx
// Instead of useContext(ThemeContext):
const theme = use(ThemeContext);

// Or suspend on a promise:
const data = use(fetchDataPromise);
```

Useful for any component that fetches async data and currently uses `useEffect` + `useState` for loading state.

### `useActionState()` — form submit state management

Replaces the common `loading/error` useState pattern around form submissions:

```tsx
const [state, submitAction, isPending] = useActionState(
  async (prevState, formData) => {
    const result = await saveParticipant(formData);
    return result;
  },
  null
);
```

Good fit for: checkout forms, participant forms, admin CRUD forms.

### `useOptimistic()` — optimistic UI updates

```tsx
const [optimisticCart, addOptimistic] = useOptimistic(
  cart,
  (state, newItem) => ({ ...state, items: [...state.items, newItem] })
);
```

Good fit for: cart add/remove interactions where instant feedback matters.

### `useFormStatus()` — access parent form pending state

```tsx
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>Submit</button>;
}
```

Replaces manually threading `isSubmitting` props through form components.

### Document metadata hoisting

React 19 hoists `<title>`, `<meta>`, and `<link>` tags to `<head>` automatically — no more manual `document.title` in effects:

```tsx
function CampPage({ camp }) {
  return (
    <>
      <title>{camp.name} — EverCamps</title>
      <meta name="description" content={camp.description} />
      {/* page content */}
    </>
  );
}
```

The `Head.jsx` component (which currently uses a portal to render into `<head>`) can likely be replaced with this pattern.

---

## Migration order

Given the codebase size, spread the work across the TS migration phases:

| Priority | Task | Effort | Notes |
|---|---|---|---|
| **Must** | Bump `react` + `react-dom` to `^19` | — | |
| **Must** | Upgrade `react-toastify` v6 → v10 | Medium | API changes, test all toast calls |
| **Must** | Convert `defaultProps` → ES6 defaults | High | 161 files, scriptable with codemod |
| Deprecation | Remove `forwardRef` from 6 form fields | Low | |
| Deprecation | Update `<Context.Provider>` → `<Context>` | Low | 6 files |
| Gradual | Replace `propTypes` with TS types | High | Absorb into TS migration, not a blocker |
| Optional | Adopt `useActionState` in forms | Medium | New features, not migration |
| Optional | Replace `Head.jsx` portal with native hoisting | Low | |

---

## Verification checklist

```bash
# No remaining defaultProps on function components
grep -rn "\.defaultProps\s*=" packages/evercamps/src/ --include="*.jsx" --include="*.tsx"

# No remaining forwardRef (after conversion)
grep -rn "forwardRef" packages/evercamps/src/

# No remaining Context.Provider (after conversion)
grep -rn "\.Provider>" packages/evercamps/src/
```

- [ ] App builds without TypeScript errors (`tsc --noEmit`)
- [ ] No React deprecation warnings in browser console
- [ ] Toast notifications work (react-toastify v10 API)
- [ ] All 6 form fields accept `ref` prop correctly
- [ ] Context values propagate correctly after Provider → Context rename
- [ ] Cart, checkout, auth, camp registration flows work end-to-end

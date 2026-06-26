# TypeScript Types Organization Analysis & Recommendations

## Executive Summary

Found **10+ critical duplications** across the codebase, with types defined in 2–4 locations each. The biggest pain points are in the checkout and catalog modules where `Price`, `CartItem`, `CartItemRegistration`, and `ParticipantCheckoutField` are duplicated across component and module boundaries.

**Rules applied:**
- `src/modules/<module_name>/types/` — types used by multiple files within the same module
- `src/types/` — types used across multiple modules or shared globally
- Component file — types only used by one component, stay local

---

## Critical Duplications (High Priority)

### 1. `SelectOption` — duplicated 3×

| File | Line |
|------|------|
| `src/components/common/form/Field.tsx` | 34 |
| `src/components/common/form/fields/Select.tsx` | 6 |
| `src/components/common/form/fields/MultiSelect.tsx` | 6 |

**Definition:** `{ value: string | number; text: string }`

**Move to:** `src/types/form.ts`
**Why:** Used across multiple form components in the shared component library.

---

### 2. `ValidationRule` — duplicated 2×

| File | Line |
|------|------|
| `src/components/common/form/Field.tsx` | 32 |
| `src/components/common/form/Form.tsx` | 9 |

**Definition:** `string | { rule: string; message?: string }`

**Move to:** `src/types/form.ts`
**Why:** Core form validation type shared across form infrastructure.

---

### 3. `Price` — duplicated 2×

| File | Line |
|------|------|
| `src/modules/checkout/pages/frontStore/cart/ShoppingCart.tsx` | 9 |
| `src/components/frontStore/checkout/cart/items/Items.tsx` | 14 |

**Definition:** `{ value: number; text: string }`

**Move to:** `src/types/checkout.ts`
**Why:** Checkout domain type used across a module page and a component.

---

### 4. `CartItem` — duplicated 2× (nearly identical)

| File | Line |
|------|------|
| `src/modules/checkout/pages/frontStore/cart/ShoppingCart.tsx` | 22 |
| `src/components/frontStore/checkout/cart/items/Items.tsx` | 29 |

**Move to:** `src/types/checkout.ts`
**Why:** Cross-boundary checkout domain type — module page + component. Central to cart representation.

---

### 5. `CartItemRegistration` — duplicated 2× (different scopes)

| File | Version |
|------|---------|
| `src/modules/checkout/pages/frontStore/cart/ShoppingCart.tsx` | Minimal (no IDs) |
| `src/components/frontStore/checkout/cart/items/Items.tsx` | Extended (with IDs + API endpoints) |
| `src/modules/checkout/services/cart/Cart.ts` | Backend (`CartItemRegistrationData`, numeric IDs) |

**Move frontend version to:** `src/types/checkout.ts`
**Keep backend version in:** `src/modules/checkout/services/cart/Cart.ts` (internal)
**Why:** Frontend needs string IDs and API endpoints; backend uses numeric IDs. Separate concerns.

```typescript
// src/types/checkout.ts
export interface CartItemRegistration {
  cartItemRegistrationId: string;
  cartItemId: string;
  firstName: string;
  lastName: string;
  extraData?: string;
  editApi: string;
  removeApi: string;
}
```

---

### 6. `ParticipantCheckoutField` — duplicated 5× (critical)

| File | Version |
|------|---------|
| `src/modules/checkout/services/orderCreator.ts` | Minimal backend (`code`, `useForUniqueness`) |
| `src/modules/catalog/pages/frontStore/productView/Form.tsx` | Full frontend |
| `src/modules/catalog/pages/frontStore/productView/ParticipantForm.tsx` | Full frontend |
| `src/components/frontStore/checkout/cart/items/Items.tsx` | Full frontend |
| `src/components/frontStore/checkout/cart/items/EditParticipantForm.tsx` | Full frontend |

**Move frontend version to:** `src/types/checkout.ts`
**Keep backend minimal in:** `src/modules/checkout/services/orderCreator.ts`
**Why:** 4 identical frontend definitions across 2 modules — worst duplication in the codebase.

```typescript
// src/types/checkout.ts
export interface ParticipantCheckoutField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
}
```

---

### 7. `Setting` — duplicated 3× (varying scope)

| File | Fields included |
|------|----------------|
| `src/modules/catalog/pages/frontStore/productView/Form.tsx` | `participantCheckoutFields?` only |
| `src/components/frontStore/checkout/cart/items/Items.tsx` | `priceIncludingTax`, `participantCheckoutFields?` |
| `src/modules/checkout/pages/frontStore/cart/ShoppingCart.tsx` | `priceIncludingTax`, `participantCheckoutFields?` |

**Rename and move to:** `src/types/checkout.ts` as `CheckoutSetting`
**Why:** "Setting" is too generic a name; these are all checkout configuration fields.

```typescript
// src/types/checkout.ts
export interface CheckoutSetting {
  priceIncludingTax: boolean;
  participantCheckoutFields?: string;
}
```

The catalog `Form.tsx` can either use `CheckoutSetting` or a local `Pick<CheckoutSetting, 'participantCheckoutFields'>`.

---

### 8. `PaymentMethod` — conflicting definitions

| File | Definition |
|------|-----------|
| `src/components/common/context/checkout.tsx` | Generic `{ [key: string]: unknown }` |
| `src/modules/checkout/services/getAvailablePaymentMethos.ts` | Concrete `PaymentMethodInfo` / `PaymentMethodFactory` |

**Recommendations:**
- Rename the context version to `PaymentMethodOption`, move to `src/types/checkout.ts`
- Move `PaymentMethodInfo` and `PaymentMethodFactory` to `src/modules/checkout/types/index.ts`
**Why:** The context uses a loose runtime shape; the service uses typed factories. They are different concerns.

---

## Already Well-Organized

| Type | Location | Status |
|------|----------|--------|
| `Step` | `src/components/common/context/checkoutSteps.tsx` (exported) | ✅ Correct — imported by checkout context |
| DB row types | `src/modules/*/types/` directories | ✅ Correct |
| `MollieConfig`, `molliePaymentStatus` | `src/modules/mollie/types/` | ✅ Correct |

---

## Target File Structure

### `src/types/form.ts` (new)
```typescript
export type SelectOption = { value: string | number; text: string };
export type ValidationRule = string | { rule: string; message?: string };
```

### `src/types/checkout.ts` (new)
```typescript
export interface Price {
  value: number;
  text: string;
}

export interface CartItemRegistration {
  cartItemRegistrationId: string;
  cartItemId: string;
  firstName: string;
  lastName: string;
  extraData?: string;
  editApi: string;
  removeApi: string;
}

export interface CartItem {
  cartItemId: string;
  thumbnail?: string;
  qty: number;
  productName: string;
  productSku: string;
  variantOptions?: string;
  productCustomOptions?: string;
  productUrl: string;
  productPrice: Price;
  productPriceInclTax: Price;
  finalPrice: Price;
  finalPriceInclTax: Price;
  lineTotal: Price;
  lineTotalInclTax: Price;
  removeApi: string;
  updateQtyApi: string;
  manageRegistrations?: number;
  registrations: CartItemRegistration[];
  errors: string[];
}

export interface ParticipantCheckoutField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
}

export interface CheckoutSetting {
  priceIncludingTax: boolean;
  participantCheckoutFields?: string;
}

export interface PaymentMethodOption {
  [key: string]: unknown;
}
```

### `src/modules/checkout/types/index.ts` (create if missing)
```typescript
export interface PaymentMethodInfo {
  methodCode: string;
  methodName: string;
  meta?: Record<string, unknown>;
}

export interface PaymentMethodFactory {
  init: () => PaymentMethodInfo | Promise<PaymentMethodInfo>;
  validator?: () => boolean | Promise<boolean>;
}

// Backend-only
export interface CartItemRegistrationData {
  cartItemRegistrationId: number;
  cartItemId: number;
  firstName: string;
  lastName: string;
  extraData: string | null;
}
```

---

## Files Requiring Changes

| File | Change | Priority |
|------|--------|----------|
| `src/components/common/form/Field.tsx` | Remove local `SelectOption`, `ValidationRule` → import from `src/types/form` | High |
| `src/components/common/form/fields/Select.tsx` | Remove local `SelectOption` → import from `src/types/form` | High |
| `src/components/common/form/fields/MultiSelect.tsx` | Remove local `SelectOption` → import from `src/types/form` | High |
| `src/components/common/form/Form.tsx` | Remove local `ValidationRule` → import from `src/types/form` | High |
| `src/modules/checkout/pages/frontStore/cart/ShoppingCart.tsx` | Remove `Price`, `CartItem`, `CartItemRegistration`, `Setting` → import from `src/types/checkout` | High |
| `src/components/frontStore/checkout/cart/items/Items.tsx` | Remove `Price`, `CartItem`, `CartItemRegistration`, `ParticipantCheckoutField`, `Setting` → import from `src/types/checkout` | High |
| `src/components/frontStore/checkout/cart/items/EditParticipantForm.tsx` | Remove `ParticipantCheckoutField` → import from `src/types/checkout` | High |
| `src/modules/catalog/pages/frontStore/productView/Form.tsx` | Remove `ParticipantCheckoutField`, `Setting` → import from `src/types/checkout` | High |
| `src/modules/catalog/pages/frontStore/productView/ParticipantForm.tsx` | Remove `ParticipantCheckoutField` → import from `src/types/checkout` | High |
| `src/components/common/context/checkout.tsx` | Rename `PaymentMethod` → `PaymentMethodOption`, import from `src/types/checkout` | Medium |
| `src/modules/checkout/services/getAvailablePaymentMethos.ts` | Move `PaymentMethodInfo`, `PaymentMethodFactory` → `src/modules/checkout/types/index.ts` | Medium |

---

## Modules Without Type Directories (Candidates for Creation)

- `src/modules/catalog/types/` — could hold catalog domain types (product, attribute, category shapes)
- `src/modules/camp/types/` — could hold camp/registration domain types
- `src/modules/cod/types/` — currently no types folder; minimal surface area so low priority

---

## Implementation Order

**Phase 1 — Eliminate cross-module duplication (highest ROI):**
1. Create `src/types/form.ts` and `src/types/checkout.ts`
2. Update the 9 files listed above to import from those files
3. Delete the now-redundant local definitions

**Phase 2 — Module-level cleanup:**
1. Create `src/modules/checkout/types/index.ts` for service types
2. Move `PaymentMethodInfo`, `PaymentMethodFactory`, `CartItemRegistrationData` there

**Phase 3 — Future:**
1. Introduce `src/modules/catalog/types/` for product/attribute types
2. Audit remaining `any` usages and replace with proper interfaces

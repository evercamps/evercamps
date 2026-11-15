import { Card } from '@components/admin/cms/Card';
import { Checkbox } from '@components/form/fields/Checkbox';
import { Input } from '@components/form/fields/Input';
import { Select } from '@components/form/fields/Select';
import '@components/form/fields/Toggle.scss';
import { useAlertContext } from '@components/modal/Alert';
import { useModal } from '@components/modal/useModal';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

// "Variants" card on the product edit page: list, add, edit and delete the
// product's variants (product_variant), e.g. the weeks/seasons of a camp.
// Adding/editing happens in a modal; a variant can be enabled/disabled
// straight from the list.
//
// The whole edit page is one <form> (the product form), so the inputs here
// have no `name` and every button is type="button": nothing in this card is
// posted with the product; it talks to its own API routes instead.

interface Option {
  attributeOptionId: number;
  optionText: string;
  startDate?: string | null;
  endDate?: string | null;
  // false = inactive option (e.g. a camp week of a past season)
  status: boolean;
}

type OptionFilter = 'active' | 'inactive' | 'all';

interface VariantAttribute {
  attributeId: number;
  attributeCode: string;
  attributeName: string;
  options: Option[];
}

interface VariantOption {
  attributeId: number;
  attributeName: string;
  optionId: number;
  optionText: string;
}

interface Variant {
  productVariantId: number;
  uuid: string;
  sku: string;
  title: string | null;
  price: { value: number; text: string };
  isDefault: boolean;
  status: boolean;
  totalSeats: number | null;
  usageCount: number;
  updateApi: string;
  deleteApi: string;
  options: VariantOption[];
}

interface Draft {
  sku: string;
  title: string;
  price: string;
  totalSeats: string;
  isDefault: boolean;
  status: boolean;
  // attributeId -> optionId ('' = none)
  options: Record<number, string>;
}

const VariantsQuery = `
  query Query($id: ID) {
    product(id: $id) {
      sku
      price {
        regular {
          value
        }
      }
      createVariantApi
      variantAttributeGroup {
        groupId
        groupName
      }
      variantAttributes {
        attributeId
        attributeCode
        attributeName
        options {
          attributeOptionId
          optionText
          startDate
          endDate
          status
        }
      }
      variants {
        productVariantId
        uuid
        sku
        title
        price {
          value
          text
        }
        isDefault
        status
        totalSeats
        usageCount
        updateApi
        deleteApi
        options {
          attributeId
          attributeName
          optionId
          optionText
        }
      }
    }
  }
`;

function emptyDraft(): Draft {
  return { sku: '', title: '', price: '', totalSeats: '0', isDefault: false, status: true, options: {} };
}

function draftFromVariant(variant: Variant): Draft {
  return {
    sku: variant.sku,
    title: variant.title ?? '',
    price: String(variant.price?.value ?? ''),
    totalSeats: String(variant.totalSeats ?? 0),
    isDefault: variant.isDefault,
    status: variant.status !== false,
    options: Object.fromEntries(variant.options.map((o) => [o.attributeId, String(o.optionId)]))
  };
}

function payloadFromDraft(draft: Draft) {
  return {
    sku: draft.sku,
    title: draft.title || null,
    price: draft.price === '' ? 0 : draft.price,
    total_seats: draft.totalSeats === '' ? 0 : draft.totalSeats,
    is_default: draft.isDefault,
    status: draft.status,
    options: Object.entries(draft.options)
      .filter(([, optionId]) => optionId !== '')
      .map(([attributeId, optionId]) => ({
        attribute_id: parseInt(attributeId, 10),
        option_id: parseInt(optionId, 10)
      }))
  };
}

async function callApi(url: string, method: string, body?: unknown): Promise<boolean> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include'
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    toast.error(json.error?.message || 'Something went wrong');
    return false;
  }
  return true;
}

function variantLabel(variant: Variant): string {
  return variant.title || variant.options.map((o) => o.optionText).join(' / ') || 'Default';
}

function optionPeriod(option: Option): string {
  return option.startDate && option.endDate ? ` (${option.startDate} – ${option.endDate})` : '';
}

// Lowercase, accents removed, everything else that isn't a letter or digit
// becomes "-": "Week 1 zomer 2027" -> "week-1-zomer-2027".
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Title of a new variant, from its chosen options (in attribute order).
function autoTitle(draft: Draft, attributes: VariantAttribute[]): string {
  return attributes
    .map(
      (attribute) =>
        attribute.options.find(
          (option) => String(option.attributeOptionId) === draft.options[attribute.attributeId]
        )?.optionText
    )
    .filter(Boolean)
    .join(' / ');
}

// SKU of a new variant: product SKU + slug of the variant title.
function autoSku(productSku: string, title: string): string {
  const slug = slugify(title);
  if (!slug) return '';
  return productSku ? `${productSku}-${slug}` : slug;
}

// Options shown in a variant's attribute dropdown for the chosen filter. The
// option the variant already has is always kept, so editing a variant never
// silently drops an inactive option.
function visibleOptions(options: Option[], filter: OptionFilter, selected: string): Option[] {
  return options.filter((option) => {
    if (String(option.attributeOptionId) === selected) return true;
    if (filter === 'all') return true;
    return filter === 'active' ? option.status !== false : option.status === false;
  });
}

function VariantForm({
  heading,
  draft,
  setDraft,
  attributes,
  onSave,
  onCancel,
  saving,
  autofill = null
}: {
  heading: string;
  draft: Draft;
  setDraft: (draft: Draft) => void;
  attributes: VariantAttribute[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  // Set when adding a variant: the title is filled in from the chosen options
  // until the user types in it (clearing the field turns it back on), and the
  // SKU is always product SKU + slug of the title. The SKU is never editable
  // here; an existing variant keeps its SKU.
  autofill?: { productSku: string } | null;
}) {
  const titleTouched = React.useRef(false);
  const update = (next: Draft, titleChanged = false) => {
    if (!autofill) {
      setDraft(next);
      return;
    }
    if (titleChanged) {
      titleTouched.current = next.title !== '';
    }
    let result = next;
    if (!titleTouched.current) {
      result = { ...result, title: autoTitle(result, attributes) };
    }
    setDraft({ ...result, sku: autoSku(autofill.productSku, result.title) });
  };

  const [optionFilter, setOptionFilter] = React.useState<OptionFilter>('active');
  const hasInactiveOptions = attributes.some((a) => a.options.some((o) => o.status === false));

  // Same form components as the rest of the product page (Input / Select /
  // Checkbox: label, border, dropdown arrow). They get no `name`, so nothing
  // here is posted with the product form.
  const cell = (key: string, content: React.ReactNode) => <div key={key}>{content}</div>;

  return (
    // The modal is rendered inside the product <form>: Enter in an input would
    // submit the product, so it saves the variant instead.
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
          if (!saving) onSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <Card title={heading}>
        <div className="modal-content">
          <Card.Session>
            {attributes.length > 0 && (
              <div className="flex justify-end mb-4">
                <div className="w-1/3">
                  <Select
                    label="Show options"
                    value={optionFilter}
                    disableDefaultOption
                    placeholder="Show options"
                    options={[
                      { value: 'active', text: 'Active' },
                      { value: 'inactive', text: 'Inactive' },
                      { value: 'all', text: 'All' }
                    ]}
                    onChange={(e) => setOptionFilter(e.target.value as OptionFilter)}
                    instruction={hasInactiveOptions ? undefined : 'No inactive options'}
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {attributes.map((attribute) =>
                cell(
                  `attribute-${attribute.attributeId}`,
                  <Select
                    label={attribute.attributeName}
                    value={draft.options[attribute.attributeId] ?? ''}
                    disableDefaultOption={false}
                    placeholder="—"
                    options={visibleOptions(
                      attribute.options,
                      optionFilter,
                      draft.options[attribute.attributeId] ?? ''
                    ).map((option) => ({
                      value: option.attributeOptionId,
                      text: `${option.optionText}${optionPeriod(option)}${
                        option.status === false ? ' (inactive)' : ''
                      }`
                    }))}
                    onChange={(e) =>
                      update({
                        ...draft,
                        options: { ...draft.options, [attribute.attributeId]: e.target.value }
                      })
                    }
                  />
                )
              )}
              {cell(
                'title',
                <Input
                  label="Title"
                  value={draft.title}
                  placeholder="e.g. Week 1 zomer 2027"
                  instruction={autofill ? 'Filled in from the options' : undefined}
                  onChange={(e) => update({ ...draft, title: e.target.value }, true)}
                />
              )}
              {cell(
                'sku',
                <Input
                  label="SKU"
                  disabled
                  instruction={
                    autofill
                      ? draft.sku
                        ? 'Product SKU + variant title'
                        : 'Choose an option or enter a title'
                      : undefined
                  }
                  value={draft.sku}
                />
              )}
              {cell(
                'price',
                <Input
                  label="Price"
                  value={draft.price}
                  onChange={(e) => update({ ...draft, price: e.target.value })}
                />
              )}
              {cell(
                'seats',
                <Input
                  label="Seats"
                  value={draft.totalSeats}
                  onChange={(e) => update({ ...draft, totalSeats: e.target.value })}
                />
              )}
            </div>
            <div className="mt-4">
              <Checkbox
                label="Default variant (used when no variant is chosen)"
                isChecked={draft.isDefault}
                onChange={(e) => update({ ...draft, isDefault: e.target.checked })}
              />
            </div>
            <div className="mt-2">
              <Checkbox
                label="Enabled (bookable in the shop). A disabled variant keeps its registrations."
                isChecked={draft.status}
                onChange={(e) => update({ ...draft, status: e.target.checked })}
              />
            </div>
          </Card.Session>
        </div>
        <Card.Session>
          <div className="flex justify-end gap-4">
            <button type="button" className="button secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="button primary" disabled={saving} onClick={onSave}>
              {saving ? 'Saving…' : 'Save variant'}
            </button>
          </div>
        </Card.Session>
      </Card>
    </div>
  );
}

// Inline enable/disable switch for a row. Uses the look of the shared Toggle
// field, but not the field itself: that renders a named hidden input, which
// would be posted with the product form.
function StatusToggle({
  enabled,
  busy,
  onToggle
}: {
  enabled: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <a
      href="#"
      role="switch"
      aria-checked={enabled}
      title={enabled ? 'Enabled - click to disable' : 'Disabled - click to enable'}
      className={`toggle ${enabled ? 'enabled' : 'disabled'} ${busy ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        if (!busy) onToggle();
      }}
    >
      <span />
    </a>
  );
}

interface VariantsProps {
  product?: { productId: number } | null;
}

export default function Variants({ product }: VariantsProps) {
  const [result, reexecute] = useQuery({
    query: VariantsQuery,
    variables: { id: product?.productId },
    pause: !product?.productId,
    requestPolicy: 'network-only'
  });
  // 'new' = adding, a uuid = editing that variant (in the modal)
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft());
  const [saving, setSaving] = React.useState(false);
  // uuids of the variants whose status is being saved
  const [toggling, setToggling] = React.useState<string[]>([]);
  const modal = useModal();
  const { openAlert, closeAlert } = useAlertContext();

  if (!product?.productId) {
    return null;
  }

  const data = result.data?.product;
  // Alphabetical by the label shown in the list; numeric-aware, so
  // "Week 2 zomer 2027" comes before "Week 10 zomer 2027".
  const variants: Variant[] = [...(data?.variants ?? [])].sort((a: Variant, b: Variant) =>
    variantLabel(a).localeCompare(variantLabel(b), 'nl', { numeric: true, sensitivity: 'base' })
  );
  const attributes: VariantAttribute[] = data?.variantAttributes ?? [];
  const refresh = () => reexecute({ requestPolicy: 'network-only' });

  const openForm = (target: string, initial: Draft) => {
    setDraft(initial);
    setEditing(target);
    modal.openModal();
  };

  const closeForm = () => {
    modal.closeModal();
  };

  const toggleStatus = async (variant: Variant) => {
    const status = variant.status === false;
    setToggling((current) => [...current, variant.uuid]);
    const ok = await callApi(variant.updateApi, 'PATCH', { status });
    setToggling((current) => current.filter((uuid) => uuid !== variant.uuid));
    if (ok) {
      toast.success(status ? 'Variant enabled' : 'Variant disabled');
      refresh();
    }
  };

  const editingVariant = variants.find((v) => v.uuid === editing);

  const save = async () => {
    setSaving(true);
    const payload = payloadFromDraft(draft);
    const ok =
      editing === 'new'
        ? await callApi(data.createVariantApi, 'POST', payload)
        : editingVariant
          ? await callApi(editingVariant.updateApi, 'PATCH', payload)
          : false;
    setSaving(false);
    if (ok) {
      toast.success('Variant saved');
      closeForm();
      refresh();
    }
  };

  const remove = (variant: Variant) => {
    openAlert({
      heading: `Delete variant ${variant.title || variant.sku}`,
      content: <div>Can&apos;t be undone</div>,
      primaryAction: {
        title: 'Cancel',
        onAction: closeAlert,
        variant: 'primary'
      },
      secondaryAction: {
        title: 'Delete',
        variant: 'critical',
        onAction: async () => {
          closeAlert();
          if (await callApi(variant.deleteApi, 'DELETE')) {
            toast.success('Variant deleted');
            refresh();
          }
        }
      }
    });
  };

  return (
    <Card
      title="Variants"
      actions={[
        {
          name: 'Add variant',
          // New variant: price taken over from the product.
          onAction: () =>
            openForm('new', {
              ...emptyDraft(),
              price:
                data?.price?.regular?.value === undefined || data?.price?.regular?.value === null
                  ? ''
                  : String(data.price.regular.value)
            })
        }
      ]}
    >
      {data?.variantAttributeGroup && (
        <Card.Session title="Attribute group">
          <div>
            <span className="font-semibold">{data.variantAttributeGroup.groupName}</span>
            {attributes.length > 0 && (
              <span className="text-textSubdued">
                {' '}
                – variant attributes: {attributes.map((a) => a.attributeName).join(', ')}
              </span>
            )}
          </div>
          <div className="text-textSubdued text-sm">
            The attribute group decides which attributes the variants can use. Change it in the
            Attributes card and save the product.
          </div>
        </Card.Session>
      )}
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <VariantForm
                heading={
                  editingVariant ? `Edit variant ${variantLabel(editingVariant)}` : 'Add variant'
                }
                draft={draft}
                setDraft={setDraft}
                attributes={attributes}
                onSave={save}
                onCancel={closeForm}
                saving={saving}
                autofill={editing === 'new' ? { productSku: data?.sku ?? '' } : null}
              />
            </div>
          </div>
        </div>
      )}
      <Card.Session>
        {result.fetching && !data && <div>Loading variants…</div>}
        {result.error && <div className="text-critical">Could not load variants.</div>}

        {data && variants.length === 0 && <div>This product has no variants yet.</div>}

        {variants.length > 0 && (
          <table className="listing">
            <thead>
              <tr>
                <th>Variant</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Seats</th>
                <th>Used</th>
                <th>Enabled</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.uuid}>
                  <td>
                    <div>
                      {variantLabel(variant)}
                      {variant.isDefault && (
                        <span className="ml-2 text-xs border border-divider rounded px-1">
                          default
                        </span>
                      )}
                      {variant.status === false && (
                        <span className="ml-2 text-xs border border-critical text-critical rounded px-1">
                          disabled
                        </span>
                      )}
                    </div>
                    {variant.options.length > 0 && (
                      <div className="text-textSubdued text-sm">
                        {variant.options
                          .map((o) => `${o.attributeName}: ${o.optionText}`)
                          .join(' · ')}
                      </div>
                    )}
                  </td>
                  <td>{variant.sku}</td>
                  <td>{variant.price?.text}</td>
                  <td>{variant.totalSeats ?? 0}</td>
                  <td>{variant.usageCount}</td>
                  <td>
                    <StatusToggle
                      enabled={variant.status !== false}
                      busy={toggling.includes(variant.uuid)}
                      onToggle={() => toggleStatus(variant)}
                    />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <a
                      href="#"
                      className="text-interactive hover:underline mr-4"
                      onClick={(e) => {
                        e.preventDefault();
                        openForm(variant.uuid, draftFromVariant(variant));
                      }}
                    >
                      Edit
                    </a>
                    {variant.usageCount === 0 && variants.length > 1 && (
                      <a
                        href="#"
                        className="text-critical hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          remove(variant);
                        }}
                      >
                        Delete
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 20
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      productId
    }
  }
`;

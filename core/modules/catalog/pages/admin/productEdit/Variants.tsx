import { Card } from '@components/admin/cms/Card';
import { useAlertContext } from '@components/modal/Alert';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

// "Variants" card on the product edit page: list, add, edit and delete the
// product's variants (product_variant), e.g. the weeks/seasons of a camp.
//
// The whole edit page is one <form> (the product form), so the inputs here
// have no `name` and every button is type="button": nothing in this card is
// posted with the product; it talks to its own API routes instead.

interface Option {
  attributeOptionId: number;
  optionText: string;
  startDate?: string | null;
  endDate?: string | null;
}

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

function VariantForm({
  draft,
  setDraft,
  attributes,
  onSave,
  onCancel,
  saving
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  attributes: VariantAttribute[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const field = (label: string, input: React.ReactNode) => (
    <div className="form-field-container">
      <label>{label}</label>
      <div className="field-wrapper flex flex-grow">{input}</div>
    </div>
  );

  return (
    <div className="border border-divider rounded p-4 mb-4 bg-[#fafafa]">
      <div className="grid grid-cols-2 gap-4">
        {attributes.map((attribute) =>
          field(
            attribute.attributeName,
            <select
              className="form-field"
              value={draft.options[attribute.attributeId] ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  options: { ...draft.options, [attribute.attributeId]: e.target.value }
                })
              }
            >
              <option value="">—</option>
              {attribute.options.map((option) => (
                <option key={option.attributeOptionId} value={option.attributeOptionId}>
                  {option.optionText}
                  {optionPeriod(option)}
                </option>
              ))}
            </select>
          )
        )}
        {field(
          'Title',
          <input
            className="form-field"
            type="text"
            value={draft.title}
            placeholder="e.g. Week 1 zomer 2027"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        )}
        {field(
          'SKU',
          <input
            className="form-field"
            type="text"
            value={draft.sku}
            onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
          />
        )}
        {field(
          'Price',
          <input
            className="form-field"
            type="number"
            min="0"
            step="0.01"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
        )}
        {field(
          'Seats',
          <input
            className="form-field"
            type="number"
            min="0"
            step="1"
            value={draft.totalSeats}
            onChange={(e) => setDraft({ ...draft, totalSeats: e.target.value })}
          />
        )}
      </div>
      <label className="flex items-center gap-2 mt-4">
        <input
          type="checkbox"
          checked={draft.isDefault}
          onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}
        />
        Default variant (used when no variant is chosen)
      </label>
      <label className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          checked={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.checked })}
        />
        Enabled (bookable in the shop). A disabled variant keeps its registrations.
      </label>
      <div className="flex gap-4 mt-4">
        <button type="button" className="button primary" disabled={saving} onClick={onSave}>
          {saving ? 'Saving…' : 'Save variant'}
        </button>
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
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
  // 'new' = adding, a uuid = editing that variant, null = just the list
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft());
  const [saving, setSaving] = React.useState(false);
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

  const save = async () => {
    setSaving(true);
    const payload = payloadFromDraft(draft);
    const variant = variants.find((v) => v.uuid === editing);
    const ok =
      editing === 'new'
        ? await callApi(data.createVariantApi, 'POST', payload)
        : variant
          ? await callApi(variant.updateApi, 'PATCH', payload)
          : false;
    setSaving(false);
    if (ok) {
      toast.success('Variant saved');
      setEditing(null);
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
          onAction: () => {
            setDraft(emptyDraft());
            setEditing('new');
          }
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
      <Card.Session>
        {result.fetching && !data && <div>Loading variants…</div>}
        {result.error && <div className="text-critical">Could not load variants.</div>}

        {editing === 'new' && (
          <VariantForm
            draft={draft}
            setDraft={setDraft}
            attributes={attributes}
            onSave={save}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        )}

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
                <th />
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) =>
                editing === variant.uuid ? (
                  <tr key={variant.uuid}>
                    <td colSpan={6}>
                      <VariantForm
                        draft={draft}
                        setDraft={setDraft}
                        attributes={attributes}
                        onSave={save}
                        onCancel={() => setEditing(null)}
                        saving={saving}
                      />
                    </td>
                  </tr>
                ) : (
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
                    <td className="text-right whitespace-nowrap">
                      <a
                        href="#"
                        className="text-interactive hover:underline mr-4"
                        onClick={(e) => {
                          e.preventDefault();
                          setDraft(draftFromVariant(variant));
                          setEditing(variant.uuid);
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
                )
              )}
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

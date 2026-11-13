import { OptionPeriodInput, type OptionPeriodValue } from '@components/admin/catalog/OptionPeriodInput';
import { Card } from '@components/admin/cms/Card';
import { useModal } from '@components/modal/useModal';
import React from 'react';
import { toast } from 'react-toastify';

// Imported WooCommerce order lines without a variant, one row per line name
// (services/lineNameMap.ts). WooCommerce sends product_id = 0 for lines of a
// deleted product, so the import can't tell which week was booked; here the
// admin picks product + variant per name. Saving fixes the order lines and
// their registrations and is remembered for the next order import.

interface ProductRef {
  productId: number;
  name: string;
}

interface VariantChoice {
  variantId: number;
  productId: number;
  sku: string;
  title: string | null;
  price: number | null;
  options: string;
}

interface UnmappedLineGroup {
  productName: string;
  lineCount: number;
  orderCount: number;
  registrationCount: number;
  skus: string[];
  unitPrice: number | null;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  orderNumbers: string[];
  product: ProductRef | null;
  year: number | null;
  suggestedVariantId: number | null;
}

interface MappedLineName {
  productName: string;
  product: ProductRef;
  variantId: number;
  variantLabel: string;
  lineCount: number;
  updatedAt: string | null;
}

interface Overview {
  unmapped: UnmappedLineGroup[];
  mapped: MappedLineName[];
  variantsByProduct: Record<number, VariantChoice[]>;
}

interface Apis {
  productsApi: string;
  saveApi: string;
  variantFormApi: string;
  createVariantApi: string;
}

interface Props extends Apis {
  listApi: string;
}

async function getJson(url: string) {
  const response = await fetch(url, { credentials: 'include' });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || 'Something went wrong');
  }
  return json.data;
}

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || 'Something went wrong');
  }
  return json.data;
}

function withQuery(base: string, params: Record<string, string>) {
  const url = new URL(base, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

function formatDay(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : '?';
}

function variantLabel(v: VariantChoice) {
  const name = v.title || v.sku;
  return v.options && !name.includes(v.options) ? `${name} — ${v.options}` : name;
}

/** Product name without the year and " - variation" part: a start for the search. */
function searchHint(lineName: string) {
  return lineName
    .split(/\s[-–]\s/)[0]
    .replace(/[\s\-–]*\b(?:19|20)\d{2}\b/g, '')
    .trim();
}

function ProductPicker({
  productsApi,
  initialTerm,
  onPick
}: {
  productsApi: string;
  initialTerm: string;
  onPick: (product: ProductRef) => void;
}) {
  const [term, setTerm] = React.useState(initialTerm);
  const [results, setResults] = React.useState<ProductRef[]>([]);
  const [searching, setSearching] = React.useState(false);

  const search = async () => {
    if (!term.trim()) return;
    setSearching(true);
    try {
      setResults(await getJson(withQuery(productsApi, { q: term })));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          className="form-field border rounded px-2 py-1 flex-1"
          placeholder="Search product"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              search();
            }
          }}
        />
        <button type="button" className="button secondary" onClick={search} disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="mt-1 border rounded max-h-48 overflow-y-auto">
          {results.map((p) => (
            <li key={p.productId}>
              <button
                type="button"
                className="w-full text-left px-2 py-1 hover:bg-gray-100"
                onClick={() => {
                  setResults([]);
                  onPick(p);
                }}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!searching && results.length === 0 && term && (
        <div className="text-sm text-gray-500 mt-1">Search and pick a product.</div>
      )}
    </div>
  );
}

interface FormOption {
  optionId: number;
  text: string;
  startDate: string | null;
  endDate: string | null;
  dayCount: number | null;
  usedByProduct: boolean;
}

interface FormAttribute {
  attributeId: number;
  name: string;
  code: string;
  type: string;
  usedByProduct: boolean;
  options: FormOption[];
}

interface VariantForm {
  product: { productId: number; name: string; sku: string };
  attributes: FormAttribute[];
  defaults: { price: number | null; totalSeats: number };
  suggestion: {
    attributeId: number | null;
    optionId: number | null;
    newOptionText: string;
    startDate: string | null;
    endDate: string | null;
  };
}

// One attribute of the new variant: an existing option, or a new one (a
// period attribute's new option gets its dates here too).
interface OptionChoice {
  mode: 'existing' | 'new';
  optionId: number | null;
  text: string;
  period: OptionPeriodValue;
}

function slug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function optionLabel(o: FormOption) {
  const dates = o.startDate ? ` (${o.startDate} – ${o.endDate ?? '?'})` : '';
  return `${o.text}${dates}${o.usedByProduct ? ' · has a variant' : ''}`;
}

/**
 * Popup: create the variant a line was booked on, on the chosen product -
 * with a new period option (name + dates) when the week doesn't exist yet -
 * and map the line name to it.
 */
function NewVariantModal({
  product,
  lineName,
  year,
  unitPrice,
  apis,
  onClose,
  onCreated
}: {
  product: ProductRef;
  lineName: string;
  year: number | null;
  unitPrice: number | null;
  apis: Apis;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = React.useState<VariantForm | null>(null);
  // the attributes the variant gets options of
  const [attributeIds, setAttributeIds] = React.useState<number[]>([]);
  const [choices, setChoices] = React.useState<Record<number, OptionChoice>>({});
  const [title, setTitle] = React.useState<string | null>(null); // null = follow the option
  const [sku, setSku] = React.useState<string | null>(null);
  const [price, setPrice] = React.useState('');
  const [seats, setSeats] = React.useState('0');
  const [bookable, setBookable] = React.useState(year === null || year >= new Date().getFullYear());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const params: Record<string, string> = { productId: String(product.productId), lineName };
    if (year) params.year = String(year);
    getJson(withQuery(apis.variantFormApi, params))
      .then((data: VariantForm) => {
        setForm(data);
        const used = data.attributes.filter((a) => a.usedByProduct).map((a) => a.attributeId);
        const ids = used.length > 0 ? used : data.suggestion.attributeId ? [data.suggestion.attributeId] : [];
        setAttributeIds(ids);
        const initial: Record<number, OptionChoice> = {};
        for (const attribute of data.attributes) {
          const suggested = attribute.attributeId === data.suggestion.attributeId;
          const onlyOption = attribute.options.length === 1 ? attribute.options[0].optionId : null;
          initial[attribute.attributeId] = {
            mode: suggested && !data.suggestion.optionId && attribute.type === 'period' ? 'new' : 'existing',
            optionId: suggested ? data.suggestion.optionId : onlyOption,
            text: suggested ? data.suggestion.newOptionText : '',
            period: {
              startDate: suggested ? data.suggestion.startDate ?? '' : '',
              endDate: suggested ? data.suggestion.endDate ?? '' : '',
              dayCount: ''
            }
          };
        }
        setChoices(initial);
        setPrice(String(unitPrice ?? data.defaults.price ?? ''));
        setSeats(String(data.defaults.totalSeats ?? 0));
      })
      .catch((e: Error) => toast.error(e.message));
  }, [product.productId, lineName, year, apis.variantFormApi, unitPrice]);

  if (!form) {
    return (
      <Card title="New variant">
        <Card.Session>Loading…</Card.Session>
      </Card>
    );
  }

  const attributeById = new Map(form.attributes.map((a) => [a.attributeId, a]));
  const periodAttributes = form.attributes.filter((a) => a.type === 'period');
  const update = (attributeId: number, patch: Partial<OptionChoice>) =>
    setChoices({ ...choices, [attributeId]: { ...choices[attributeId], ...patch } });
  const choiceText = (attributeId: number) => {
    const choice = choices[attributeId];
    if (!choice) return '';
    if (choice.mode === 'new') return choice.text;
    return attributeById.get(attributeId)?.options.find((o) => o.optionId === choice.optionId)?.text ?? '';
  };
  // Title / sku follow the period option (else the first attribute) until edited.
  const mainAttributeId =
    attributeIds.find((id) => attributeById.get(id)?.type === 'period') ?? attributeIds[0] ?? null;
  const mainText = mainAttributeId ? choiceText(mainAttributeId) : '';
  const shownTitle = title ?? mainText;
  const shownSku = sku ?? [slug(form.product.sku || form.product.name), slug(mainText)].filter(Boolean).join('-');
  const singleChoice = attributeIds.length === 1 ? choices[attributeIds[0]] : null;
  const usedChoice =
    !!singleChoice &&
    singleChoice.mode === 'existing' &&
    !!attributeById.get(attributeIds[0])?.options.find((o) => o.optionId === singleChoice.optionId)?.usedByProduct;

  const create = async () => {
    setSaving(true);
    try {
      const result = await post(apis.createVariantApi, {
        productId: product.productId,
        lineName,
        sku: shownSku,
        title: shownTitle,
        price,
        totalSeats: seats,
        bookable,
        options: attributeIds.map((attributeId) => {
          const choice = choices[attributeId];
          return choice.mode === 'new'
            ? {
                attributeId,
                newOption: {
                  text: choice.text,
                  startDate: choice.period.startDate,
                  endDate: choice.period.endDate,
                  dayCount: choice.period.dayCount
                }
              }
            : { attributeId, optionId: choice.optionId };
        })
      });
      toast.success(
        `Variant created${result.createdOptionIds.length ? ' (with new option)' : ''}; ` +
          `${result.mapping?.orderItems ?? 0} order line(s) and ${result.mapping?.registrations ?? 0} registration(s) mapped.`
      );
      onCreated();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={`New variant – ${form.product.name}`}>
      <Card.Session>
        <div className="text-textSubdued text-sm mb-4">
          For order line <b>{lineName}</b>. The variant is created on this product and the order
          lines with this name are mapped to it.
        </div>
        {attributeIds.length === 0 && (
          <div className="text-critical mb-4">
            There is no period attribute yet. Create one under Catalog → Attributes first.
          </div>
        )}
        {form.attributes.every((a) => !a.usedByProduct) && periodAttributes.length > 1 && (
          <label className="block mb-4">
            <span className="text-sm">Attribute</span>
            <select
              className="form-field w-full"
              value={attributeIds[0] ?? ''}
              onChange={(e) => setAttributeIds([Number(e.target.value)])}
            >
              {periodAttributes.map((a) => (
                <option key={a.attributeId} value={a.attributeId}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {attributeIds.map((attributeId) => {
          const attribute = attributeById.get(attributeId)!;
          const choice = choices[attributeId];
          return (
            <div key={attributeId} className="mb-4">
              <div className="font-semibold mb-2">{attribute.name}</div>
              <div className="flex gap-4 mb-2 text-sm">
                <label className="flex gap-1 items-center">
                  <input
                    type="radio"
                    checked={choice.mode === 'existing'}
                    onChange={() => update(attributeId, { mode: 'existing' })}
                  />
                  Existing option
                </label>
                <label className="flex gap-1 items-center">
                  <input
                    type="radio"
                    checked={choice.mode === 'new'}
                    onChange={() => update(attributeId, { mode: 'new' })}
                  />
                  New option
                </label>
              </div>
              {choice.mode === 'existing' ? (
                <select
                  className="form-field w-full"
                  value={choice.optionId ?? ''}
                  onChange={(e) =>
                    update(attributeId, { optionId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">— choose option —</option>
                  {attribute.options.map((o) => (
                    <option key={o.optionId} value={o.optionId}>
                      {optionLabel(o)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid gap-2">
                  <input
                    type="text"
                    className="form-field w-full"
                    placeholder="Option name, e.g. Week 1 zomer 2021"
                    value={choice.text}
                    onChange={(e) => update(attributeId, { text: e.target.value })}
                  />
                  {attribute.type === 'period' && (
                    <OptionPeriodInput
                      value={choice.period}
                      required
                      onChange={(period) => update(attributeId, { period })}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {usedChoice && (
          <div className="text-critical text-sm mb-4">
            This product already has a variant with this option: pick it in the variant list instead.
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm">Variant title</span>
            <input className="form-field w-full" value={shownTitle} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm">SKU</span>
            <input className="form-field w-full" value={shownSku} onChange={(e) => setSku(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm">Price{unitPrice !== null ? ` (order line: ${unitPrice})` : ''}</span>
            <input
              className="form-field w-full"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm">Seats</span>
            <input
              className="form-field w-full"
              type="number"
              min="0"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </label>
        </div>
        <label className="flex gap-2 items-center mt-4 text-sm">
          <input type="checkbox" checked={bookable} onChange={(e) => setBookable(e.target.checked)} />
          Bookable in the shop (leave off for past seasons)
        </label>
      </Card.Session>
      <Card.Session>
        <div className="flex justify-end gap-4">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button primary"
            disabled={saving || attributeIds.length === 0 || usedChoice}
            onClick={create}
          >
            {saving ? 'Creating…' : 'Create variant and map'}
          </button>
        </div>
      </Card.Session>
    </Card>
  );
}

/** Product + variant choice for one line name, and the Save button. */
function MappingEditor({
  lineName,
  year,
  unitPrice,
  initialProduct,
  initialVariantId,
  preloadedVariants,
  apis,
  onSaved
}: {
  lineName: string;
  year: number | null;
  unitPrice: number | null;
  initialProduct: ProductRef | null;
  initialVariantId: number | null;
  preloadedVariants: Record<number, VariantChoice[]>;
  apis: Apis;
  onSaved: () => void;
}) {
  const { productsApi, saveApi } = apis;
  const variantModal = useModal();
  const [product, setProduct] = React.useState<ProductRef | null>(initialProduct);
  const [changingProduct, setChangingProduct] = React.useState(!initialProduct);
  const [variants, setVariants] = React.useState<VariantChoice[] | null>(
    initialProduct ? preloadedVariants[initialProduct.productId] ?? null : null
  );
  const [variantId, setVariantId] = React.useState<number | null>(initialVariantId);
  const [useSeason, setUseSeason] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!product || variants) return;
    getJson(withQuery(productsApi, { id: String(product.productId) }))
      .then((data: VariantChoice[]) => setVariants(data))
      .catch((e: Error) => toast.error(e.message));
  }, [product, variants, productsApi]);

  const selected = variants?.find((v) => v.variantId === variantId) ?? null;
  // The chosen week is of another (or no) season than the line's year.
  const seasonDiffers =
    !!selected && year !== null && !`${selected.title ?? ''} ${selected.options}`.includes(String(year));

  const save = async () => {
    if (!product || !variantId) return;
    setSaving(true);
    try {
      const result = await post(saveApi, {
        productName: lineName,
        productId: product.productId,
        variantId,
        season: seasonDiffers && useSeason ? year : null
      });
      toast.success(
        `Mapped: ${result.orderItems} order line(s) and ${result.registrations} registration(s) updated.`
      );
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-2">
      {changingProduct || !product ? (
        <ProductPicker
          productsApi={productsApi}
          initialTerm={product?.name ?? searchHint(lineName)}
          onPick={(p) => {
            setProduct(p);
            setVariants(null);
            setVariantId(null);
            setChangingProduct(false);
          }}
        />
      ) : (
        <div className="flex gap-2 items-center">
          <span className="font-semibold">{product.name}</span>
          <button type="button" className="text-interactive text-sm" onClick={() => setChangingProduct(true)}>
            change
          </button>
        </div>
      )}
      {product && !changingProduct && (
        <div className="flex gap-2 items-center">
          <select
            className="form-field border rounded px-2 py-1 flex-1"
            value={variantId ?? ''}
            onChange={(e) => setVariantId(e.target.value ? Number(e.target.value) : null)}
            disabled={!variants}
          >
            <option value="">{variants ? '— choose variant —' : 'Loading variants…'}</option>
            {(variants ?? []).map((v) => (
              <option key={v.variantId} value={v.variantId}>
                {variantLabel(v)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="text-interactive text-sm whitespace-nowrap"
            onClick={() => variantModal.openModal()}
          >
            + New variant
          </button>
        </div>
      )}
      {product && variantModal.state.showing && (
        <div className={variantModal.className} onAnimationEnd={variantModal.onAnimationEnd}>
          <div className="modal-wrapper flex self-center justify-center items-center" tabIndex={-1} role="dialog">
            <div className="modal">
              <NewVariantModal
                product={product}
                lineName={lineName}
                year={year}
                unitPrice={unitPrice}
                apis={apis}
                onClose={() => variantModal.closeModal()}
                onCreated={() => {
                  variantModal.closeModal();
                  onSaved();
                }}
              />
            </div>
          </div>
        </div>
      )}
      {seasonDiffers && (
        <label className="text-sm flex gap-2 items-center">
          <input type="checkbox" checked={useSeason} onChange={(e) => setUseSeason(e.target.checked)} />
          Book on the {year} version of this week (created when it doesn&apos;t exist)
        </label>
      )}
      <div>
        <button
          type="button"
          className="button primary"
          disabled={!product || !variantId || saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save mapping'}
        </button>
      </div>
    </div>
  );
}

function UnmappedRow({
  group,
  overview,
  apis,
  onSaved
}: {
  group: UnmappedLineGroup;
  overview: Overview;
  apis: Apis;
  onSaved: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <tr className="align-top border-t">
      <td className="py-2 pr-4">
        <div className="font-semibold">{group.productName}</div>
        <div className="text-sm text-gray-500">
          SKU {group.skus.join(', ')} · {formatDay(group.firstOrderAt)} – {formatDay(group.lastOrderAt)}
        </div>
        <button type="button" className="text-interactive text-sm" onClick={() => setOpen(!open)}>
          {open ? 'hide orders' : 'show orders'}
        </button>
        {open && (
          <div className="text-sm mt-1">
            {group.orderNumbers.join(', ')}
            {group.orderCount > group.orderNumbers.length && ` … (+${group.orderCount - group.orderNumbers.length})`}
          </div>
        )}
      </td>
      <td className="py-2 pr-4 whitespace-nowrap">
        {group.lineCount} lines
        <br />
        {group.orderCount} orders
        <br />
        {group.registrationCount} registrations
      </td>
      <td className="py-2" style={{ minWidth: 360 }}>
        {group.suggestedVariantId && (
          <div className="text-sm text-gray-500 mb-1">Suggested variant pre-selected, check before saving.</div>
        )}
        <MappingEditor
          lineName={group.productName}
          year={group.year}
          unitPrice={group.unitPrice}
          initialProduct={group.product}
          initialVariantId={group.suggestedVariantId}
          preloadedVariants={overview.variantsByProduct}
          apis={apis}
          onSaved={onSaved}
        />
      </td>
    </tr>
  );
}

function MappedRow({
  mapping,
  overview,
  apis,
  onSaved
}: {
  mapping: MappedLineName;
  overview: Overview;
  apis: Apis;
  onSaved: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  return (
    <tr className="align-top border-t">
      <td className="py-2 pr-4">{mapping.productName}</td>
      <td className="py-2 pr-4">{mapping.lineCount}</td>
      <td className="py-2" style={{ minWidth: 360 }}>
        {editing ? (
          <MappingEditor
            lineName={mapping.productName}
            year={null}
            unitPrice={null}
            initialProduct={mapping.product}
            initialVariantId={mapping.variantId}
            preloadedVariants={overview.variantsByProduct}
            apis={apis}
            onSaved={() => {
              setEditing(false);
              onSaved();
            }}
          />
        ) : (
          <div className="flex gap-2">
            <span>
              {mapping.product.name} → {mapping.variantLabel}
            </span>
            <button type="button" className="text-interactive text-sm" onClick={() => setEditing(true)}>
              change
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function LineMapping({
  listApi,
  productsApi,
  saveApi,
  variantFormApi,
  createVariantApi
}: Props) {
  const apis: Apis = { productsApi, saveApi, variantFormApi, createVariantApi };
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'product' | 'noProduct'>('all');
  const [search, setSearch] = React.useState('');
  const [version, setVersion] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getJson(listApi));
      setVersion((v) => v + 1);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [listApi]);

  React.useEffect(() => {
    load();
  }, [load]);

  const needle = search.trim().toLowerCase();
  const rows = (overview?.unmapped ?? []).filter(
    (g) =>
      (filter === 'all' || (filter === 'product' ? !!g.product : !g.product)) &&
      (!needle || g.productName.toLowerCase().includes(needle))
  );
  const totalLines = (overview?.unmapped ?? []).reduce((sum, g) => sum + g.lineCount, 0);

  return (
    <div className="main-content-inner">
      <Card>
        <Card.Session title="Imported order lines without a variant">
          <p className="mb-4">
            Order lines of a product or variation that was deleted in WooCommerce come in without a
            variant (and often with sku <code>wc_product_0</code>). Pick the product and variant once
            per line name: the order lines and their registrations are updated, and the next order
            import uses the same choice. Lines without a product have no registrations yet; run the
            order import again after mapping them to create those.
          </p>
          <div className="flex gap-4 items-center mb-4">
            <select
              className="form-field border rounded px-2 py-1"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">All</option>
              <option value="product">Product found</option>
              <option value="noProduct">No product</option>
            </select>
            <input
              type="text"
              className="form-field border rounded px-2 py-1"
              placeholder="Filter on line name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="text-sm text-gray-500">
              {loading
                ? 'Loading…'
                : `${overview?.unmapped.length ?? 0} names, ${totalLines} order lines`}
            </span>
          </div>
          {overview && rows.length === 0 && !loading && <div>Nothing to map.</div>}
          {rows.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th>Line name (WooCommerce)</th>
                  <th>Count</th>
                  <th>Product and variant</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((group) => (
                  <UnmappedRow
                    key={`${version}:${group.productName}`}
                    group={group}
                    overview={overview!}
                    apis={apis}
                    onSaved={load}
                  />
                ))}
              </tbody>
            </table>
          )}
        </Card.Session>
      </Card>
      {overview && overview.mapped.length > 0 && (
        <div className="mt-8">
          <Card>
            <Card.Session title="Mapped line names">
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th>Line name</th>
                    <th>Lines</th>
                    <th>Mapped to</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.mapped.map((mapping) => (
                    <MappedRow
                      key={`${version}:${mapping.productName}`}
                      mapping={mapping}
                      overview={overview}
                      apis={apis}
                      onSaved={load}
                    />
                  ))}
                </tbody>
              </table>
            </Card.Session>
          </Card>
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    listApi: url(routeId: "lineMappingList")
    productsApi: url(routeId: "lineMappingProducts")
    saveApi: url(routeId: "lineMappingSave")
    variantFormApi: url(routeId: "lineMappingVariantForm")
    createVariantApi: url(routeId: "lineMappingCreateVariant")
  }
`;

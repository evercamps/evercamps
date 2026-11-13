import { Card } from '@components/admin/cms/Card';
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

interface Props {
  listApi: string;
  productsApi: string;
  saveApi: string;
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

/** Product + variant choice for one line name, and the Save button. */
function MappingEditor({
  lineName,
  year,
  initialProduct,
  initialVariantId,
  preloadedVariants,
  productsApi,
  saveApi,
  onSaved
}: {
  lineName: string;
  year: number | null;
  initialProduct: ProductRef | null;
  initialVariantId: number | null;
  preloadedVariants: Record<number, VariantChoice[]>;
  productsApi: string;
  saveApi: string;
  onSaved: () => void;
}) {
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
        <select
          className="form-field border rounded px-2 py-1"
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
  productsApi,
  saveApi,
  onSaved
}: {
  group: UnmappedLineGroup;
  overview: Overview;
  productsApi: string;
  saveApi: string;
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
          initialProduct={group.product}
          initialVariantId={group.suggestedVariantId}
          preloadedVariants={overview.variantsByProduct}
          productsApi={productsApi}
          saveApi={saveApi}
          onSaved={onSaved}
        />
      </td>
    </tr>
  );
}

function MappedRow({
  mapping,
  overview,
  productsApi,
  saveApi,
  onSaved
}: {
  mapping: MappedLineName;
  overview: Overview;
  productsApi: string;
  saveApi: string;
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
            initialProduct={mapping.product}
            initialVariantId={mapping.variantId}
            preloadedVariants={overview.variantsByProduct}
            productsApi={productsApi}
            saveApi={saveApi}
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

export default function LineMapping({ listApi, productsApi, saveApi }: Props) {
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
                    productsApi={productsApi}
                    saveApi={saveApi}
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
                      productsApi={productsApi}
                      saveApi={saveApi}
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
  }
`;

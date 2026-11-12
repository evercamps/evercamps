import { Card } from '@components/admin/cms/Card';
import { useAlertContext } from '@components/modal/Alert';
import { useModal } from '@components/modal/useModal';
import React from 'react';
import { toast } from 'react-toastify';
import { FiscalAttestBelcotax, type BelcotaxApis } from '../../../components/admin/FiscalAttestBelcotax.js';

// Admin "Fiscal attests" page (core/.docs/fiscal-attests.md, Phase 7):
// pick an income year, see what would be generated and why registrations are
// blocked, fix amounts and payer splits inline, handle customer split
// requests, then generate the year's attests. Below: the generated fiches,
// PDFs, Belcotax batches and corrections (FiscalAttestBelcotax).

interface Address {
  street?: string;
  postcode?: string;
  city?: string;
  country?: string;
}

interface Payer {
  customerId: number | null;
  fullName: string;
  nationalNumber: string | null;
  address: Address;
  sharePercent: number;
  // admin customer page, when the payer has a customer account
  editUrl?: string | null;
}

interface Issue {
  registrationId: number | null;
  participantName: string;
  severity: 'blocking' | 'warning';
  code: string;
  message: string;
}

interface EditableOption {
  optionId: number;
  attributeName: string;
  optionText: string;
  startDate: string | null;
  endDate: string | null;
  dayCount: number | null;
}

interface RegistrationPreview {
  registrationId: number;
  participantName: string;
  productName: string;
  productEditUrl: string | null;
  label: string;
  period: { startDate: string; endDate: string; days: number } | null;
  editableOptions: EditableOption[];
  amount: number | null;
  amountSource: 'override' | 'order' | 'none';
  suggestedPrice: number | null;
  orderNumber: string | null;
  orderId: number | null;
  excluded: { reason: string; reasonLabel: string; note: string | null; scope: 'order' | 'registration' } | null;
  payers: Payer[];
  splitIsDefault: boolean;
  issues: Issue[];
}

interface Attest {
  key: string;
  child: { firstName: string; lastName: string };
  payer: Payer;
  totalAmount: number;
  totalDays: number;
}

interface PayerRequest {
  registrationId: number;
  participantName: string;
  productName: string;
  current: Payer[];
  requested: Payer[];
}

interface Preview {
  year: number;
  attests: Attest[];
  registrations: RegistrationPreview[];
  issues: Issue[];
  settingsComplete: boolean;
  missingSettings: string[];
  maxDailyRate: number | null;
  existingFinalCount: number;
  blockingCount: number;
  warningCount: number;
  payerRequests: PayerRequest[];
}

interface Props {
  optionPeriodApi: string;
  previewApi: string;
  generateApi: string;
  amountApi: string;
  payersApi: string;
  payerRequestApi: string;
  exclusionApi: string;
  settingsUrl: string;
  belcotax: BelcotaxApis;
}

const FILTERS: { value: string; label: string; test: (r: RegistrationPreview) => boolean }[] = [
  { value: 'all', label: 'All', test: () => true },
  { value: 'blocking', label: 'Blocking issues', test: (r) => r.issues.some((i) => i.severity === 'blocking') },
  { value: 'warnings', label: 'Warnings', test: (r) => r.issues.some((i) => i.severity === 'warning') },
  { value: 'amount', label: 'No amount', test: (r) => r.issues.some((i) => i.code === 'no_amount') },
  { value: 'dates', label: 'No dates', test: (r) => r.issues.some((i) => /dates|no_end_date/.test(i.code)) },
  {
    value: 'national',
    label: 'National number missing',
    test: (r) => r.issues.some((i) => /national_number/.test(i.code))
  },
  { value: 'age', label: 'Age / birth date', test: (r) => r.issues.some((i) => /too_old|turns_14_during|no_birth_date/.test(i.code)) },
  {
    value: 'ok',
    label: 'Ready',
    test: (r) => !r.excluded && !r.issues.some((i) => i.severity === 'blocking') && r.amount !== null
  },
  { value: 'excluded', label: 'Excluded', test: (r) => !!r.excluded }
];

const euro = (value: number | null | undefined) =>
  value === null || value === undefined ? '–' : `€ ${Number(value).toFixed(2)}`;

const formatDate = (value: string) => {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
};

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

function payerLabel(p: Payer) {
  return `${p.fullName || '?'} (${p.sharePercent}%)`;
}

// Popup to set the dates of the camp week (attribute option, e.g. kampweek
// "Week 1 zomer 2026") straight from the overview. The option is shared, so
// every registration on that week gets the dates.
function PeriodModal({
  registration,
  optionPeriodApi,
  onClose,
  onSaved
}: {
  registration: RegistrationPreview;
  optionPeriodApi: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = React.useState(
    registration.editableOptions.map((o) => ({
      ...o,
      startDate: o.startDate ?? '',
      endDate: o.endDate ?? '',
      dayCount: o.dayCount === null ? '' : String(o.dayCount)
    }))
  );
  const [saving, setSaving] = React.useState(false);

  const update = (index: number, patch: Partial<(typeof drafts)[number]>) =>
    setDrafts(drafts.map((x, i) => (i === index ? { ...x, ...patch } : x)));

  const save = async () => {
    setSaving(true);
    try {
      for (const d of drafts) {
        const original = registration.editableOptions.find((o) => o.optionId === d.optionId);
        const unchanged =
          !!original &&
          (original.startDate ?? '') === d.startDate &&
          (original.endDate ?? '') === d.endDate &&
          (original.dayCount === null ? '' : String(original.dayCount)) === d.dayCount;
        if (!unchanged) {
          await post(optionPeriodApi, {
            optionId: d.optionId,
            startDate: d.startDate,
            endDate: d.endDate,
            dayCount: d.dayCount
          });
        }
      }
      toast.success('Dates saved');
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={`Camp week dates – ${registration.productName}`}>
      <Card.Session>
        <div className="text-textSubdued text-sm mb-4">
          These dates belong to the week option itself: every registration on it gets them. Leave
          Days empty to count the weekdays between the dates.
        </div>
        {drafts.map((d, index) => (
          <div key={d.optionId} className="mb-4">
            <div className="font-semibold mb-2">
              {d.attributeName}: {d.optionText}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <label className="block">
                <span className="text-sm">Start date</span>
                <input
                  className="form-field w-full"
                  type="date"
                  value={d.startDate}
                  onChange={(e) => update(index, { startDate: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm">End date</span>
                <input
                  className="form-field w-full"
                  type="date"
                  value={d.endDate}
                  onChange={(e) => update(index, { endDate: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm">Days</span>
                <input
                  className="form-field w-full"
                  type="number"
                  min="1"
                  placeholder="Auto"
                  value={d.dayCount}
                  onChange={(e) => update(index, { dayCount: e.target.value })}
                />
              </label>
            </div>
          </div>
        ))}
      </Card.Session>
      <Card.Session>
        <div className="flex justify-end gap-4">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save dates'}
          </button>
        </div>
      </Card.Session>
    </Card>
  );
}

function AmountCell({
  registration,
  amountApi,
  onSaved
}: {
  registration: RegistrationPreview;
  amountApi: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(
    String(registration.amount ?? registration.suggestedPrice ?? '')
  );

  const save = async (amount: number | null) => {
    try {
      await post(amountApi, { registrationId: registration.registrationId, amount });
      toast.success('Amount saved');
      setEditing(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!editing) {
    return (
      <div>
        <div>{euro(registration.amount)}</div>
        <div className="text-xs text-textSubdued">
          {registration.amountSource === 'order' && `order ${registration.orderNumber}`}
          {registration.amountSource === 'override' && 'entered by hand'}
          {registration.amountSource === 'none' && 'no amount'}
        </div>
        <a
          href="#"
          className="text-interactive text-xs hover:underline"
          onClick={(e) => {
            e.preventDefault();
            setEditing(true);
          }}
        >
          {registration.amountSource === 'override' ? 'Change' : 'Enter amount'}
        </a>
        {registration.amountSource === 'override' && (
          <a
            href="#"
            className="text-critical text-xs hover:underline ml-2"
            onClick={(e) => {
              e.preventDefault();
              save(null);
            }}
          >
            Remove
          </a>
        )}
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-center">
      <input
        className="form-field w-24"
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="button" className="button primary" onClick={() => save(value === '' ? null : Number(value))}>
        Save
      </button>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setEditing(false);
        }}
      >
        Cancel
      </a>
    </div>
  );
}

const EXCLUSION_REASONS = [
  { value: 'not_belgian', label: 'Not Belgian' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'other', label: 'Other' }
];

// "Don't generate a fiscal attest" for the row's order (all its
// registrations), or for this registration when it has no order.
function ExclusionCell({
  registration,
  exclusionApi,
  onSaved
}: {
  registration: RegistrationPreview;
  exclusionApi: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [reason, setReason] = React.useState('not_belgian');
  const [note, setNote] = React.useState('');
  const target = registration.orderId
    ? { orderId: registration.orderId }
    : { registrationId: registration.registrationId };

  const save = async (excluded: boolean) => {
    try {
      await post(exclusionApi, { ...target, excluded, reason, note });
      toast.success(excluded ? 'Left out of the fiscal attests' : 'Included again');
      setEditing(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (registration.excluded) {
    return (
      <div className="text-xs">
        <div className="text-critical">
          No fiscal attest: {registration.excluded.reasonLabel}
          {registration.excluded.scope === 'order' && registration.orderNumber
            ? ` (order ${registration.orderNumber})`
            : ''}
        </div>
        {registration.excluded.note && <div className="text-textSubdued">{registration.excluded.note}</div>}
        <a
          href="#"
          className="text-interactive hover:underline"
          onClick={(e) => {
            e.preventDefault();
            save(false);
          }}
        >
          Include again
        </a>
      </div>
    );
  }

  if (!editing) {
    return (
      <a
        href="#"
        className="text-textSubdued text-xs hover:underline"
        onClick={(e) => {
          e.preventDefault();
          setEditing(true);
        }}
      >
        {registration.orderId ? "Don't generate for this order" : "Don't generate"}
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-1 mt-1" style={{ minWidth: '12rem' }}>
      <select className="form-field" value={reason} onChange={(e) => setReason(e.target.value)}>
        {EXCLUSION_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <input
        className="form-field"
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2 items-center">
        <button type="button" className="button primary" onClick={() => save(true)}>
          Don&apos;t generate
        </button>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setEditing(false);
          }}
        >
          Cancel
        </a>
      </div>
    </div>
  );
}

function PayersCell({
  registration,
  payersApi,
  onSaved
}: {
  registration: RegistrationPreview;
  payersApi: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [rows, setRows] = React.useState<Payer[]>(registration.payers);

  const save = async (payers: Payer[] | null) => {
    try {
      await post(payersApi, { registrationId: registration.registrationId, payers });
      toast.success('Payers saved');
      setEditing(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!editing) {
    return (
      <div>
        {registration.payers.map((p, i) => (
          <div key={i}>
            {p.editUrl ? (
              <a className="hover:underline" href={p.editUrl} target="_blank" rel="noreferrer">
                {payerLabel(p)}
              </a>
            ) : (
              payerLabel(p)
            )}
          </div>
        ))}
        {registration.payers.length === 0 && <div className="text-textSubdued">–</div>}
        <a
          href="#"
          className="text-interactive text-xs hover:underline"
          onClick={(e) => {
            e.preventDefault();
            setRows(
              registration.payers.length > 1
                ? registration.payers
                : [
                    ...registration.payers.map((p) => ({ ...p, sharePercent: 50 })),
                    { customerId: null, fullName: '', nationalNumber: '', address: {}, sharePercent: 50 }
                  ]
            );
            setEditing(true);
          }}
        >
          {registration.splitIsDefault ? 'Split' : 'Edit split'}
        </a>
        {!registration.splitIsDefault && (
          <a
            href="#"
            className="text-critical text-xs hover:underline ml-2"
            onClick={(e) => {
              e.preventDefault();
              save(null);
            }}
          >
            Reset
          </a>
        )}
      </div>
    );
  }

  const update = (index: number, patch: Partial<Payer>) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-2" style={{ minWidth: '22rem' }}>
      {rows.map((row, index) => (
        <div key={index} className="border border-divider rounded p-2 grid grid-cols-2 gap-2">
          <input
            className="form-field"
            placeholder="Name"
            value={row.fullName}
            onChange={(e) => update(index, { fullName: e.target.value })}
          />
          <input
            className="form-field"
            placeholder="National number"
            value={row.nationalNumber ?? ''}
            onChange={(e) => update(index, { nationalNumber: e.target.value })}
          />
          <input
            className="form-field"
            placeholder="Street"
            value={row.address?.street ?? ''}
            onChange={(e) => update(index, { address: { ...row.address, street: e.target.value } })}
          />
          <div className="flex gap-2">
            <input
              className="form-field w-1/3"
              placeholder="Postcode"
              value={row.address?.postcode ?? ''}
              onChange={(e) => update(index, { address: { ...row.address, postcode: e.target.value } })}
            />
            <input
              className="form-field w-2/3"
              placeholder="City"
              value={row.address?.city ?? ''}
              onChange={(e) => update(index, { address: { ...row.address, city: e.target.value } })}
            />
          </div>
          <div className="flex gap-2 items-center">
            <input
              className="form-field w-20"
              type="number"
              min="1"
              max="100"
              value={row.sharePercent}
              onChange={(e) => update(index, { sharePercent: Number(e.target.value) })}
            />
            %
          </div>
          {rows.length > 1 && (
            <a
              href="#"
              className="text-critical text-xs self-center"
              onClick={(e) => {
                e.preventDefault();
                setRows(rows.filter((_, i) => i !== index));
              }}
            >
              Remove payer
            </a>
          )}
        </div>
      ))}
      <div className="flex gap-4 items-center">
        <a
          href="#"
          className="text-interactive text-xs"
          onClick={(e) => {
            e.preventDefault();
            setRows([...rows, { customerId: null, fullName: '', nationalNumber: '', address: {}, sharePercent: 0 }]);
          }}
        >
          Add payer
        </a>
        <button type="button" className="button primary" onClick={() => save(rows)}>
          Save
        </button>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setEditing(false);
          }}
        >
          Cancel
        </a>
      </div>
    </div>
  );
}

export default function FiscalAttests({
  optionPeriodApi,
  previewApi,
  generateApi,
  amountApi,
  payersApi,
  payerRequestApi,
  exclusionApi,
  settingsUrl,
  belcotax
}: Props) {
  // bumped after every preview load, so the Belcotax section reloads too
  const [version, setVersion] = React.useState(0);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = React.useState<number>(() => {
    if (typeof window === 'undefined') return thisYear;
    const fromUrl = parseInt(new URLSearchParams(window.location.search).get('year') ?? '', 10);
    return fromUrl || thisYear;
  });
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [generating, setGenerating] = React.useState(false);
  const { openAlert, closeAlert } = useAlertContext();
  const periodModal = useModal();
  const [editingPeriod, setEditingPeriod] = React.useState<RegistrationPreview | null>(null);
  const openPeriod = (registration: RegistrationPreview) => {
    setEditingPeriod(registration);
    periodModal.openModal();
  };
  const closePeriod = () => {
    periodModal.closeModal();
    setEditingPeriod(null);
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(previewApi, window.location.origin);
      url.searchParams.set('year', String(year));
      const response = await fetch(url.toString(), { credentials: 'include' });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
        setPreview(null);
      } else {
        setPreview(json.data);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
      setVersion((v) => v + 1);
    }
  }, [previewApi, year]);

  React.useEffect(() => {
    const reload = () => load();
    window.addEventListener('fiscal-attests:changed', reload);
    return () => window.removeEventListener('fiscal-attests:changed', reload);
  }, [load]);

  React.useEffect(() => {
    load();
    const url = new URL(window.location.href);
    url.searchParams.set('year', String(year));
    window.history.replaceState(null, '', url.toString());
  }, [load, year]);

  const generate = () => {
    openAlert({
      heading: `Generate the fiscal attests for ${year}`,
      content: (
        <div>
          {preview?.attests.length} attests will be created with fiche numbers. After this, changes
          need corrections.
        </div>
      ),
      primaryAction: { title: 'Cancel', onAction: closeAlert, variant: 'primary' },
      secondaryAction: {
        title: 'Generate',
        variant: 'interactive',
        isLoading: generating,
        onAction: async () => {
          setGenerating(true);
          try {
            const result = await post(generateApi, { year });
            toast.success(`${result.created} attests generated`);
            closeAlert();
            load();
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setGenerating(false);
          }
        }
      }
    });
  };

  const review = async (registrationId: number, approve: boolean) => {
    try {
      await post(payerRequestApi, { registrationId, approve });
      toast.success(approve ? 'Request approved' : 'Request rejected');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const activeFilter = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
  const rows = (preview?.registrations ?? []).filter(activeFilter.test);
  const totalAmount = (preview?.attests ?? []).reduce((sum, a) => sum + a.totalAmount, 0);
  const notEligible = (preview?.issues ?? []).filter((i) => i.code === 'not_eligible');
  const canGenerate =
    !!preview &&
    preview.existingFinalCount === 0 &&
    preview.settingsComplete &&
    preview.blockingCount === 0 &&
    preview.attests.length > 0;

  return (
    <div className="main-content-inner">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <label htmlFor="fiscal-year">Income year</label>
          <select
            id="fiscal-year"
            className="form-field"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {loading && <span className="text-textSubdued">Loading…</span>}
        </div>
        <div className="flex items-center gap-4">
          <a className="text-interactive hover:underline" href={settingsUrl}>
            Settings
          </a>
          <button type="button" className="button primary" disabled={!canGenerate} onClick={generate}>
            Generate attests for {year}
          </button>
        </div>
      </div>

      {preview && (
        <>
          <div className="grid grid-cols-6 gap-4 mb-6">
            {[
              ['Attests', preview.attests.length],
              ['Total amount', euro(totalAmount)],
              ['Blocking issues', preview.blockingCount],
              ['Warnings', preview.warningCount],
              ['Excluded', preview.registrations.filter((r) => r.excluded).length],
              ['Already generated', preview.existingFinalCount]
            ].map(([label, value]) => (
              <Card key={String(label)}>
                <Card.Session>
                  <div className="text-textSubdued text-sm">{label}</div>
                  <div className="text-2xl font-semibold">{value}</div>
                </Card.Session>
              </Card>
            ))}
          </div>

          {!preview.settingsComplete && (
            <div className="border border-critical rounded p-4 mb-6">
              Fill in the fiscal attest settings first: {preview.missingSettings.join(', ')}.{' '}
              <a className="text-interactive hover:underline" href={settingsUrl}>
                Open settings
              </a>
            </div>
          )}
          {preview.existingFinalCount > 0 && (
            <div className="border border-divider rounded p-4 mb-6">
              The attests for {year} were generated ({preview.existingFinalCount} fiches). PDFs, the
              Belcotax export and corrections are below.
            </div>
          )}
          {preview.maxDailyRate === null && (
            <div className="text-textSubdued mb-6">
              No maximum per day set for {year} (Settings); the "above maximum" check is skipped.
            </div>
          )}

          {preview.payerRequests.length > 0 && (
            <div className="mb-6">
              <Card title="Split requests from parents">
                <Card.Session>
                  <table className="listing">
                    <thead>
                      <tr>
                        <th>Child / camp</th>
                        <th>Now</th>
                        <th>Requested</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {preview.payerRequests.map((request) => (
                        <tr key={request.registrationId}>
                          <td>
                            {request.participantName}
                            <div className="text-xs text-textSubdued">{request.productName}</div>
                          </td>
                          <td>{request.current.map(payerLabel).join(', ') || 'Order customer (100%)'}</td>
                          <td>{request.requested.map(payerLabel).join(', ')}</td>
                          <td className="whitespace-nowrap">
                            <a
                              href="#"
                              className="text-interactive hover:underline mr-4"
                              onClick={(e) => {
                                e.preventDefault();
                                review(request.registrationId, true);
                              }}
                            >
                              Approve
                            </a>
                            <a
                              href="#"
                              className="text-critical hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                review(request.registrationId, false);
                              }}
                            >
                              Reject
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card.Session>
              </Card>
            </div>
          )}

          {notEligible.length > 0 && (
            <div className="mb-6">
              <Card title="Camps not marked eligible">
                <Card.Session>
                  <div className="text-textSubdued mb-2">
                    These registrations have a camp week with dates but the camp isn't marked eligible
                    for a fiscal attest (product → Status → Fiscal attest). They're left out.
                  </div>
                  <ul>
                    {notEligible.map((i) => (
                      <li key={i.registrationId ?? i.message}>
                        {i.participantName}: {i.message}
                      </li>
                    ))}
                  </ul>
                </Card.Session>
              </Card>
            </div>
          )}

          <Card title={`Registrations ${year} (${rows.length})`}>
            <Card.Session>
              <div className="flex gap-2 flex-wrap mb-4">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={`button ${filter === f.value ? 'primary' : 'secondary'}`}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <table className="listing">
                <thead>
                  <tr>
                    <th>Child</th>
                    <th>Camp / week</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Payers</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.registrationId}>
                      <td>{r.participantName}</td>
                      <td>
                        {r.productEditUrl ? (
                          <a className="hover:underline" href={r.productEditUrl} target="_blank" rel="noreferrer">
                            {r.productName}
                          </a>
                        ) : (
                          r.productName
                        )}
                        <div className="text-xs">
                          {r.editableOptions.length > 0 ? (
                            <a
                              href="#"
                              className="text-interactive hover:underline"
                              title="Edit the dates of this week"
                              onClick={(e) => {
                                e.preventDefault();
                                openPeriod(r);
                              }}
                            >
                              {r.label}
                            </a>
                          ) : (
                            <span className="text-textSubdued">{r.label}</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {r.period ? (
                          <>
                            {formatDate(r.period.startDate)} – {formatDate(r.period.endDate)}
                            <div className="text-xs text-textSubdued">{r.period.days} days</div>
                          </>
                        ) : (
                          <div>–</div>
                        )}
                        {r.editableOptions.length > 0 && (
                          <a
                            href="#"
                            className="text-interactive text-xs hover:underline"
                            onClick={(e) => {
                              e.preventDefault();
                              openPeriod(r);
                            }}
                          >
                            {r.period ? 'Edit dates' : 'Set dates'}
                          </a>
                        )}
                      </td>
                      <td>
                        <AmountCell registration={r} amountApi={amountApi} onSaved={load} />
                      </td>
                      <td>
                        <PayersCell registration={r} payersApi={payersApi} onSaved={load} />
                      </td>
                      <td>
                        {r.issues.map((i, index) => (
                          <div
                            key={index}
                            className={`text-xs ${i.severity === 'blocking' ? 'text-critical' : 'text-textSubdued'}`}
                          >
                            {i.severity === 'blocking' ? '● ' : '○ '}
                            {i.message}
                          </div>
                        ))}
                        <ExclusionCell registration={r} exclusionApi={exclusionApi} onSaved={load} />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-textSubdued">
                        No registrations
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card.Session>
          </Card>
        </>
      )}

      <FiscalAttestBelcotax year={year} apis={belcotax} version={version} />

      {periodModal.state.showing && editingPeriod && (
        <div className={periodModal.className} onAnimationEnd={periodModal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <PeriodModal
                registration={editingPeriod}
                optionPeriodApi={optionPeriodApi}
                onClose={closePeriod}
                onSaved={load}
              />
            </div>
          </div>
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
    optionPeriodApi: url(routeId: "saveFiscalAttestOptionPeriod")
    previewApi: url(routeId: "previewFiscalAttests")
    generateApi: url(routeId: "generateFiscalAttests")
    amountApi: url(routeId: "saveFiscalAttestAmount")
    payersApi: url(routeId: "saveFiscalAttestRegistrationPayers")
    payerRequestApi: url(routeId: "reviewFiscalAttestPayerRequest")
    exclusionApi: url(routeId: "saveFiscalAttestExclusion")
    settingsUrl: url(routeId: "fiscalAttestSettings")
    belcotax: fiscalAttestBelcotaxApis {
      overviewApi
      exportApi
      discardApi
      correctionsApi
      pdfApi
      batchXmlApi
      batchStatusApi
    }
  }
`;

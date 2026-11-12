import { Card } from '@components/admin/cms/Card';
import { useAlertContext } from '@components/modal/Alert';
import React from 'react';
import { toast } from 'react-toastify';

// Admin "Fiscal attests" page (core/.docs/fiscal-attests.md, Phase 7):
// pick an income year, see what would be generated and why registrations are
// blocked, fix amounts and payer splits inline, handle customer split
// requests, then generate the year's attests.

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
}

interface Issue {
  registrationId: number | null;
  participantName: string;
  severity: 'blocking' | 'warning';
  code: string;
  message: string;
}

interface RegistrationPreview {
  registrationId: number;
  participantName: string;
  productName: string;
  label: string;
  period: { startDate: string; endDate: string; days: number } | null;
  amount: number | null;
  amountSource: 'override' | 'order' | 'none';
  suggestedPrice: number | null;
  orderNumber: string | null;
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
  previewApi: string;
  generateApi: string;
  amountApi: string;
  payersApi: string;
  payerRequestApi: string;
  settingsUrl: string;
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
  { value: 'age', label: 'Age / birth date', test: (r) => r.issues.some((i) => /too_old|no_birth_date/.test(i.code)) },
  { value: 'ok', label: 'Ready', test: (r) => !r.issues.some((i) => i.severity === 'blocking') && r.amount !== null }
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
          <div key={i}>{payerLabel(p)}</div>
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
  previewApi,
  generateApi,
  amountApi,
  payersApi,
  payerRequestApi,
  settingsUrl
}: Props) {
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
    }
  }, [previewApi, year]);

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
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[
              ['Attests', preview.attests.length],
              ['Total amount', euro(totalAmount)],
              ['Blocking issues', preview.blockingCount],
              ['Warnings', preview.warningCount],
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
              The attests for {year} were generated ({preview.existingFinalCount}). Changes from now
              on need corrections (PDFs, Belcotax and corrections follow in the next stage).
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
                        {r.productName}
                        <div className="text-xs text-textSubdued">{r.label}</div>
                      </td>
                      <td className="whitespace-nowrap">
                        {r.period ? (
                          <>
                            {formatDate(r.period.startDate)} – {formatDate(r.period.endDate)}
                            <div className="text-xs text-textSubdued">{r.period.days} days</div>
                          </>
                        ) : (
                          '–'
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
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    previewApi: url(routeId: "previewFiscalAttests")
    generateApi: url(routeId: "generateFiscalAttests")
    amountApi: url(routeId: "saveFiscalAttestAmount")
    payersApi: url(routeId: "saveFiscalAttestRegistrationPayers")
    payerRequestApi: url(routeId: "reviewFiscalAttestPayerRequest")
    settingsUrl: url(routeId: "fiscalAttestSettings")
  }
`;

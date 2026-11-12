import { Card } from '@components/admin/cms/Card';
import React from 'react';
import { toast } from 'react-toastify';

// Admin, below the attest preview: the year's generated fiches with PDFs,
// Belcotax export / batches, and corrections (core/.docs/fiscal-attests.md,
// Phase 4-6).

import { UUID_PLACEHOLDER } from '../../lib/urlPlaceholder.js';

export interface BelcotaxApis {
  overviewApi: string;
  exportApi: string;
  discardApi: string;
  correctionsApi: string;
  pdfApi: string;
  batchXmlApi: string; // with UUID_PLACEHOLDER
  batchStatusApi: string; // with UUID_PLACEHOLDER
}

interface Fiche {
  uuid: string;
  sequenceNumber: number;
  status: 'final' | 'corrected' | 'cancelled';
  changeType: 'original' | 'modification' | 'addition' | 'cancellation';
  batchId: number | null;
  childName: string;
  payerName: string;
  periods: string[];
  totalAmount: number;
  totalDays: number;
}

interface Batch {
  batchId: number;
  uuid: string;
  kind: string;
  status: 'exported' | 'submitted' | 'accepted' | 'rejected';
  belcotaxReference: string | null;
  createdAt: string;
  submittedAt: string | null;
  ficheCount: number;
  totalAmount: number;
}

interface Overview {
  fiches: Fiche[];
  pendingCount: number;
  batches: Batch[];
}

interface CorrectionLine {
  type: 'modification' | 'addition' | 'cancellation';
  key: string;
  sequenceNumber: number | null;
  childName: string;
  payerName: string;
  oldAmount: number | null;
  newAmount: number | null;
  oldPeriods: string[];
  newPeriods: string[];
}

interface CorrectionPreview {
  canCorrect: boolean;
  reason: string | null;
  lines: CorrectionLine[];
}

const euro = (value: number | null | undefined) =>
  value === null || value === undefined ? '–' : `€ ${Number(value).toFixed(2)}`;

const CHANGE_LABELS: Record<Fiche['changeType'], string> = {
  original: 'Original',
  modification: 'Modification',
  addition: 'Addition',
  cancellation: 'Cancellation'
};

const STATUS_LABELS: Record<Batch['status'], string> = {
  exported: 'Exported (not uploaded yet)',
  submitted: 'Uploaded to Belcotax',
  accepted: 'Accepted',
  rejected: 'Rejected'
};

async function call(url: string, method: 'GET' | 'POST' = 'GET', body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || 'Something went wrong');
  }
  return json.data;
}

function withYear(api: string, year: number) {
  const url = new URL(api, window.location.origin);
  url.searchParams.set('year', String(year));
  return url.toString();
}

function saveFile(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function BatchRow({ batch, apis, onSaved }: { batch: Batch; apis: BelcotaxApis; onSaved: () => void }) {
  const [status, setStatus] = React.useState(batch.status);
  const [reference, setReference] = React.useState(batch.belcotaxReference ?? '');
  const [saving, setSaving] = React.useState(false);
  const changed = status !== batch.status || reference !== (batch.belcotaxReference ?? '');

  const save = async () => {
    if (status === 'rejected' && !window.confirm('Mark as rejected? Its fiches will be exported again with the next batch.')) {
      return;
    }
    setSaving(true);
    try {
      await call(apis.batchStatusApi.replace(UUID_PLACEHOLDER, batch.uuid), 'POST', { status, reference });
      toast.success('Batch saved');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td>#{batch.batchId}</td>
      <td>{new Date(batch.createdAt).toLocaleString('nl-BE')}</td>
      <td className="capitalize">{batch.kind}</td>
      <td>
        {batch.ficheCount} / {euro(batch.totalAmount)}
      </td>
      <td>
        <select
          className="form-field"
          value={status}
          disabled={batch.status === 'rejected'}
          onChange={(e) => setStatus(e.target.value as Batch['status'])}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="form-field"
          placeholder="Belcotax reference"
          value={reference}
          disabled={batch.status === 'rejected'}
          onChange={(e) => setReference(e.target.value)}
        />
      </td>
      <td className="whitespace-nowrap">
        <a className="text-interactive hover:underline mr-3" href={apis.batchXmlApi.replace(UUID_PLACEHOLDER, batch.uuid)}>
          XML
        </a>
        {changed && (
          <button type="button" className="button primary" disabled={saving} onClick={save}>
            Save
          </button>
        )}
      </td>
    </tr>
  );
}

export function FiscalAttestBelcotax({ year, apis, version }: { year: number; apis: BelcotaxApis; version: number }) {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [corrections, setCorrections] = React.useState<CorrectionPreview | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showReplaced, setShowReplaced] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setOverview(await call(withYear(apis.overviewApi, year)));
      setCorrections(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [apis.overviewApi, year]);

  React.useEffect(() => {
    load();
  }, [load, version]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exportXml = (environment: 'test' | 'production') =>
    run(async () => {
      if (
        environment === 'production' &&
        !window.confirm(
          `Export the ${overview?.pendingCount} pending fiche(s) for Belcotax? They are then marked as exported; upload the file in Belcotax-on-web.`
        )
      ) {
        return;
      }
      const result = await call(apis.exportApi, 'POST', { year, environment });
      saveFile(result.xml, result.fileName, 'application/xml');
      toast.success(`${result.ficheCount} fiche(s) exported${environment === 'test' ? ' (test file, nothing changed)' : ''}`);
      await load();
    });

  const discard = () =>
    run(async () => {
      if (!window.confirm('Remove all fiches that were not exported yet? Replaced fiches become current again.')) {
        return;
      }
      const result = await call(apis.discardApi, 'POST', { year });
      toast.success(`${result.discarded} fiche(s) removed`);
      await load();
      window.dispatchEvent(new CustomEvent('fiscal-attests:changed'));
    });

  const checkCorrections = () => run(async () => setCorrections(await call(withYear(apis.correctionsApi, year))));

  const commitCorrections = () =>
    run(async () => {
      const result = await call(apis.correctionsApi, 'POST', { year });
      toast.success(
        `${result.modifications} modification(s), ${result.additions} addition(s), ${result.cancellations} cancellation(s) created`
      );
      await load();
    });

  if (!overview || overview.fiches.length === 0) {
    return null;
  }

  const current = overview.fiches.filter((f) => f.status === 'final');
  const visible = showReplaced ? overview.fiches : overview.fiches.filter((f) => f.status !== 'corrected');
  const exportedOnce = overview.batches.some((b) => b.status !== 'rejected');

  return (
    <div className="mt-6 grid gap-6">
      <Card title={`Generated attests ${year}`}>
        <Card.Session>
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <span>
              {current.length} current fiche(s), {overview.pendingCount} not exported yet
            </span>
            <a className="text-interactive hover:underline" href={withYear(apis.pdfApi, year)} target="_blank" rel="noreferrer">
              All PDFs ({year})
            </a>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showReplaced} onChange={(e) => setShowReplaced(e.target.checked)} />
              Show replaced fiches
            </label>
          </div>
          <table className="listing">
            <thead>
              <tr>
                <th>No.</th>
                <th>Child</th>
                <th>Payer</th>
                <th>Periods</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => (
                <tr key={f.uuid} className={f.status === 'corrected' ? 'opacity-50' : ''}>
                  <td>{f.sequenceNumber}</td>
                  <td>{f.childName}</td>
                  <td>{f.payerName}</td>
                  <td className="text-sm">{f.periods.join(', ')}</td>
                  <td>
                    {euro(f.totalAmount)}
                    <div className="text-xs text-textSubdued">{f.totalDays} days</div>
                  </td>
                  <td>{CHANGE_LABELS[f.changeType]}</td>
                  <td>
                    {f.status === 'corrected' ? 'Replaced' : f.status === 'cancelled' ? 'Cancelled' : 'Current'}
                    <div className="text-xs text-textSubdued">{f.batchId ? `Batch #${f.batchId}` : 'Not exported'}</div>
                  </td>
                  <td>
                    {f.status !== 'cancelled' && (
                      <a
                        className="text-interactive hover:underline"
                        href={`${apis.pdfApi}?uuid=${encodeURIComponent(f.uuid)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Session>
      </Card>

      <Card title="Belcotax">
        <Card.Session>
          <p className="text-textSubdued mb-4">
            Export the fiches that were not uploaded yet as a Belcotax XML and upload it in Belcotax-on-web
            (deadline usually 1 March). Try the test file in the Belcotax test environment first. The first
            upload of a year is an original; every later upload is a correction.
          </p>
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              type="button"
              className="button secondary"
              disabled={busy || overview.pendingCount === 0}
              onClick={() => exportXml('test')}
            >
              Test file (BELCOTST)
            </button>
            <button
              type="button"
              className="button primary"
              disabled={busy || overview.pendingCount === 0}
              onClick={() => exportXml('production')}
            >
              Export {overview.pendingCount} fiche(s) for Belcotax
            </button>
            {overview.pendingCount > 0 && (
              <button type="button" className="button critical" disabled={busy} onClick={discard}>
                {exportedOnce ? 'Discard unexported changes' : 'Discard generated attests'}
              </button>
            )}
          </div>
          {overview.batches.length > 0 && (
            <table className="listing">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Created</th>
                  <th>Kind</th>
                  <th>Fiches / amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {overview.batches.map((b) => (
                  <BatchRow key={`${b.uuid}-${b.status}-${b.belcotaxReference}`} batch={b} apis={apis} onSaved={load} />
                ))}
              </tbody>
            </table>
          )}
        </Card.Session>
      </Card>

      {exportedOnce && (
        <Card title="Corrections">
          <Card.Session>
            <p className="text-textSubdued mb-4">
              Compares the current data (amounts, periods, payers, splits) with the uploaded fiches. Changed fiches
              become modifications (same number), new ones additions, and fiches that no longer apply cancellations.
              Export them afterwards as a new Belcotax batch, and give the parents the new PDF.
            </p>
            <button type="button" className="button secondary mb-4" disabled={busy} onClick={checkCorrections}>
              Check for changes
            </button>
            {corrections && !corrections.canCorrect && <div className="text-critical">{corrections.reason}</div>}
            {corrections?.canCorrect && corrections.lines.length === 0 && <div>No changes since the last upload.</div>}
            {corrections?.canCorrect && corrections.lines.length > 0 && (
              <>
                <table className="listing mb-4">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>No.</th>
                      <th>Child / payer</th>
                      <th>Before</th>
                      <th>After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corrections.lines.map((l) => (
                      <tr key={`${l.type}-${l.key}`}>
                        <td>{CHANGE_LABELS[l.type]}</td>
                        <td>{l.sequenceNumber ?? 'new'}</td>
                        <td>
                          {l.childName}
                          <div className="text-xs text-textSubdued">{l.payerName}</div>
                        </td>
                        <td className="text-sm">
                          {euro(l.oldAmount)}
                          {l.oldPeriods.map((p) => (
                            <div key={p} className="text-xs text-textSubdued">
                              {p}
                            </div>
                          ))}
                        </td>
                        <td className="text-sm">
                          {euro(l.newAmount)}
                          {l.newPeriods.map((p) => (
                            <div key={p} className="text-xs text-textSubdued">
                              {p}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="button primary" disabled={busy} onClick={commitCorrections}>
                  Create {corrections.lines.length} correction(s)
                </button>
              </>
            )}
          </Card.Session>
        </Card>
      )}
    </div>
  );
}

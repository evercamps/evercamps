import { Card } from '@components/admin/cms/Card';
import React from 'react';
import { toast } from 'react-toastify';

// Admin order page: "Fiscal attest" card to switch off fiscal attests for this
// order (payer isn't Belgian, an organisation booked it, ...). The attests
// overview (/admin/fiscal-attests) leaves its registrations out.

interface Props {
  order?: {
    orderId: number | string;
    fiscalAttestExclusion?: { reason: string; reasonLabel: string; note?: string | null } | null;
  } | null;
  saveApi: string;
}

const EXCLUSION_REASONS = [
  { value: 'not_belgian', label: 'Not Belgian' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'other', label: 'Other' }
];

export default function FiscalAttestExclusion({ order, saveApi }: Props) {
  const [exclusion, setExclusion] = React.useState(order?.fiscalAttestExclusion ?? null);
  const [editing, setEditing] = React.useState(false);
  const [reason, setReason] = React.useState(exclusion?.reason ?? 'not_belgian');
  const [note, setNote] = React.useState(exclusion?.note ?? '');
  const [saving, setSaving] = React.useState(false);

  if (!order) {
    return null;
  }

  const save = async (excluded: boolean) => {
    setSaving(true);
    try {
      const response = await fetch(saveApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: order.orderId, excluded, reason, note })
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
        return;
      }
      setExclusion(
        excluded
          ? {
              reason,
              reasonLabel: EXCLUSION_REASONS.find((r) => r.value === reason)?.label ?? reason,
              note
            }
          : null
      );
      setEditing(false);
      toast.success(excluded ? 'No fiscal attest for this order' : 'Fiscal attest enabled again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Fiscal attest">
      <Card.Session>
        {!editing && !exclusion && (
          <div className="flex justify-between gap-4">
            <span>Included in the fiscal attests</span>
            <a
              href="#"
              className="text-interactive hover:underline"
              onClick={(e) => {
                e.preventDefault();
                setEditing(true);
              }}
            >
              Don&apos;t generate
            </a>
          </div>
        )}
        {!editing && exclusion && (
          <div>
            <div className="text-critical">No fiscal attest: {exclusion.reasonLabel}</div>
            {exclusion.note && <div className="text-textSubdued text-sm">{exclusion.note}</div>}
            <div className="flex gap-4 mt-2">
              <a
                href="#"
                className="text-interactive hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  setEditing(true);
                }}
              >
                Change
              </a>
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
          </div>
        )}
        {editing && (
          <div className="flex flex-col gap-2">
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
            <div className="flex gap-4">
              <button type="button" className="button primary" disabled={saving} onClick={() => save(true)}>
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
        )}
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 20
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      orderId
      fiscalAttestExclusion {
        reason
        reasonLabel
        note
      }
    }
    saveApi: url(routeId: "saveFiscalAttestExclusion")
  }
`;

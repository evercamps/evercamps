import { Card } from '@components/admin/cms/Card';
import React from 'react';
import { toast } from 'react-toastify';
import { isValidNationalNumber } from '../../../lib/nationalNumber.js';

// Admin customer page: the customer's national number (payer of fiscal
// attests), shown in the core "customerEditInformation" area under Email,
// with inline editing.

interface Props {
  customer?: { uuid: string; nationalNumber?: string | null } | null;
  saveApi: string;
}

function format(value?: string | null): string {
  const d = String(value ?? '').replace(/\D/g, '');
  return d.length === 11
    ? `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6, 9)}.${d.slice(9)}`
    : String(value ?? '');
}

export default function CustomerNationalNumber({ customer, saveApi }: Props) {
  const [saved, setSaved] = React.useState(customer?.nationalNumber ?? null);
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(format(customer?.nationalNumber));
  const [saving, setSaving] = React.useState(false);

  if (!customer) {
    return null;
  }
  const invalid = value.trim() !== '' && !isValidNationalNumber(value);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(saveApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ customerUuid: customer.uuid, nationalNumber: value })
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
        return;
      }
      setSaved(json.data.nationalNumber);
      setValue(format(json.data.nationalNumber));
      setEditing(false);
      toast.success('National number saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card.Session title="National number">
      {!editing && (
        <div className="flex justify-between gap-4">
          <span>{saved ? format(saved) : <span className="text-textSubdued">Not filled in</span>}</span>
          <a
            href="#"
            className="text-interactive hover:underline"
            onClick={(e) => {
              e.preventDefault();
              setEditing(true);
            }}
          >
            Edit
          </a>
        </div>
      )}
      {editing && (
        <div>
          <input
            className="form-field w-full"
            type="text"
            placeholder="YY.MM.DD-XXX.XX"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {invalid && <div className="text-critical text-sm">This is not a valid Belgian national number</div>}
          <div className="flex gap-4 mt-2">
            <button type="button" className="button primary" disabled={saving || invalid} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setValue(format(saved));
                setEditing(false);
              }}
            >
              Cancel
            </a>
          </div>
        </div>
      )}
    </Card.Session>
  );
}

export const layout = {
  areaId: 'customerEditInformation',
  sortOrder: 17
};

export const query = `
  query Query {
    customer(id: getContextValue("customerUuid", null)) {
      uuid
      nationalNumber
    }
    saveApi: url(routeId: "saveCustomerNationalNumber")
  }
`;

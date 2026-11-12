import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '@evercamps/evercamps/lib/locale/translate/_';
import { isValidNationalNumber } from '../../../lib/nationalNumber.js';

// "Fiscal data" on the customer account page: the customer's own national
// number (as payer of the fiscal attest) and their children's. Needed for the
// fiscal attest (281.86); registrations from before it was asked at checkout
// (or imported ones) are often missing them.

interface Participant {
  uuid: string;
  firstName: string;
  lastName: string;
  nationalNumber?: string | null;
  nationalNumberNotApplicable?: boolean | null;
}

interface Props {
  customer?: {
    nationalNumber?: string | null;
    saveFiscalDataApi: string;
    participants?: Participant[];
  } | null;
}

function format(value?: string | null): string {
  const d = String(value ?? '').replace(/\D/g, '');
  return d.length === 11
    ? `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6, 9)}.${d.slice(9)}`
    : String(value ?? '');
}

export default function FiscalData({ customer }: Props) {
  const [own, setOwn] = React.useState(format(customer?.nationalNumber));
  const [children, setChildren] = React.useState(
    (customer?.participants ?? []).map((p) => ({
      ...p,
      value: format(p.nationalNumber),
      notApplicable: !!p.nationalNumberNotApplicable
    }))
  );
  const [saving, setSaving] = React.useState(false);

  if (!customer) {
    return null;
  }

  const invalid = (value: string) => value.trim() !== '' && !isValidNationalNumber(value);

  const save = async () => {
    if (invalid(own) || children.some((c) => !c.notApplicable && invalid(c.value))) {
      toast.error(_('Please check the national numbers'));
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(customer.saveFiscalDataApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nationalNumber: own,
          participants: children.map((c) => ({
            uuid: c.uuid,
            nationalNumber: c.value,
            notApplicable: c.notApplicable
          }))
        })
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        toast.success(_('Fiscal data saved'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fiscal-data mt-12">
      <div className="border-b mb-4 border-textSubdued">
        <h3>{_('Fiscal data')}</h3>
      </div>
      <p className="text-textSubdued text-sm mb-4">
        {_('Needed for the fiscal attest for childcare costs.')}
      </p>

      <label className="block mb-1" htmlFor="fiscal-own">
        {_('Your national number')}
      </label>
      <input
        id="fiscal-own"
        className="form-field w-full"
        type="text"
        placeholder="YY.MM.DD-XXX.XX"
        value={own}
        onChange={(e) => setOwn(e.target.value)}
      />
      {invalid(own) && (
        <div className="text-critical text-sm">{_('This is not a valid Belgian national number')}</div>
      )}

      {children.map((child, index) => (
        <div key={child.uuid} className="mt-4">
          <label className="block mb-1" htmlFor={`fiscal-child-${index}`}>
            {child.firstName} {child.lastName}
          </label>
          <input
            id={`fiscal-child-${index}`}
            className="form-field w-full"
            type="text"
            placeholder="YY.MM.DD-XXX.XX"
            value={child.value}
            disabled={child.notApplicable}
            onChange={(e) =>
              setChildren(children.map((c, i) => (i === index ? { ...c, value: e.target.value } : c)))
            }
          />
          {!child.notApplicable && invalid(child.value) && (
            <div className="text-critical text-sm">{_('This is not a valid Belgian national number')}</div>
          )}
          <label className="flex items-center gap-2 text-sm mt-1">
            <input
              type="checkbox"
              checked={child.notApplicable}
              onChange={(e) =>
                setChildren(
                  children.map((c, i) => (i === index ? { ...c, notApplicable: e.target.checked } : c))
                )
              }
            />
            {_('Not applicable (not a Belgian national)')}
          </label>
        </div>
      ))}

      <button type="button" className="button primary mt-4" disabled={saving} onClick={save}>
        {saving ? _('Saving…') : _('Save')}
      </button>
    </div>
  );
}

export const layout = {
  areaId: 'accountPageInfo',
  sortOrder: 30
};

export const query = `
  query Query {
    customer: currentCustomer {
      nationalNumber
      saveFiscalDataApi
      participants {
        uuid
        firstName
        lastName
        nationalNumber
        nationalNumberNotApplicable
      }
    }
  }
`;

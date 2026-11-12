import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '@evercamps/evercamps/lib/locale/translate/_';
import { isValidNationalNumber } from '../../../lib/nationalNumber.js';

// "Fiscal attest – split between parents" on the customer account page.
// Per child, per income year, the customer can let the other parent receive
// their own fiscal attest for a share of the costs. Once the organiser has
// made that year's attests, a change is sent as a request.

interface OtherParent {
  fullName: string;
  nationalNumber?: string | null;
  street: string;
  postcode: string;
  city: string;
  country?: string | null;
  sharePercent: number;
  status?: string;
}

interface ChildYear {
  participantUuid: string;
  firstName: string;
  lastName: string;
  year: number;
  registrations: { registrationId: number; label: string }[];
  locked: boolean;
  otherParent: OtherParent | null;
}

interface Props {
  customer?: {
    saveFiscalAttestPayersApi: string;
    fiscalAttestSplits: ChildYear[];
  } | null;
}

const EMPTY: OtherParent = {
  fullName: '',
  nationalNumber: '',
  street: '',
  postcode: '',
  city: '',
  country: 'BE',
  sharePercent: 50
};

function ChildYearRow({ item, api }: { item: ChildYear; api: string }) {
  const [editing, setEditing] = React.useState(false);
  const [other, setOther] = React.useState<OtherParent>(item.otherParent ?? EMPTY);
  const [current, setCurrent] = React.useState<OtherParent | null>(item.otherParent);
  const [saving, setSaving] = React.useState(false);

  const post = async (otherParent: OtherParent | null) => {
    setSaving(true);
    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ participantUuid: item.participantUuid, year: item.year, otherParent })
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
        return false;
      }
      toast.success(item.locked ? _('Your request was sent to the organiser') : _('Saved'));
      setCurrent(otherParent ? { ...otherParent, status: item.locked ? 'requested' : 'active' } : null);
      setEditing(false);
      return true;
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof OtherParent, label: string, placeholder = '') => (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input
        className="form-field w-full"
        type={key === 'sharePercent' ? 'number' : 'text'}
        min={key === 'sharePercent' ? 1 : undefined}
        max={key === 'sharePercent' ? 99 : undefined}
        placeholder={placeholder}
        value={String(other[key] ?? '')}
        onChange={(e) => setOther({ ...other, [key]: e.target.value })}
      />
    </div>
  );

  const nnInvalid = !!other.nationalNumber && !isValidNationalNumber(other.nationalNumber);

  return (
    <div className="border border-divider rounded p-4 mb-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="font-semibold">
            {item.firstName} {item.lastName} – {item.year}
          </div>
          <div className="text-sm text-textSubdued">
            {item.registrations.map((r) => r.label).join(', ')}
          </div>
          <div className="mt-2 text-sm">
            {current ? (
              <>
                {_('Split with')} {current.fullName}: {current.sharePercent}%{' '}
                {_('for the other parent')}, {100 - Number(current.sharePercent)}% {_('for you')}
                {current.status === 'requested' && (
                  <span className="ml-2 text-textSubdued">({_('request pending')})</span>
                )}
              </>
            ) : (
              _('One attest for you (100%)')
            )}
          </div>
        </div>
        {!editing && (
          <div className="flex gap-4 whitespace-nowrap">
            <a
              href="#"
              className="text-interactive hover:underline"
              onClick={(e) => {
                e.preventDefault();
                setOther(current ?? EMPTY);
                setEditing(true);
              }}
            >
              {current ? _('Change') : _('Split with the other parent')}
            </a>
            {current && !item.locked && (
              <a
                href="#"
                className="text-critical hover:underline"
                onClick={async (e) => {
                  e.preventDefault();
                  await post(null);
                }}
              >
                {_('Remove split')}
              </a>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('fullName', _('Name of the other parent'))}
          {field('nationalNumber', _('National number of the other parent'), 'YY.MM.DD-XXX.XX')}
          {field('street', _('Street and number'))}
          {field('postcode', _('Postcode'))}
          {field('city', _('City'))}
          {field('sharePercent', _("Other parent's share (%)"))}
          {nnInvalid && (
            <div className="text-critical text-sm md:col-span-2">
              {_('This is not a valid Belgian national number')}
            </div>
          )}
          {item.locked && (
            <div className="text-sm text-textSubdued md:col-span-2">
              {_('The attests for this year are already made: your change is sent to the organiser as a request.')}
            </div>
          )}
          <div className="flex gap-4 md:col-span-2">
            <button
              type="button"
              className="button primary"
              disabled={saving || nnInvalid}
              onClick={() => post({ ...other, sharePercent: Number(other.sharePercent) })}
            >
              {saving ? _('Saving…') : item.locked ? _('Send request') : _('Save')}
            </button>
            <button type="button" className="button secondary" onClick={() => setEditing(false)}>
              {_('Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FiscalAttestPayers({ customer }: Props) {
  const items = customer?.fiscalAttestSplits ?? [];
  if (!customer || items.length === 0) {
    return null;
  }
  return (
    <div className="fiscal-attest-payers mt-12">
      <div className="border-b mb-4 border-textSubdued">
        <h3>{_('Fiscal attest – split between parents')}</h3>
      </div>
      <p className="text-sm text-textSubdued mb-4">
        {_('By default you receive one fiscal attest for the full amount. Separated parents can each receive an attest for their own share.')}
      </p>
      {items.map((item) => (
        <ChildYearRow
          key={`${item.participantUuid}-${item.year}`}
          item={item}
          api={customer.saveFiscalAttestPayersApi}
        />
      ))}
    </div>
  );
}

export const layout = {
  areaId: 'accountPageOrderHistory',
  sortOrder: 50
};

export const query = `
  query Query {
    customer: currentCustomer {
      saveFiscalAttestPayersApi
      fiscalAttestSplits {
        participantUuid
        firstName
        lastName
        year
        registrations {
          registrationId
          label
        }
        locked
        otherParent {
          fullName
          nationalNumber
          street
          postcode
          city
          country
          sharePercent
          status
        }
      }
    }
  }
`;

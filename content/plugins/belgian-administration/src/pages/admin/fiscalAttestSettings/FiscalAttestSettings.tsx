import { Card } from '@components/admin/cms/Card';
import SettingMenu from '@components/admin/setting/SettingMenu';
import { Field } from '@components/form/Field';
import { Form } from '@components/form/Form';
import { validator } from '@components/form/validator';
import React from 'react';
import { toast } from 'react-toastify';
import { isValidCompanyNumber, normalizeCompanyNumber } from '../../../lib/companyNumber.js';

// Settings for fiscal attests (281.86): organiser, recognising body (every
// camp is recognised by the municipality), signatory, Belcotax sender contact
// and the daily ceiling per income year. Saved through core's saveSetting API.

interface MaxDailyRate {
  year: number;
  amount: number;
}

interface FiscalAttestSettingsData {
  companyNumber?: string | null;
  legalName?: string | null;
  address?: string | null;
  postcode?: string | null;
  city?: string | null;
  authorityType: string;
  authorityName?: string | null;
  authorityReference?: string | null;
  signatoryName?: string | null;
  signatoryFunction?: string | null;
  senderContactName?: string | null;
  senderContactEmail?: string | null;
  senderContactPhone?: string | null;
  maxDailyRates: MaxDailyRate[];
  authorityTypes: { value: string; label: string }[];
}

interface Props {
  saveSettingApi: string;
  fiscalAttestSettings: FiscalAttestSettingsData;
}

// Removing every ceiling row posts no fiscalAttestMaxDailyRates field at all;
// send an empty list then, so the saved value is cleared too. The company
// number is stored digits-only.
function dataFilter(data: any) {
  return {
    ...data,
    fiscalAttestCompanyNumber: normalizeCompanyNumber(data.fiscalAttestCompanyNumber),
    fiscalAttestMaxDailyRates: (data.fiscalAttestMaxDailyRates || [])
      .filter((row: any) => row && row.year !== '' && row.amount !== '')
      .map((row: any) => ({ year: parseInt(row.year, 10), amount: parseFloat(row.amount) }))
  };
}

function MaxDailyRates({ initial }: { initial: MaxDailyRate[] }) {
  const [rows, setRows] = React.useState<{ key: number; year: string; amount: string }[]>(
    initial.map((row, index) => ({ key: index, year: String(row.year), amount: String(row.amount) }))
  );

  return (
    <div>
      {rows.map((row, index) => (
        <div key={row.key} className="flex gap-4 items-end mb-2">
          <div className="w-1/3">
            <Field
              type="text"
              name={`fiscalAttestMaxDailyRates[${index}][year]`}
              label={index === 0 ? 'Income year' : undefined}
              value={row.year}
              validationRules={['notEmpty', 'number']}
              placeholder="2026"
            />
          </div>
          <div className="w-1/3">
            <Field
              type="text"
              name={`fiscalAttestMaxDailyRates[${index}][amount]`}
              label={index === 0 ? 'Max. per day (€)' : undefined}
              value={row.amount}
              validationRules={['notEmpty', 'number']}
              placeholder="16.90"
            />
          </div>
          <a
            href="#"
            className="text-critical hover:underline mb-3"
            onClick={(e) => {
              e.preventDefault();
              setRows(rows.filter((r) => r.key !== row.key));
            }}
          >
            Remove
          </a>
        </div>
      ))}
      <a
        href="#"
        className="text-interactive hover:underline"
        onClick={(e) => {
          e.preventDefault();
          setRows([...rows, { key: Date.now(), year: String(new Date().getFullYear()), amount: '' }]);
        }}
      >
        Add year
      </a>
    </div>
  );
}

export default function FiscalAttestSettings({ saveSettingApi, fiscalAttestSettings: s }: Props) {
  React.useEffect(() => {
    validator.addRule(
      'companyNumber',
      (value: unknown) => !value || isValidCompanyNumber(value),
      'This is not a valid Belgian company number (KBO)'
    );
  }, []);

  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-8 grid-flow-row">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            method="POST"
            id="fiscalAttestSettings"
            action={saveSettingApi}
            dataFilter={dataFilter}
            onSuccess={(response: any) => {
              if (!response.error) {
                toast.success('Setting saved');
              } else {
                toast.error(response.error.message);
              }
            }}
          >
            <Card>
              <Card.Session title="Organiser">
                <Field
                  type="text"
                  name="fiscalAttestCompanyNumber"
                  label="Company number (KBO)"
                  placeholder="0123.456.749"
                  value={s.companyNumber ?? ''}
                  validationRules={['companyNumber']}
                />
                <Field
                  type="text"
                  name="fiscalAttestLegalName"
                  label="Legal name"
                  value={s.legalName ?? ''}
                  instruction="Defaults to the store name."
                />
                <Field type="text" name="fiscalAttestAddress" label="Address" value={s.address ?? ''} />
                <div className="grid grid-cols-2 gap-4">
                  <Field type="text" name="fiscalAttestPostcode" label="Postcode" value={s.postcode ?? ''} />
                  <Field type="text" name="fiscalAttestCity" label="City" value={s.city ?? ''} />
                </div>
              </Card.Session>

              <Card.Session title="Recognition">
                <Field
                  type="select"
                  name="fiscalAttestAuthorityType"
                  label="Recognised by"
                  value={s.authorityType}
                  options={s.authorityTypes.map((t) => ({ value: t.value, text: t.label }))}
                  disableDefaultOption
                />
                <Field
                  type="text"
                  name="fiscalAttestAuthorityName"
                  label="Name of the recognising body"
                  placeholder="Gemeente ..."
                  value={s.authorityName ?? ''}
                />
                <Field
                  type="text"
                  name="fiscalAttestAuthorityReference"
                  label="Recognition reference (optional)"
                  value={s.authorityReference ?? ''}
                />
              </Card.Session>

              <Card.Session title="Signatory (printed on the attest)">
                <div className="grid grid-cols-2 gap-4">
                  <Field type="text" name="fiscalAttestSignatoryName" label="Name" value={s.signatoryName ?? ''} />
                  <Field
                    type="text"
                    name="fiscalAttestSignatoryFunction"
                    label="Function"
                    value={s.signatoryFunction ?? ''}
                  />
                </div>
              </Card.Session>

              <Card.Session title="Belcotax sender contact">
                <Field
                  type="text"
                  name="fiscalAttestSenderContactName"
                  label="Contact name"
                  value={s.senderContactName ?? ''}
                  instruction="Written into the Belcotax XML; doesn't have to be the person who uploads it."
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    type="text"
                    name="fiscalAttestSenderContactEmail"
                    label="Email"
                    value={s.senderContactEmail ?? ''}
                    validationRules={['email']}
                  />
                  <Field
                    type="text"
                    name="fiscalAttestSenderContactPhone"
                    label="Phone"
                    value={s.senderContactPhone ?? ''}
                  />
                </div>
              </Card.Session>

              <Card.Session title="Maximum deductible amount per day">
                <div className="text-textSubdued mb-4">
                  Indexed every year by the FOD Financiën. Only shown as information in the
                  attest preview; the attest itself states the amount actually paid.
                </div>
                <MaxDailyRates initial={s.maxDailyRates ?? []} />
              </Card.Session>
            </Card>
          </Form>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting")
    fiscalAttestSettings {
      companyNumber
      legalName
      address
      postcode
      city
      authorityType
      authorityName
      authorityReference
      signatoryName
      signatoryFunction
      senderContactName
      senderContactEmail
      senderContactPhone
      maxDailyRates {
        year
        amount
      }
      authorityTypes {
        value
        label
      }
    }
  }
`;

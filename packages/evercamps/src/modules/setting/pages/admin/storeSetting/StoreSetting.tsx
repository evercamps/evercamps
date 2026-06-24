import { Card } from '@components/admin/cms/Card';
import SettingMenu from '@components/admin/setting/SettingMenu';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

const ProvincesQuery = `
  query Province($countries: [String]) {
    provinces (countries: $countries) {
      code
      name
      countryCode
    }
  }
`;

const CountriesQuery = `
  query Country($countries: [String]) {
    countries (countries: $countries) {
      code
      name
    }
  }
`;

const CurrencyQuery = `
  query Currencies {
    currencies {
      code
      name
    }
  }
`;

interface ProvinceProps {
  selectedCountry?: string;
  selectedProvince?: string;
  allowedCountries?: string[];
  fieldName?: string;
}

function Province({
  selectedCountry = 'US',
  selectedProvince,
  allowedCountries = [],
  fieldName = 'storeProvince'
}: ProvinceProps) {
  const [result] = useQuery({
    query: ProvincesQuery,
    variables: { countries: allowedCountries }
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }
  const provinces = data.provinces.filter(
    (p: any) => p.countryCode === selectedCountry
  );
  if (!provinces.length) {
    return null;
  }
  return (
    <div>
      <Field
        type="select"
        value={selectedProvince}
        name={fieldName}
        label="Province"
        placeholder="Province"
        validationRules={['notEmpty']}
        options={provinces.map((p: any) => ({ value: p.code, text: p.name }))}
      />
    </div>
  );
}

interface CountryProps {
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  allowedCountries?: string[];
  fieldName?: string;
}

function Country({
  selectedCountry,
  setSelectedCountry,
  allowedCountries = [],
  fieldName = 'storeCountry'
}: CountryProps) {
  const onChange = (newValue: unknown) => {
    setSelectedCountry(newValue as string);
  };
  const [result] = useQuery({
    query: CountriesQuery,
    variables: { countries: allowedCountries }
  });

  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <Field
        type="select"
        value={selectedCountry}
        label="Country"
        name={fieldName}
        placeholder="Country"
        onChange={onChange}
        validationRules={['notEmpty']}
        options={data.countries.map((c: any) => ({ value: c.code, text: c.name }))}
      />
    </div>
  );
}

interface CurrencyProps {
  selectedCurrency: string;
  fieldName?: string;
}

function Currency({ selectedCurrency, fieldName = 'storeCurrency' }: CurrencyProps) {
  const [result] = useQuery({
    query: CurrencyQuery
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  return (
    <Field
      type="select"
      value={selectedCurrency}
      name={fieldName}
      label="Currency"
      placeholder="Currency"
      options={data.currencies.map((c: any) => ({ value: c.code, text: c.name }))}
    />
  );
}

interface StorePhoneNumberProps {
  storePhoneNumber?: string;
}

function StorePhoneNumber({ storePhoneNumber = '' }: StorePhoneNumberProps) {
  return (
    <div>
      <Field
        name="storePhoneNumber"
        label="Store Phone Number"
        placeholder="Store Phone Number"
        value={storePhoneNumber}
        type="text"
      />
    </div>
  );
}

interface StoreEmailProps {
  storeEmail?: string;
}

function StoreEmail({ storeEmail = '' }: StoreEmailProps) {
  return (
    <div>
      <Field
        name="storeEmail"
        label="Store Email"
        placeholder="Store Email"
        value={storeEmail}
        type="text"
      />
    </div>
  );
}

interface ParticipantCheckoutField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
}

function ParticipantCheckoutFields({ initialFields }: { initialFields: ParticipantCheckoutField[] }) {
  const [fields, setFields] = useState<ParticipantCheckoutField[]>(initialFields);

  const addField = () =>
    setFields((prev) => [
      ...prev,
      { code: '', label: '', type: 'text', required: false, useForUniqueness: false }
    ]);

  const removeField = (index: number) =>
    setFields((prev) => prev.filter((_, i) => i !== index));

  const updateField = <K extends keyof ParticipantCheckoutField>(
    index: number,
    key: K,
    value: ParticipantCheckoutField[K]
  ) => setFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));

  return (
    <Card.Session title="Participant Fields">
      {fields.length > 0 && (
        <table className="listing sticky">
          <thead>
            <tr>
              <th>Code</th>
              <th>Label</th>
              <th>Type</th>
              <th>Required</th>
              <th>Use for uniqueness</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={index}>
                <td>
                  <input
                    className="form-input"
                    name={`participant_checkout_fields[${index}][code]`}
                    value={field.code}
                    onChange={(e) => updateField(index, 'code', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    name={`participant_checkout_fields[${index}][label]`}
                    value={field.label}
                    onChange={(e) => updateField(index, 'label', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    name={`participant_checkout_fields[${index}][type]`}
                    value={field.type}
                    onChange={(e) =>
                      updateField(index, 'type', e.target.value as ParticipantCheckoutField['type'])
                    }
                  >
                    <option value="text">Text</option>
                    <option value="date">Date</option>
                    <option value="select">Select</option>
                  </select>
                </td>
                <td>
                  <select
                    className="form-select"
                    name={`participant_checkout_fields[${index}][required]`}
                    value={field.required ? 'true' : 'false'}
                    onChange={(e) => updateField(index, 'required', e.target.value === 'true')}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </td>
                <td>
                  <select
                    className="form-select"
                    name={`participant_checkout_fields[${index}][useForUniqueness]`}
                    value={field.useForUniqueness ? 'true' : 'false'}
                    onChange={(e) =>
                      updateField(index, 'useForUniqueness', e.target.value === 'true')
                    }
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </td>
                <td>
                  <button type="button" className="button secondary" onClick={() => removeField(index)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-4">
        <button type="button" className="button secondary" onClick={addField}>
          + Add Field
        </button>
      </div>
    </Card.Session>
  );
}

interface StoreSetting {
  storeName?: string;
  storeDescription?: string;
  storeTimeZone?: string;
  storePhoneNumber?: string;
  storeEmail?: string;
  storeCountry?: string;
  storeAddress?: string;
  storeCity?: string;
  storeProvince?: string;
  storePostalCode?: string;
  participantCheckoutFields?: string;
}

interface Props {
  saveSettingApi: string;
  setting: StoreSetting;
}

function parseParticipantFields(raw?: string): ParticipantCheckoutField[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function participantFieldsDataFilter(data: Record<string, any>): Record<string, any> {
  const fields = Array.isArray(data.participant_checkout_fields)
    ? data.participant_checkout_fields
    : [];
  data.participant_checkout_fields = fields.map((f: any) => ({
    ...f,
    required: f.required === 'true',
    useForUniqueness: f.useForUniqueness === 'true'
  }));
  return data;
}

export default function StoreSetting({
  saveSettingApi,
  setting: {
    storeName,
    storeDescription,
    storePhoneNumber,
    storeEmail,
    storeCountry,
    storeAddress,
    storeCity,
    storeProvince,
    storePostalCode,
    participantCheckoutFields
  }
}: Props) {
  const [selectedCountry, setSelectedCountry] = useState(() => {
    return storeCountry ?? 'US';
  });

  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-8 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            method="POST"
            id="storeSetting"
            action={saveSettingApi}
            dataFilter={participantFieldsDataFilter}
            onSuccess={(response: any) => {
              if (!response.error) {
                toast.success('Setting saved');
              } else {
                toast.error(response.error.message);
              }
            }}
          >
            <Card>
              <Card.Session title="Store Information">
                <Area
                  id="storeInfoSetting"
                  coreComponents={[
                    {
                      component: {
                        default: Field
                      },
                      props: {
                        name: 'storeName',
                        label: 'Store Name',
                        placeholder: 'Store Name',
                        value: storeName,
                        type: 'text'
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: Field
                      },
                      props: {
                        name: 'storeDescription',
                        label: 'Store Description',
                        placeholder: 'Store Description',
                        value: storeDescription,
                        type: 'textarea'
                      },
                      sortOrder: 20
                    }
                  ]}
                  noOuter
                />
              </Card.Session>
              <Card.Session title="Contact Information">
                <Area
                  id="storeContactSetting"
                  coreComponents={[
                    {
                      component: {
                        default: StorePhoneNumber
                      },
                      props: {
                        storePhoneNumber
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: StoreEmail
                      },
                      props: {
                        storeEmail
                      },
                      sortOrder: 20
                    }
                  ]}
                  className="grid grid-cols-2 gap-8 mt-8"
                />
              </Card.Session>
              <Card.Session title="Address">
                <Country
                  selectedCountry={storeCountry ?? 'US'}
                  setSelectedCountry={setSelectedCountry}
                />
                <Field
                  name="storeAddress"
                  label="Address"
                  value={storeAddress}
                  placeholder="Store Address"
                  type="text"
                />
                <div className="grid grid-cols-3 gap-8 mt-8">
                  <div>
                    <Field
                      name="storeCity"
                      label="City"
                      value={storeCity}
                      placeholder="City"
                      type="text"
                    />
                  </div>
                  <Province
                    selectedProvince={storeProvince}
                    selectedCountry={selectedCountry}
                  />
                  <div>
                    <Field
                      name="storePostalCode"
                      label="PostalCode"
                      value={storePostalCode}
                      placeholder="PostalCode"
                      type="text"
                    />
                  </div>
                </div>
              </Card.Session>
              <ParticipantCheckoutFields
                initialFields={parseParticipantFields(participantCheckoutFields)}
              />
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
    setting {
      storeName
      storeDescription
      storeTimeZone
      storePhoneNumber
      storeEmail
      storeCountry
      storeAddress
      storeCity
      storeProvince
      storePostalCode
      participantCheckoutFields
    }
  }
`;

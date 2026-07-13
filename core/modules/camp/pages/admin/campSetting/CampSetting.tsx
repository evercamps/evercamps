import { Card } from '@components/admin/cms/Card';
import SettingMenu from '@components/admin/setting/SettingMenu';
import { Form } from '@components/common/form/Form';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

const AVAILABLE_PARTICIPANT_FIELDS = [
  { code: 'birth_date', label: 'Date of Birth', type: 'date' as const }
];

interface ParticipantCheckoutField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
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

function ParticipantCheckoutFields({ initialFields }: { initialFields: ParticipantCheckoutField[] }) {
  const [fields, setFields] = useState<ParticipantCheckoutField[]>(initialFields);

  const usedCodes = fields.map((f) => f.code);
  const nextAvailable = AVAILABLE_PARTICIPANT_FIELDS.find((f) => !usedCodes.includes(f.code));

  const addField = () => {
    if (!nextAvailable) return;
    setFields((prev) => [
      ...prev,
      { code: nextAvailable.code, label: nextAvailable.label, type: nextAvailable.type, required: false, useForUniqueness: false }
    ]);
  };

  const removeField = (index: number) =>
    setFields((prev) => prev.filter((_, i) => i !== index));

  const updateField = <K extends keyof ParticipantCheckoutField>(
    index: number,
    key: K,
    value: ParticipantCheckoutField[K]
  ) => setFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));

  const changeCode = (index: number, code: string) => {
    const definition = AVAILABLE_PARTICIPANT_FIELDS.find((f) => f.code === code);
    if (!definition) return;
    setFields((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, code: definition.code, type: definition.type } : f
      )
    );
  };

  return (
    <Card.Session title="Participant Fields">
      {fields.length > 0 && (
        <table className="listing sticky">
          <thead>
            <tr>
              <th>Field</th>
              <th>Label</th>
              <th>Required</th>
              <th>Use for uniqueness</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.code}>
                <td>
                  <select
                    className="form-select"
                    name={`participant_checkout_fields[${index}][code]`}
                    value={field.code}
                    onChange={(e) => changeCode(index, e.target.value)}
                  >
                    {AVAILABLE_PARTICIPANT_FIELDS.filter(
                      (f) => f.code === field.code || !usedCodes.includes(f.code)
                    ).map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <input type="hidden" name={`participant_checkout_fields[${index}][type]`} value={field.type} />
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
        <button
          type="button"
          className="button secondary"
          onClick={addField}
          disabled={!nextAvailable}
        >
          + Add Field
        </button>
      </div>
    </Card.Session>
  );
}

interface Props {
  saveSettingApi: string;
  setting: {
    participantCheckoutFields?: string;
  };
}

export default function CampSetting({ saveSettingApi, setting: { participantCheckoutFields } }: Props) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-8 grid-flow-row">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            method="POST"
            id="campSetting"
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
      participantCheckoutFields
    }
  }
`;

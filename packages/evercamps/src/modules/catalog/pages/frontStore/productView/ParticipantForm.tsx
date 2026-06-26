import React, { useState } from 'react';
import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';
import { _ } from '../../../../../lib/locale/translate/_.js';
import type { ParticipantCheckoutField } from '../../../../../types/checkout';

interface SavedParticipant {
  participantId: number;
  firstName: string;
  lastName: string;
}

interface Customer {
  participants?: SavedParticipant[];
}

interface Props {
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  loading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  customer?: Customer | null;
  loginUrl: string;
  registerUrl: string;
  extraFields?: ParticipantCheckoutField[];
}

export default function ParticipantForm({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  loading,
  onCancel,
  onSubmit,
  customer,
  loginUrl,
  registerUrl,
  extraFields = []
}: Props) {
  const [selectedParticipant, setSelectedParticipant] = useState<SavedParticipant | null>(null);
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (selectedParticipant) {
      setFirstName(selectedParticipant.firstName || '');
      setLastName(selectedParticipant.lastName || '');
    }
  }, [selectedParticipant, setFirstName, setLastName]);

  return (
    <Card title="Enter Participant Details">
      <Card.Session>
        {!customer && (
          <div className="mb-4">
            <span>{_('Want to check out faster?')}</span>{' '}
            <a
              className="text-interactive hover:underline"
              href={`${loginUrl}?redirect=${encodeURIComponent(window.location.href)}`}
            >
              {_('Login')}
            </a>
            {' '}{_('or')}{' '}
            <a
              className="text-interactive hover:underline"
              href={`${registerUrl}?redirect=${encodeURIComponent(window.location.href)}`}
            >
              {_('Register')}
            </a>
          </div>
        )}
        {customer && customer.participants && customer.participants.length > 0 && (
          <div className="mb-4">
            <Field
              id="participant"
              name="participant"
              type="select"
              label={_('Select a Saved Participant')}
              value={selectedParticipant ? selectedParticipant.participantId : ''}
              placeholder={_('Choose a participant')}
              disableDefaultOption={false}
              options={customer.participants.map((p) => ({
                text: `${p.firstName} ${p.lastName}`,
                value: p.participantId
              }))}
              onChange={(newValue: unknown) => {
                const participant = customer.participants!.find(
                  (p) => p.participantId.toString() === String(newValue)
                );
                setSelectedParticipant(participant ?? null);
                if (participant) {
                  setFirstName(participant.firstName);
                  setLastName(participant.lastName);
                }
              }}
            />
          </div>
        )}
        <label className="block mb-2 font-medium">First Name</label>
        <div className="mb-8">
          <Field
            id="first_name"
            name="first_name"
            value={firstName}
            placeholder="Enter First Name"
            type="text"
            validationRules={['notEmpty']}
            onChange={(e: any) => setFirstName(e?.target?.value ?? e)}
          />
        </div>
        <label className="block mb-2 font-medium">Last Name</label>
        <div className="mb-2">
          <Field
            id="last_name"
            name="last_name"
            value={lastName}
            placeholder="Enter Last Name"
            type="text"
            validationRules={['notEmpty']}
            onChange={(e: any) => setLastName(e?.target?.value ?? e)}
          />
        </div>
        {extraFields.map((field) => (
          <div key={field.code} className="mb-2">
            <label className="block mb-2 font-medium">{field.label}</label>
            <Field
              id={field.code}
              name={field.code}
              type="text"
              placeholder={field.type === 'date' ? 'YYYY-MM-DD' : undefined}
              value={extraValues[field.code] || ''}
              validationRules={field.required ? ['notEmpty'] : []}
              onChange={(e: any) =>
                setExtraValues((prev) => ({ ...prev, [field.code]: e?.target?.value ?? e }))
              }
            />
          </div>
        ))}
      </Card.Session>
      <Card.Session>
        <div className="flex justify-between gap-8">
          <Button title="Cancel" variant="secondary" onAction={onCancel} />
          <Button title="Add To Cart" variant="primary" isLoading={loading} onAction={onSubmit} />
        </div>
      </Card.Session>
    </Card>
  );
}

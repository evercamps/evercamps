import React, { useState } from 'react';
import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';
import { _ } from '../../../../../lib/locale/translate/_.js';

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
  registerUrl
}) {
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  
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
              onChange={(e) => {
                const participant = customer.participants.find(
                  (p) => p.participantId.toString() === e.target.value
                );
                setSelectedParticipant(participant);
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
            onChange={(e) => setFirstName(e.target.value)}
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
          onChange={(e) => setLastName(e.target.value)}
        />
          </div>
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
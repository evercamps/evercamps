import React from 'react';
import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';

export default function ParticipantForm({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  loading,
  onCancel,
  onSubmit
}) {
  return (    
      <Card title="Enter Participant Details">
        <Card.Session>
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
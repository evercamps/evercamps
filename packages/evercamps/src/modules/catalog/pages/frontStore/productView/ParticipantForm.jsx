import React from 'react';
import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';

export default function ParticipantForm({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  onCancel,
  onSubmit
}) {
  return (    
      <Card title="Enter Participant Details">
        <Card.Session>
          <label className="block mb-2 font-medium">First Name</label>
          <div className="border rounded border-divider mb-8">
            <input
              type="text"
              value={firstName}
              placeholder="Enter first name"
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          
          <label className="block mb-2 font-medium">Last Name</label>
          <div className="border rounded border-divider mb-2">
          <input
            type="text"
            value={lastName}
            placeholder="Enter last name"
            onChange={(e) => setLastName(e.target.value)}
          />
          </div>
        </Card.Session>

        <Card.Session>
          <div className="flex justify-between gap-8">
            <Button title="Cancel" variant="secondary" onAction={onCancel} />
            <Button title="Add To Cart" variant="primary" onAction={onSubmit} />
          </div>
        </Card.Session>
      </Card>    
  );
}
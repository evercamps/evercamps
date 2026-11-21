import { Field } from '@components/form/Field';
import React from 'react';
import type { ContactFormSettings } from '../../../types/index.js';

interface Props {
  setting?: Partial<ContactFormSettings> | null;
}

// Added to the "Contact Information" card of the store settings page
export default function ContactFormSetting({ setting }: Props) {
  return (
    <>
      <div>
        <Field
          name="contactFormRecipient"
          label="Contact form recipient"
          placeholder="Empty: the store email"
          value={setting?.contactFormRecipient || ''}
          type="text"
          validationRules={['email']}
        />
      </div>
      <div>
        <Field
          name="contactMessageRetentionDays"
          label="Delete contact messages after (days)"
          placeholder="365"
          value={String(setting?.contactMessageRetentionDays ?? 365)}
          type="text"
          validationRules={['number']}
        />
      </div>
    </>
  );
}

export const layout = {
  areaId: 'storeContactSetting',
  sortOrder: 30
};

export const query = `
  query Query {
    setting {
      contactFormRecipient
      contactMessageRetentionDays
    }
  }
`;

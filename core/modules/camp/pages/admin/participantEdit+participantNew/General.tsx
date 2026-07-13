import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import { get } from '../../../../../lib/util/get.js';
import Area from '@components/common/Area';
import React from 'react';

interface ParticipantCheckoutField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
}

interface Participant {
  firstName: string;
  lastName: string;
  [key: string]: any;
}

interface Props {
  participant?: Participant;
  setting?: {
    participantCheckoutFields?: string;
  };
}

function codeToPropId(code: string): string {
  return code.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export default function General({ participant, setting }: Props) {
  const extraCheckoutFields: ParticipantCheckoutField[] = (() => {
    try {
      return setting?.participantCheckoutFields
        ? JSON.parse(setting.participantCheckoutFields)
        : [];
    } catch {
      return [];
    }
  })();

  const fields = [
    {
      component: { default: Field },
      props: {
        id: 'firstName',
        name: 'first_name',
        label: 'First Name',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 10,
      id: 'firstName'
    },
    {
      component: { default: Field },
      props: {
        id: 'lastName',
        name: 'last_name',
        label: 'Last Name',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 20,
      id: 'lastName'
    },
    ...extraCheckoutFields.map((field, index) => ({
      component: { default: Field },
      props: {
        id: codeToPropId(field.code),
        name: field.code,
        label: field.label,
        validationRules: field.required ? ['notEmpty'] : [],
        type: field.type === 'date' ? 'text' : field.type,
        ...(field.type === 'date' ? { placeholder: 'YYYY-MM-DD' } : {})
      },
      sortOrder: 30 + index * 10,
      id: field.code
    }))
  ].map((f) => {
    if (get(participant, `${f.props.id}`) !== undefined) {
      (f.props as any).value = get(participant, `${f.props.id}`);
    }
    return f;
  });

  return (
    <Card title="General">
      <Card.Session>
        <Area id="participantEditGeneral" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    participant(id: getContextValue("participantUuid", null)) {
      participantId
      firstName
      lastName
      birthDate
    }
    setting {
      participantCheckoutFields
    }
  }
`;

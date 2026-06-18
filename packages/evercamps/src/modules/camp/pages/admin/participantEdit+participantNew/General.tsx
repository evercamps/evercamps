import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import { get } from '../../../../../lib/util/get.js';
import Area from '@components/common/Area';
import React from 'react';

interface Participant {
  firstName: string;
  lastName: string;
}

interface Props {
  participant?: Participant;
}

export default function General({ participant }: Props) {
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
      sortOrder: 10,
      id: 'lastName'
    }
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
    }
  }
`;

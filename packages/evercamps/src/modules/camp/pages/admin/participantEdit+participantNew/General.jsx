import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import { get } from '../../../../../lib/util/get.js';
import Area from '@components/common/Area';
import PropTypes from 'prop-types';
import React from 'react';

export default function General({ participant }) {
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
        f.props.value = get(participant, `${f.props.id}`);
      }
      return f
    });
  return (
    <Card title="General">
          <Card.Session>
            <Area id="participantEditGeneral" coreComponents={fields} />
          </Card.Session>
        </Card>
  );
}

General.propTypes = {
  participant: PropTypes.shape({
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,    
  })
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    participant(id: getContextValue("participantId", null)) {
      participantId
      firstName
      lastName
    }
  }
`;

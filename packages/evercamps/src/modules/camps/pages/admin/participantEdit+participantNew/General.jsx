import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import PropTypes from 'prop-types';
import React from 'react';

function FirstName({ firstName }) {
  return (
    <Card.Session title="First Name">
      <div>
        <span>{firstName}</span>
      </div>
    </Card.Session>
  );
}

FirstName.propTypes = {
  firstName: PropTypes.string.isRequired
};

function LastName({ lastName }) {
  return (
    <Card.Session title="Last Name">
      <div>
        <span>{lastName}</span>
      </div>
    </Card.Session>
  );
}

LastName.propTypes = {
  lastName: PropTypes.string.isRequired
};

export default function General({ participant }) {
  return (
    <Card>
      <Area
        id="participantEditInformation"
        coreComponents={[
          {
            component: {
              default: () => <FirstName firstName={participant.firstName} />
            },
            sortOrder: 10
          },
          {
            component: { default: () => <LastName lastName={participant.lastName} /> },
            sortOrder: 15
          }
        ]}
      />
    </Card>
  );
}

General.propTypes = {
  participant: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,    
  }).isRequired
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    participant(id: getContextValue("id", null)) {
      id
      firstName
      lastName
    }
  }
`;

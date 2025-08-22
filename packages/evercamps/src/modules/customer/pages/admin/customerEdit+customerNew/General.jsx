import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import PropTypes from 'prop-types';
import React from 'react';

function FullName({ fullName }) {
  return (
    <Card.Session title="Full Name">
      <div>
        <span>{fullName}</span>
      </div>
    </Card.Session>
  );
}

FullName.propTypes = {
  fullName: PropTypes.string.isRequired
};

function Group({ group }) {
  return (
    <Card.Session title="Group">
      <div>
        <span>{group?.groupName || 'Default'}</span>
      </div>
    </Card.Session>
  );
}

Group.propTypes = {
  group: PropTypes.shape({
    groupName: PropTypes.string
  }).isRequired
};

function Email({ email }) {
  return (
    <Card.Session title="Email">
      <div>
        <span>{email}</span>
      </div>
    </Card.Session>
  );
}

Email.propTypes = {
  email: PropTypes.string.isRequired
};

function Status({ status }) {
  return (
    <Card.Session title="Status">
      <div>
        <span>{parseInt(status, 10) === 1 ? 'Enabled' : 'Disabled'}</span>
      </div>
    </Card.Session>
  );
}

Status.propTypes = {
  status: PropTypes.number.isRequired
};

function Participants({ participants }) {
  if (!participants || participants.length === 0) {
    return (
      <Card.Session title="Participants">
        <div>No participants assigned</div>
      </Card.Session>
    );
  }

  return (
    <Card.Session title="Participants">
      <ul>
        {participants.map((p, idx) => (
          <li key={idx}>
            {p.firstName} {p.lastName}
          </li>
        ))}
      </ul>
    </Card.Session>
  );
}

Participants.propTypes = {
  participants: PropTypes.arrayOf(
    PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string
    })
  )
};

export default function General({ customer }) {
  return (
    <Card>
      <Area
        id="customerEditInformation"
        coreComponents={[
          {
            component: {
              default: () => <FullName fullName={customer.fullName} />
            },
            sortOrder: 10
          },
          {
            component: { default: () => <Email email={customer.email} /> },
            sortOrder: 15
          },
          {
            component: { default: () => <Group group={customer.group} /> },
            sortOrder: 20
          },
          {
            component: { default: () => <Participants participants={customer.participants} /> },
            sortOrder: 25
          },
          {
            component: { default: () => <Status status={customer.status} /> },
            sortOrder: 30
          }
        ]}
      />
    </Card>
  );
}

General.propTypes = {
  customer: PropTypes.shape({
    email: PropTypes.string,
    fullName: PropTypes.string,
    group: PropTypes.shape({
      groupName: PropTypes.string
    }),
    status: PropTypes.number
  }).isRequired
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    customer(id: getContextValue("customerUuid", null)) {
      customerId
      fullName
      email
      status
      group {
        groupName
      }
      participants {
        firstName
        lastName
      }
    }
  }
`;

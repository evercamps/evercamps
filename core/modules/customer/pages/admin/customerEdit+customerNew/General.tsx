import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import React from 'react';

interface GroupData {
  groupName?: string;
}

interface Participant {
  firstName?: string;
  lastName?: string;
}

interface Customer {
  customerId?: number;
  fullName?: string;
  email?: string;
  status?: number;
  group?: GroupData;
  participants?: Participant[];
}

interface FullNameProps {
  fullName?: string;
}

function FullName({ fullName }: FullNameProps): React.ReactElement {
  return (
    <Card.Session title="Full Name">
      <div>
        <span>{fullName}</span>
      </div>
    </Card.Session>
  );
}

interface GroupProps {
  group?: GroupData;
}

function Group({ group }: GroupProps): React.ReactElement {
  return (
    <Card.Session title="Group">
      <div>
        <span>{group?.groupName || 'Default'}</span>
      </div>
    </Card.Session>
  );
}

interface EmailProps {
  email?: string;
}

function Email({ email }: EmailProps): React.ReactElement {
  return (
    <Card.Session title="Email">
      <div>
        <span>{email}</span>
      </div>
    </Card.Session>
  );
}

interface StatusProps {
  status?: number;
}

function Status({ status }: StatusProps): React.ReactElement {
  return (
    <Card.Session title="Status">
      <div>
        <span>{parseInt(String(status), 10) === 1 ? 'Enabled' : 'Disabled'}</span>
      </div>
    </Card.Session>
  );
}

interface ParticipantsProps {
  participants?: Participant[];
}

function Participants({
  participants
}: ParticipantsProps): React.ReactElement {
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

interface GeneralProps {
  customer: Customer;
}

export default function General({
  customer
}: GeneralProps): React.ReactElement {
  return (
    <Card>
      <Area
        id="customerEditInformation"
        coreComponents={[
          {
            component: {
              default: () => (
                <FullName fullName={customer.fullName} />
              )
            },
            sortOrder: 10
          },
          {
            component: {
              default: () => (
                <Email email={customer.email} />
              )
            },
            sortOrder: 15
          },
          {
            component: {
              default: () => (
                <Group group={customer.group} />
              )
            },
            sortOrder: 20
          },
          {
            component: {
              default: () => (
                <Participants participants={customer.participants} />
              )
            },
            sortOrder: 25
          },
          {
            component: {
              default: () => (
                <Status status={customer.status} />
              )
            },
            sortOrder: 30
          }
        ]}
      />
    </Card>
  );
}

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
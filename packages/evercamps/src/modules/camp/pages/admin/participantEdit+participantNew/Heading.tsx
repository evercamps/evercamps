import PageHeading from '@components/admin/cms/PageHeading';
import React from 'react';

interface Participant {
  firstName: string;
  lastName: string;
}

interface Props {
  backUrl: string;
  participant?: Participant | null;
}

export default function Heading({ backUrl, participant = null }: Props) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        participant ? `Editing ${participant.firstName} ${participant.lastName}` : 'Create A New Participant'
      }
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    participant(id: getContextValue("participantUuid", null)) {
      firstName
      lastName
    }
    backUrl: url(routeId: "participantGrid")
  }
`;

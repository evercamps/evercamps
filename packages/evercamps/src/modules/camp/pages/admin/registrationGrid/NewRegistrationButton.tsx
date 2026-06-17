import Button from '@components/common/form/Button';
import React from 'react';

interface Props {
  newParticipantUrl: string;
}

export default function NewRegistrationButton({ newParticipantUrl }: Props) {
  return <Button url={newParticipantUrl} title="New Registration" />;
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newParticipantUrl: url(routeId: "participantNew")
  }
`;

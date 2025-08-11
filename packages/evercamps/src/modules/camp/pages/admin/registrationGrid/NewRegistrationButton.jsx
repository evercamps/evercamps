import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';

export default function NewRegistrationButton({ newParticipantUrl }) {
  return <Button url={newParticipantUrl} title="New Registration" />;
}

NewRegistrationButton.propTypes = {
  newParticipantUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newParticipantUrl: url(routeId: "participantNew")
  }
`;

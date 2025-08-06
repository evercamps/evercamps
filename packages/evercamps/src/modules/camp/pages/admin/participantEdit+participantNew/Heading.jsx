import PageHeading from '@components/admin/cms/PageHeading';
import PropTypes from 'prop-types';
import React from 'react';

export default function Heading({ backUrl, participant }) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        participant ? `Editing ${participant.firstname}` : 'Create A New Participant'
      }
    />
  );
}

Heading.propTypes = {
  backUrl: PropTypes.string.isRequired,
  participant: PropTypes.shape({
    firstname: PropTypes.string.isRequired
  })
};

Heading.defaultProps = {
  participant: null
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    participant(id: getContextValue("id", null)) {
      firstName
    }
    backUrl: url(routeId: "participantGrid")
  }
`;

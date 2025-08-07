import PropTypes from 'prop-types';
import React from 'react';

export default function ParticipantNameRow({ participant }) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={participant.editUrl}>
          {participant.firstName}
        </a>
      </div>
    </td>
  );
}

ParticipantNameRow.propTypes = {
  participant: PropTypes.shape({
    firstName: PropTypes.string.isRequired,
    editUrl: PropTypes.string.isRequired,
  }).isRequired,
};
import PropTypes from 'prop-types';
import React from 'react';

export default function ParticipantNameRow({ participant }) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={participant.editUrl}>
          {participant.lastName}
        </a>
      </div>
    </td>
  );
}

ParticipantNameRow.propTypes = {
  participant: PropTypes.shape({
    lastName: PropTypes.string.isRequired,
    editUrl: PropTypes.string.isRequired,
  }).isRequired,
};
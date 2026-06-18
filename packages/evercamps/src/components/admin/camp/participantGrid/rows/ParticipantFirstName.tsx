import React from 'react';

interface Participant {
  firstName: string;
  editUrl: string;
}

interface Props {
  participant: Participant;
}

export default function ParticipantNameRow({ participant }: Props) {
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

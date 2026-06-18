import React from 'react';

interface Participant {
  lastName: string;
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
          {participant.lastName}
        </a>
      </div>
    </td>
  );
}

import { Card } from '@components/admin/cms/Card';
import Button from '@components/form/Button';
import { useModal } from '@components/modal/useModal';
import React from 'react';
import ParticipantMergeForm from './ParticipantMergeForm.jsx';

export const query = `
  query Query($threshold: Float) {
    participantDuplicateGroups(threshold: $threshold) {
      key
      score
      participants {
        participantId
        uuid
        firstName
        lastName
        editUrl
        customer { fullName }
        registrations { total }
      }
    }
    mergeApi: url(routeId: "mergeParticipant")
  }
`;

export const variables = `
{
  threshold: getContextValue("duplicateThreshold", null)
}`;

export const layout = { areaId: 'content', sortOrder: 20 };

interface DuplicateParticipant {
  participantId: number;
  uuid: string;
  firstName: string;
  lastName: string;
  editUrl: string;
  customer: { fullName: string } | null;
  registrations: { total: number } | null;
}

interface DuplicateGroup {
  key: string;
  score: number;
  participants: DuplicateParticipant[];
}

interface Props {
  participantDuplicateGroups: DuplicateGroup[];
  mergeApi: string;
}

function pairsOf<T>(items: T[]): [T, T][] {
  const result: [T, T][] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      result.push([items[i], items[j]]);
    }
  }
  return result;
}

export default function ParticipantDuplicatesGrid({
  participantDuplicateGroups = [],
  mergeApi
}: Props) {
  const modal = useModal();
  const [activePair, setActivePair] = React.useState<
    [DuplicateParticipant, DuplicateParticipant] | null
  >(null);

  const openPair = (pair: [DuplicateParticipant, DuplicateParticipant]) => {
    setActivePair(pair);
    modal.openModal();
  };

  const rows = participantDuplicateGroups.flatMap((group) =>
    pairsOf(group.participants).map((pair, index) => ({
      key: `${group.key}-${index}`,
      score: group.score,
      pair
    }))
  );

  return (
    <Card title="Possible duplicates">
      {modal.state.showing && activePair && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <ParticipantMergeForm
                participantA={activePair[0]}
                participantB={activePair[1]}
                mergeApi={mergeApi}
                closeModal={() => {
                  modal.closeModal();
                  setActivePair(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
      <Card.Session>
        {rows.length === 0 && <div>No possible duplicates found.</div>}
        {rows.length > 0 && (
          <table className="listing">
            <thead>
              <tr>
                <th>Participants</th>
                <th>Similarity</th>
                <th>Registrations</th>
                <th>Customers</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, score, pair: [a, b] }) => (
                <tr key={key}>
                  <td>
                    <a href={a.editUrl}>
                      {a.firstName} {a.lastName}
                    </a>
                    {' vs. '}
                    <a href={b.editUrl}>
                      {b.firstName} {b.lastName}
                    </a>
                  </td>
                  <td>{Math.round(score * 100)}%</td>
                  <td>
                    {a.registrations?.total ?? 0} / {b.registrations?.total ?? 0}
                  </td>
                  <td>
                    {a.customer?.fullName ?? '—'} / {b.customer?.fullName ?? '—'}
                  </td>
                  <td>
                    <Button
                      title="Review merge"
                      variant="interactive"
                      onAction={() => openPair([a, b])}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card.Session>
    </Card>
  );
}

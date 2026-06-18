import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Checkbox } from '@components/common/form/fields/Checkbox';
import { Form } from '@components/common/form/Form';
import SortableHeader from '@components/common/grid/headers/Sortable';
import Pagination from '@components/common/grid/Pagination';
import ParticipantFirstNameRow from '@components/admin/camp/participantGrid/rows/ParticipantFirstName.jsx';
import ParticipantLastNameRow from '@components/admin/camp/participantGrid/rows/ParticipantLastName.jsx';
import { useAlertContext } from '@components/common/modal/Alert';
import axios from 'axios';
import React, { useState } from 'react';
import * as XLSX from "xlsx";
import { GraphQLFilter } from '../../../../../types';

export const query = `
  query Query($filters: [FilterInput]) {
    participants (filters: $filters) {
      items {
        participantId
        uuid
        firstName
        lastName
        editUrl
        deleteApi
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;

export const layout = { areaId: "content", sortOrder: 20 };

interface Participant {
  participantId: number;
  uuid: string;
  firstName: string;
  lastName: string;
  editUrl: string;
  deleteApi: string;
}

interface ActionsProps {
  participants: Participant[];
  selectedIds: string[];
}

function Actions({ participants = [], selectedIds = [] }: ActionsProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const deleteParticipants = async () => {
    setIsLoading(true);
    const promises = participants
      .filter((participant) => selectedIds.includes(participant.uuid))
      .map((participant) => axios.delete(participant.deleteApi));
    await Promise.all(promises);
    setIsLoading(false);
    window.location.reload();
  };

  const actions = [
    {
      name: 'Delete',
      onAction: () => {
        openAlert({
          heading: `Delete ${selectedIds.length} participants`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deleteParticipants();
            },
            variant: 'critical',
            isLoading
          }
        });
      }
    }
  ];

  return (
    <tr>
      {selectedIds.length === 0 && null}
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan={100}>
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a href="#" className="font-semibold pt-3 pb-3 pl-6 pr-6">
              {selectedIds.length} selected
            </a>
            {actions.map((action, index) => (
              <a
                key={index}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  action.onAction();
                }}
                className="font-semibold pt-3 pb-3 pl-6 pr-6 block border-l border-divider self-center"
              >
                <span>{action.name}</span>
              </a>
            ))}
          </div>
        </td>
      )}
    </tr>
  );
}

interface ParticipantGridProps {
  participants: {
    items: Participant[];
    total: number;
    currentFilters: GraphQLFilter[];
  };
}

export default function ParticipantGrid({
  participants: { items: participants, total, currentFilters = [] },
}: ParticipantGridProps) {
  const page = currentFilters.find((filter) => filter.key === 'page')
    ? parseInt(currentFilters.find((filter) => filter.key === 'page')!.value, 10)
    : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit')
    ? parseInt(
        currentFilters.find((filter) => filter.key === 'limit')!.value,
        10
      )
    : 20;
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <Card>
      <Card.Session
        title={
          <Form submitBtn={false} id="participantGridFilter">
            <Field
              type="text"
              id="name"
              name="name"
              placeholder="Search"
              value={currentFilters.find((f) => f.key === 'name')?.value}
              onKeyPress={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  const url = new URL(document.location.href);
                  const name = (document.getElementById('name') as HTMLInputElement)?.value;
                  if (name) {
                    url.searchParams.set('name[operation]', 'like');
                    url.searchParams.set('name[value]', name);
                  } else {
                    url.searchParams.delete('name[operation]');
                    url.searchParams.delete('name[value]');
                  }
                  window.location.href = url.href;
                }
              }}
            />
          </Form>
        }
        actions={[
          {
            variant: 'interactive',
            name: 'Export to Excel',
            onAction: () => {
              exportToExcel(participants);
            }
          },
          {
            variant: 'interactive',
            name: 'Clear filter',
            onAction: () => {
              const url = new URL(document.location.href);
              url.search = '';
              window.location.href = url.href;
            }
          }
        ]}
      />
      <table className="listing sticky">
        <thead>
          <tr>
            <th>
              <Checkbox
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSelectedRows(
                    e.target.checked ? participants.map((p) => p.uuid) : []
                  )
                }
              />
            </th>
            <SortableHeader
              title="First Name"
              name="firstName"
              currentFilters={currentFilters}
            />
            <SortableHeader
              title="Last Name"
              name="lastName"
              currentFilters={currentFilters}
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            participants={participants}
            selectedIds={selectedRows}
          />
          {participants.map((p) => (
            <tr key={p.participantId}>
              <td style={{ width: '2rem' }}>
                <Checkbox
                  isChecked={selectedRows.includes(p.uuid)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.checked)
                      setSelectedRows(selectedRows.concat([p.uuid]));
                    else
                      setSelectedRows(selectedRows.filter((r) => r !== p.uuid));
                  }}
                />
              </td>
              <Area
                className=""
                id="participantGridRow"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => <ParticipantFirstNameRow participant={p} />
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => <ParticipantLastNameRow participant={p} />
                    },
                    sortOrder: 25
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {participants.length === 0 && (
        <div className="flex w-full justify-center">
          No participants to display.
        </div>
      )}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

function exportToExcel(participants: Participant[]) {
  if (!participants || participants.length === 0) {
    alert("No participants to export");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(
    participants.map((p) => ({
      ID: p.participantId,
      "First Name": p.firstName,
      "Last Name": p.lastName,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");

  XLSX.writeFile(workbook, "participants.xlsx");
}

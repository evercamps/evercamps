import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Checkbox } from '@components/common/form/fields/Checkbox';
import { Form } from '@components/common/form/Form';
import SortableHeader from '@components/common/grid/headers/Sortable';
import Pagination from '@components/common/grid/Pagination';
import BasicRow from '@components/common/grid/rows/BasicRow';
import StatusRow from '@components/common/grid/rows/StatusRow';
import ParticipantFirstNameRow from '@components/admin/camp/participantGrid/rows/ParticipantFirstName.jsx';
import ParticipantLastNameRow from '@components/admin/camp/participantGrid/rows/ParticipantLastName.jsx';
import Filter from '@components/common/list/Filter';
import { useAlertContext } from '@components/common/modal/Alert';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

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

function Actions({ participants = [], selectedIds = [] }) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const deleteParticipants = async () => {
    setIsLoading(true);
    const promises = participants
      .filter((participant) => selectedIds.includes(participant.uuid))
      .map((participant) => axios.delete(participant.deleteApi));
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
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
        <td style={{ borderTop: 0 }} colSpan="100">
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

Actions.propTypes = {
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  participants: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function ParticipantGrid({
  participants: { items: participants, total, currentFilters = [] },
}) {
  const page = currentFilters.find((filter) => filter.key === 'page')
    ? parseInt(currentFilters.find((filter) => filter.key === 'page').value, 10)
    : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit')
    ? parseInt(
        currentFilters.find((filter) => filter.key === 'limit').value,
        10
      )
    : 20;
  const [selectedRows, setSelectedRows] = useState([]);
  const { openAlert, closeAlert } = useAlertContext();  

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
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const url = new URL(document.location);
                  const name = document.getElementById('name')?.value;
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
            name: 'Clear filter',
            onAction: () => {
              // Just get the url and remove all query params
              const url = new URL(document.location);
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
                onChange={(e) =>
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
            setSelectedRows={setSelectedRows}
          />
          {participants.map((p) => (
            <tr key={p.participantId}>
              <td style={{ width: '2rem' }}>
                <Checkbox
                  isChecked={selectedRows.includes(p.uuid)}
                  onChange={(e) => {
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
        row={p}
        noOuter
        coreComponents={[
          {
            component: {
              default: () => <ParticipantFirstNameRow id="firstName" participant={p} />
            },
            sortOrder: 10
          },
          {
            component: {
              default: () => <ParticipantLastNameRow id="lastName" participant={p} />
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

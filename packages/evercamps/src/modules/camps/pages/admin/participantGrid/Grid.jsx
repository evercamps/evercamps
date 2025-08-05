import { Card } from '@components/admin/cms/Card';
import CreateAt from '@components/admin/customer/customerGrid/rows/CreateAt';
import CustomerNameRow from '@components/admin/customer/customerGrid/rows/CustomerName';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Checkbox } from '@components/common/form/fields/Checkbox';
import { Form } from '@components/common/form/Form';
import SortableHeader from '@components/common/grid/headers/Sortable';
import Pagination from '@components/common/grid/Pagination';
import BasicRow from '@components/common/grid/rows/BasicRow';
import StatusRow from '@components/common/grid/rows/StatusRow';
import Filter from '@components/common/list/Filter';
import { useAlertContext } from '@components/common/modal/Alert';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

export const query = `
  query Query($filters: [FilterInput]) {
    participants (filters: $filters) {
      items {
        id
        firstName
        lastName
        dateOfBirth
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

export default function ParticipantGrid({
  participants: { items: participants, total, currentFilters = [] },
}) {
  console.log(participants);
  console.log(currentFilters);
  const [selectedRows, setSelectedRows] = useState([]);
  const { openAlert, closeAlert } = useAlertContext();

  const patchSelected = async (status) => {
    const promises = items
      .filter((p) => selectedRows.includes(p.id))
      .map((p) =>
        axios.patch(p.updateApi, {
          status,
        })
      );
    await Promise.all(promises);
    window.location.reload();
  };

  const actions = [
    {
      name: "Deactivate",
      onAction: () =>
        openAlert({
          heading: `Deactivate ${selectedRows.length} participants`,
          content: "Are you sure?",
          primaryAction: {
            title: "Cancel",
            onAction: closeAlert,
            variant: "primary",
          },
          secondaryAction: {
            title: "Deactivate",
            onAction: async () => await patchSelected(0),
            variant: "critical",
            isLoading: false,
          },
        }),
    },
    {
      name: "Activate",
      onAction: () =>
        openAlert({
          heading: `Activate ${selectedRows.length} participants`,
          content: "Are you sure?",
          primaryAction: {
            title: "Cancel",
            onAction: closeAlert,
            variant: "primary",
          },
          secondaryAction: {
            title: "Activate",
            onAction: async () => await patchSelected(1),
            variant: "critical",
            isLoading: false,
          },
        }),
    },
  ];

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
              const url = new URL(document.location);
              url.search = '';
              window.location.href = url.href;
            }
          }
        ]}
      />
      <table className="listing sticky">
        <thead>
          
        </thead>
        <tbody>
          {selectedRows.length > 0 && (
            <tr>
              <td colSpan="100" style={{ borderTop: 0 }}>
                <div className="inline-flex border border-divider rounded justify-items-start">
                  <span className="font-semibold pt-3 pb-3 pl-6 pr-6">
                    {selectedRows.length} selected
                  </span>
                  {actions.map((action, index) => (
                    <a
                      href="#"
                      key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        action.onAction();
                      }}
                      className="font-semibold pt-3 pb-3 pl-6 pr-6 block border-l border-divider self-center"
                    >
                      {action.name}
                    </a>
                  ))}
                </div>
              </td>
            </tr>
          )}
          {participants.map((p) => (
            <tr key={p.id}>
              <td style={{ width: '2rem' }}>
                <Checkbox
                  isChecked={selectedRows.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedRows((prev) => [...prev, p.id]);
                    else
                      setSelectedRows((prev) => prev.filter((id) => id !== p.id));
                  }}
                />
              </td>
              <td>{p.firstName}</td>
              <td>{p.lastName}</td>
              <td>{p.dateOfBirth}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {participants.length === 0 && (
        <div className="flex w-full justify-center">
          No participants to display.
        </div>
      )}
      {/* <Pagination total={total} limit={limit} page={page} /> */}
    </Card>
  );
}

import { Card } from '@components/admin/cms/Card';
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
    registrations(filters: $filters) {
      total
      items {
        productId
        name
        registrationId
        participant {
          firstName
          lastName
        }
      }    
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

function Actions({ registrations = [], selectedIds = [] }) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  // const deleteRegistrations = async () => {
  //   setIsLoading(true);
  //   const promises = registrations
  //     .filter((registration) => selectedIds.includes(registration.registrationId))
  //     .map((registration) => axios.delete(registration.deleteApi));
  //   await Promise.all(promises);
  //   setIsLoading(false);
  //   // Refresh the page
  //   window.location.reload();
  // };

  const actions = [
    {
      name: 'Delete',
      onAction: () => {
        openAlert({
          heading: `Delete ${selectedIds.length} registrations`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deleteRegistrations();
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
  selectedIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  registrations: PropTypes.arrayOf(
    PropTypes.shape({
      registrationId: PropTypes.number.isRequired
    })
  ).isRequired
};

export default function RegistrationGrid({
  registrations: { items: registrations, total, currentFilters = [] },
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
          <Form submitBtn={false} id="registrationGridFilter">
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
                    e.target.checked ? registrations.map((r) => r.registrationId) : []
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

              <SortableHeader
                title="Product"
                name="product"
                currentFilters={currentFilters}
              />
                       
          </tr>
        </thead>        
        <tbody>
          <Actions
            registrations={registrations}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
          />
          {registrations.map((r) => (
            <tr key={r.registrationId}>
              <td style={{ width: '2rem' }}>
                <Checkbox
                  isChecked={selectedRows.includes(r.registrationId)}
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedRows(selectedRows.concat([r.registrationId]));
                    else
                      setSelectedRows(selectedRows.filter((id) => id !== r.registrationId));
                  }}
                />
      </td>
      <td>{r.participant.firstName}</td>
      <td>{r.participant.lastName}</td>  
      <td>{r.name}</td>      
    </tr>
  ))}
        </tbody>
      </table>
      {registrations.length === 0 && (
        <div className="flex w-full justify-center">
          No registrations to display.
        </div>
      )}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { SimplePageination } from '@components/common/SimplePagination';
import Spinner from '@components/common/Spinner';
import CheckIcon from '@heroicons/react/outline/CheckIcon';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

const CustomerSearchQuery = `
  query GetCustomers($filters: [FilterInput!]) {
    customers(filters: $filters) {
      items {
        customerId
        name
        email
      }
      total
    }
  }
`;

function CustomerSelector({ onSelect, onUnSelect, selectedChecker, closeModal, disableSelection }) {
  const limit = 10;
  const [inputValue, setInputValue] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const [result, reexecuteQuery] = useQuery({
    query: CustomerSearchQuery,
    variables: {
      filters: inputValue
        ? [
            { key: 'keyword', operation: 'eq', value: inputValue },
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: limit.toString() }
          ]
        : [
            { key: 'limit', operation: 'eq', value: limit.toString() },
            { key: 'page', operation: 'eq', value: page.toString() }
          ]
    },
    pause: true
  });

  const selectCustomer = async (customer) => {
    try {
      await onSelect(customer);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const unSelectCustomer = async (customer) => {
    try {
      await onUnSelect(customer);
    } catch (e) {
      toast.error(e.message);
    }
  };

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (inputValue !== null) {
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, [page]);

  const { data, fetching, error } = result;

  if (error) {
    return <p>There was an error fetching customers. {error.message}</p>;
  }

  return (
    <Card title="Select Customer">
      <div className="modal-content">
        <Card.Session>
          <div>
            <div className="border rounded border-divider mb-8">
              <input
                type="text"
                value={inputValue || ''}
                placeholder="Search customers"
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setLoading(true);
                }}
              />
            </div>
            {(fetching || loading) && (
              <div className="p-3 border border-divider rounded flex justify-center items-center">
                <Spinner width={25} height={25} />
              </div>
            )}
            {!fetching && data && !loading && (
              <div className="divide-y">
                {data.customers.items.length === 0 && (
                  <div className="p-3 border border-divider rounded flex justify-center items-center">
                    {inputValue ? (
                      <p>No customers found for query &quot;{inputValue}&rdquo;</p>
                    ) : (
                      <p>You have no customers to display</p>
                    )}
                  </div>
                )}
                {data.customers.items.map((customer) => (
                  <div
                    key={customer.customerId}
                    className="grid grid-cols-8 gap-8 py-4 border-divider items-center"
                  >
                    <div className="col-span-6">
                      <h3>{customer.name}</h3>
                      <p>{customer.email}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      {!selectedChecker(customer) && !disableSelection && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={async (e) => {
                            e.preventDefault();
                            await selectCustomer(customer);
                          }}
                        >
                          Select
                        </button>
                      )}
                      {selectedChecker(customer) && (
                        <a
                          className="button primary"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            unSelectCustomer(customer);
                          }}
                        >
                          <CheckIcon width={20} height={20} />
                        </a>
                      )}
                      {disableSelection && !selectedChecker(customer) && (
                        <span className="text-gray-400">Disabled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card.Session>
      </div>
      <Card.Session>
        <div className="flex justify-between gap-8">
          <SimplePageination
            total={data?.customers.total || 0}
            count={data?.customers?.items?.length || 0}
            page={page}
            hasNext={limit * page < data?.customers.total}
            setPage={setPage}
          />
          <Button title="Close" variant="secondary" onAction={closeModal} />
        </div>
      </Card.Session>
    </Card>
  );
}

CustomerSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onUnSelect: PropTypes.func.isRequired,
  selectedChecker: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
  disableSelection: PropTypes.bool
};

CustomerSelector.defaultProps = {
  disableSelection: false
};

export default CustomerSelector;

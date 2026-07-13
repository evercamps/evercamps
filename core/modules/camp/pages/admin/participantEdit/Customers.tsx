import { Card } from '@components/admin/cms/Card';
import { useModal } from '@components/common/modal/useModal';
import React from 'react';
import { useQuery } from 'urql';

import './Customers.scss';
import AddCustomer from '@components/admin/camp/participantEdit/AddCustomer.jsx';
import Spinner from '@components/common/Spinner';

const CustomerQuery = `
  query Query($participantUuid: String!) {
    participant(id: $participantUuid) {
      participantId
      customer {
        uuid
        customerId
        name
        email
      }
    }
  }
`;

interface Participant {
  participantId: number;
  uuid: string;
  addCustomerUrl: string;
  removeCustomerUrl: string;
}

interface Props {
  participant: Participant;
}

export default function Customer({ participant }: Props) {
  const modal = useModal();
  const [removing, setRemoving] = React.useState(false);

  const [result, reexecuteQuery] = useQuery({
    query: CustomerQuery,
    variables: {
      participantUuid: participant.uuid
    },
    pause: true
  });

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);

  const closeModal = () => {
    reexecuteQuery({ requestPolicy: 'network-only' });
    modal.closeModal();
  };

  const removeCustomer = async (api: string) => {
    setRemoving(true);
    await fetch(api, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    });
    setRemoving(false);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const { data, fetching, error } = result;

  if (error) return <p>Oh no... {error.message}</p>;

  if (data || fetching) {
    const customer = data?.participant.customer;
    return (
      <Card
        title="Customer"
        actions={customer ? [] : [{ name: 'Assign Customer', onAction: () => modal.openModal() }]}
      >
        {modal.state.showing && (
          <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
            <div className="modal-wrapper flex self-center justify-center items-center" tabIndex={-1} role="dialog">
              <div className="modal">
                <AddCustomer
                  addCustomerApi={participant.addCustomerUrl}
                  closeModal={closeModal}
                  currentCustomerId={customer?.customerId || null}
                />
              </div>
            </div>
          </div>
        )}
        <Card.Session>
          {fetching && (
            <div className="p-3 border border-divider rounded flex justify-center items-center">
              <Spinner width={25} height={25} />
            </div>
          )}
          {!fetching && (
            <div>
              {customer ? (
                <div className="flex justify-between items-center border border-divider p-4 rounded">
                  <div>
                    <div className="font-semibold">{customer.name}</div>
                    <div>{customer.email}</div>
                  </div>
                  <div>
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        await removeCustomer(participant.removeCustomerUrl);
                      }}
                      className="text-critical"
                    >
                      {removing ? 'Removing...' : 'Remove'}
                    </a>
                  </div>
                </div>
              ) : (
                <div>No customer assigned.</div>
              )}
            </div>
          )}
        </Card.Session>
      </Card>
    );
  }

  return null;
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 16
};

export const query = `
  query Query {
    participant(id: getContextValue("participantUuid", null)) {
      participantId
      uuid
      addCustomerUrl
      removeCustomerUrl
    }
  }
`;

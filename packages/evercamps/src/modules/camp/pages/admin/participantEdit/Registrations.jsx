import { Card } from '@components/admin/cms/Card';
import { useModal } from '@components/common/modal/useModal';
import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';

import './Registrations.scss';
import AddRegistrations from '@components/admin/camp/participantEdit/AddRegistrations.jsx';
import Spinner from '@components/common/Spinner';

const RegistrationsQuery = `
  query Query($participantId: Int!, $filters: [FilterInput!]) {
  participant(id: $participantId) {
    participantId
    registrations(filters: $filters) {
      total
      items {
        productId
        name
        productSku
        sku
        registrationId    
        description    
        editUrl
        image
      }
    }
  }
}
`;

export default function Registrations({ participant, addRegistrationUrl }) {
  const [keyword, setKeyword] = React.useState('');
  const [page, setPage] = React.useState(1);
  const modal = useModal();
  // UseQuery with filters and pagination
  const [result, reexecuteQuery] = useQuery({
    query: RegistrationsQuery,
    variables: {
      filters: !keyword
        ? [
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: '10' }
          ]
        : [
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: '10' },
            { key: 'keyword', operation: 'eq', value: keyword }
          ],
      participantId: participant.participantId
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

  React.useEffect(() => {
    const timer = setTimeout(() => {
      reexecuteQuery({ requestPolicy: 'network-only' });
    }, 1500);

    return () => clearTimeout(timer);
  }, [keyword]);

  React.useEffect(() => {
    if (result.fetching) {
      return;
    }
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, [page]);

  const { data, fetching, error } = result;

  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  if (data || fetching) {
    return (
      <Card
        title="Registrations"
        actions={[
          {
            name: 'Add registration',
            onAction: () => {
              modal.openModal();
            }
          }
        ]}
      >
        {modal.state.showing && (
          <div
            className={modal.className}
            onAnimationEnd={modal.onAnimationEnd}
          >
            <div
              className="modal-wrapper flex self-center justify-center items-center"
              tabIndex={-1}
              role="dialog"
            >
              <div className="modal">
                <AddRegistrations
                  addRegistrationApi={addRegistrationUrl}
                  participantId={participant.participantId}
                  closeModal={closeModal}
                  addedProductIDs={data?.participant.registrations?.items?.map((r) => r.productId) || []}
                />
              </div>
            </div>
          </div>
        )}
        <Card.Session>
          <div>
            <div className="border rounded border-divider mb-8">
              <input
                type="text"
                value={keyword}
                placeholder="Search registrations"
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            {data && (
              <>
                {data.participant.registrations.length === 0 && (
                  <div>No product to display.</div>
                )}
                <div className="flex justify-between">
                  <div>
                    <i>{data.participant.registrations.total} items</i>
                  </div>
                  <div>
                    {data.participant.registrations.total > 10 && (
                      <div className="flex justify-between gap-4">
                        {page > 1 && (
                          <a
                            className="text-interactive"
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(page - 1);
                            }}
                          >
                            Previous
                          </a>
                        )}
                        {page < data.participant.registrations.total / 10 && (
                          <a
                            className="text-interactive"
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(page + 1);
                            }}
                          >
                            Next
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="divide-y">
                  {data.participant.registrations.items.map((r) => {
                const p = r;
                return (
                  <div
                    key={r.registrationId}
                    className="grid grid-cols-8 gap-8 py-4 border-divider items-center"
                  >
                    <div className="grid-thumbnail text-border border border-divider p-3 rounded flex justify-center col-span-1">
                      {p?.image ? (
                        <img className="self-center" src={p.image.url} alt="" />
                      ) : (
                        <svg
                          className="self-center"
                          xmlns="http://www.w3.org/2000/svg"
                          width="2rem"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="col-span-5">
                      <a href={p?.editUrl || ''} className="font-semibold hover:underline">
                        {p?.name}
                      </a>
                      <div>{p?.sku}</div>
                      <div>{p?.price?.regular?.text}</div>
                    </div>
                  </div>
                );
              })}
                </div>
              </>
            )}
            {fetching && (
              <div className="p-3 border border-divider rounded flex justify-center items-center">
                <Spinner width={25} height={25} />
              </div>
            )}
          </div>
        </Card.Session>
      </Card>
    );
  }

  return null;
}

Registrations.propTypes = {
  participant: PropTypes.shape({
    participantId: PropTypes.number.isRequired    
  }),
  addRegistrationUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    participant(id: getContextValue("participantId", null)) {
      participantId
    }
    addRegistrationUrl: url(routeId: "createRegistration")
  }
`;
import { AddressSummary } from '@components/customer/address/AddressSummary';
import { Form } from '@components/form/Form';
import { useModal } from '@components/modal/useModal';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index';
import React, { useRef } from 'react';
import { toast } from 'react-toastify';

import { _ } from '../../../../../lib/locale/translate/_.js';

interface Address {
  uuid: string;
  fullName: string;
  address1: string;
  city: string;
  postcode: string;
  country?: {
    name: string;
    code: string;
  };
  province?: {
    name?: string;
    code?: string;
  };
  telephone: string;
  isDefault?: boolean;
  updateApi: string;
  deleteApi: string;
}

interface Account {
  addresses: Address[];
  addAddressApi: string;
}

interface Setting {
  customerAddressSchema: Record<string, unknown>;
}

interface AddressesProps {
  account: Account;
  setting: Setting;
}

export default function Addresses({
  account: { addresses, addAddressApi },
  setting: { customerAddressSchema }
}: AddressesProps): React.ReactElement {
  const modal = useModal();
  const isLoading = useRef(false);
  const editingAddress = useRef<Address | null>(null);

  return (
    <div>
      {addresses.length === 0 && (
        <div className="order-history-empty">
          {_('You have no addresses saved')}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {addresses.map((address) => (
          <div
            key={address.uuid}
            className={
              address.isDefault
                ? 'border rounded border-green-700 p-5'
                : 'border rounded border-gray-300 p-5'
            }
          >
            <AddressSummary address={address} />

            <div className="flex justify-end gap-5">
              <a
                href="#"
                className="text-interactive underline"
                onClick={(e) => {
                  e.preventDefault();

                  if (isLoading.current) return;

                  editingAddress.current = address;
                  modal.openModal();
                }}
              >
                {_('Edit')}
              </a>

              {!address.isDefault && (
                <a
                  href="#"
                  className="text-interactive underline"
                  onClick={async (e) => {
                    e.preventDefault();

                    if (isLoading.current) return;

                    isLoading.current = true;

                    const response = await fetch(address.deleteApi, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        is_default: 1
                      })
                    });

                    const data = await response.json();

                    if (!data.error) {
                      toast.success(_('Address has been set as default!'));
                      isLoading.current = false;

                      setTimeout(() => {
                        window.location.reload();
                      }, 1500);
                    } else {
                      toast.error(data.error.message);
                    }
                  }}
                >
                  {_('Make default')}
                </a>
              )}

              <a
                href="#"
                className="text-critical underline"
                onClick={async (e) => {
                  e.preventDefault();

                  if (isLoading.current) return;

                  isLoading.current = true;

                  const response = await fetch(address.deleteApi, {
                    method: 'DELETE'
                  });

                  const data = await response.json();

                  if (!data.error) {
                    toast.success(
                      _('Address has been deleted successfully!')
                    );

                    isLoading.current = false;

                    setTimeout(() => {
                      window.location.reload();
                    }, 1500);
                  } else {
                    toast.error(data.error.message);
                  }
                }}
              >
                {_('Delete')}
              </a>
            </div>
          </div>
        ))}
      </div>

      <br />

      <a
        href="#"
        className="text-interactive underline"
        onClick={(e) => {
          e.preventDefault();

          if (isLoading.current) return;

          editingAddress.current = null;
          modal.openModal();
        }}
      >
        {_('Add new address')}
      </a>

      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <div className="bg-white p-8">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="mb-3">
                    {editingAddress.current
                      ? _('Edit address')
                      : _('Add new address')}
                  </h2>

                  <a
                    href="#"
                    className="text-critical underline"
                    onClick={(e) => {
                      e.preventDefault();
                      modal.closeModal();
                    }}
                  >
                    {_('Close')}
                  </a>
                </div>

                <Form
                  id="customerAddressForm"
                  method={editingAddress.current ? 'PATCH' : 'POST'}
                  action={
                    editingAddress.current
                      ? editingAddress.current.updateApi
                      : addAddressApi
                  }
                  onSuccess={(response) => {
                    const data = response as {
                      error?: {
                        message: string;
                      };
                    };

                    if (!data.error) {
                      modal.closeModal();
                      toast.success(
                        _('Address has been saved successfully!')
                      );

                      setTimeout(() => {
                        window.location.reload();
                      }, 1500);
                    } else {
                      toast.error(data.error.message);
                    }
                  }}
                  dataFilter={(data) => {
                    const formData = data as {
                      address?: Record<string, unknown>;
                    };

                    return {
                      ...formData.address
                    };
                  }}
                >
                  <CustomerAddressForm
                    address={editingAddress.current ?? undefined}
                    customerAddressSchema={customerAddressSchema}
                  />
                </Form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'accountPageAddressBook',
  sortOrder: 10
};

export const query = `
  query Query {
    account: currentCustomer {
      uuid
      fullName
      email
      addresses {
        uuid
        fullName
        address1
        city
        postcode
        country {
          name
          code
        }
        province {
          name
          code
        }
        telephone
        isDefault
        updateApi
        deleteApi
      }
      addAddressApi
    }
    setting {
      customerAddressSchema
    }
  }
`;
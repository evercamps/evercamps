import CustomerSelector from './CustomerSelector.jsx';
import React from 'react';
import { toast } from 'react-toastify';

interface Props {
  addCustomerApi: string;
  currentCustomerId?: number | null;
  closeModal: () => void;
}

function AddCustomer({ addCustomerApi, currentCustomerId = null, closeModal }: Props) {
  const [selectedCustomer, setSelectedCustomer] = React.useState<number | null>(currentCustomerId);

  const assignCustomer = async (customerId: number) => {
    const response = await fetch(addCustomerApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: customerId
      }),
      credentials: 'include'
    });

    const { data } = await response.json();

    if (!data.success) {
      toast.error(data.message);
    } else {
      toast.success('Customer assigned successfully');
      closeModal();
    }
  };

  return (
    <CustomerSelector
      onSelect={async (customer) => {
        setSelectedCustomer(customer.customerId);
        await assignCustomer(customer.customerId);
      }}
      onUnSelect={async () => {}}
      selectedChecker={(customer: any) => selectedCustomer === customer.customerId}
      closeModal={closeModal}
      disableSelection={Boolean(selectedCustomer)}
    />
  );
}

export default AddCustomer;

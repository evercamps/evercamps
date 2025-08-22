import CustomerSelector from './CustomerSelector.jsx';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';

function AddCustomer({ addCustomerApi, currentCustomerId, closeModal }) {
  const [selectedCustomer, setSelectedCustomer] = React.useState(currentCustomerId || null);

  const assignCustomer = async (customerId) => {
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
      onSelect={(customer) => {
        setSelectedCustomer(customer.customerId);
        assignCustomer(customer.customerId);
      }}
      onUnSelect={() => {}}
      selectedChecker={(customer) => selectedCustomer === customer.customerId}
      closeModal={closeModal}
      disableSelection={Boolean(selectedCustomer)}
    />
  );
}

AddCustomer.propTypes = {
  addCustomerApi: PropTypes.string.isRequired,
  currentCustomerId: PropTypes.number,
  closeModal: PropTypes.func.isRequired
};

AddCustomer.defaultProps = {
  currentCustomerId: null
};

export default AddCustomer;

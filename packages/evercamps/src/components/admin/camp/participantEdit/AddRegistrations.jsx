import RegistrationSkuSelector from '@components/admin/promotion/couponEdit/RegistrationSkuSelector';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';

function AddRegistrations({ addRegistrationApi, participantId, addedProductIDs, closeModal }) {
  const [addedProducts, setAddedProducts] = React.useState(addedProductIDs);  
  const addRegistration = async (sku, uuid, productId) => {
    const response = await fetch(addRegistrationApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        registration_product_id: productId,
        registration_participant_id: participantId
      }),
      credentials: 'include'
    });
    const {data} = await response.json();
    if (!data.success) {
      toast.error(data.message);
    } else {
      setAddedProducts([...addedProducts, data.registration_product_id]);      
    }   
    
  };

  return (
    <RegistrationSkuSelector
      onSelect={addRegistration}
      closeModal={closeModal}
      selectedChecker={(product) =>
        addedProducts.find((p) => p == product.productId)
      }
      onUnSelect={() => {}}
    />
  );
}

AddRegistrations.propTypes = {
  addRegistrationApi: PropTypes.string.isRequired,
  participantId: PropTypes.number.isRequired,
  addedProductIDs: PropTypes.arrayOf(PropTypes.number),
  closeModal: PropTypes.func.isRequired
};

AddRegistrations.defaultProps = {
  addedProductIDs: []
};

export default AddRegistrations;

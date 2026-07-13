import RegistrationSkuSelector from '@components/admin/promotion/couponEdit/RegistrationSkuSelector';
import React from 'react';
import { toast } from 'react-toastify';

interface Props {
  addRegistrationApi: string;
  participantId: number;
  addedProductIDs?: number[];
  closeModal: () => void;
}

function AddRegistrations({ addRegistrationApi, participantId, addedProductIDs = [], closeModal }: Props) {
  const [addedProducts, setAddedProducts] = React.useState<number[]>(addedProductIDs);

  const addRegistration = async (sku: string, uuid: string, productId: number) => {
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
    const { data } = await response.json();
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
      selectedChecker={(product: any) =>
        addedProducts.find((p) => p == product.productId)
      }
      onUnSelect={() => {}}
    />
  );
}

export default AddRegistrations;

import ProductSkuSelector from '@components/admin/promotion/couponEdit/ProductSkuSelector';
import React from 'react';
import { toast } from 'react-toastify';

interface AddProductsProps {
  addProductApi: string;
  addedProductIDs?: number[];
  closeModal: () => void;
}

interface AddProductResponse {
  success: boolean;
  message?: string;
  data?: {
    product_id: number;
  };
}

interface ProductSelectorItem {
  productId: number;
}

export default function AddProducts({
  addProductApi,
  addedProductIDs = [],
  closeModal
}: AddProductsProps) {
  const [addedProducts, setAddedProducts] =
    React.useState<number[]>(addedProductIDs);

  const addProduct = async (sku: string, uuid: number) => {
    const response = await fetch(addProductApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: uuid
      }),
      credentials: 'include'
    });

    const data = (await response.json()) as AddProductResponse;

    if (!data.success) {
      toast.error(data.message);
    } else if (data.data) {
      setAddedProducts([...addedProducts, data.data.product_id]);
    }
  };

  return (
    <ProductSkuSelector
      onSelect={addProduct}
      closeModal={closeModal}
      selectedChecker={(product: ProductSelectorItem) =>
        addedProducts.includes(product.productId)
      }
      onUnSelect={() => {}}
    />
  );
}
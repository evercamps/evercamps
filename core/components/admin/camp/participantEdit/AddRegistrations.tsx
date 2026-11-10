import RegistrationSkuSelector from '@components/admin/promotion/couponEdit/RegistrationSkuSelector';
import React from 'react';
import { toast } from 'react-toastify';
import { useClient } from 'urql';

interface Props {
  addRegistrationApi: string;
  participantId: number;
  addedProductIDs?: number[];
  closeModal: () => void;
}

interface ProductVariant {
  productVariantId: number;
  sku: string;
  title: string | null;
  isDefault: boolean;
  price: { text: string };
}

const VariantsQuery = `
  query Query($id: ID) {
    product(id: $id) {
      name
      variants {
        productVariantId
        sku
        title
        isDefault
        price {
          text
        }
      }
    }
  }
`;

// Pick a product (RegistrationSkuSelector, shared with the coupon editor and
// left unchanged), then - when the product has several variants, e.g. weeks
// of a camp - pick the variant. Products with a single (default) variant are
// registered straight away, as before.
function AddRegistrations({ addRegistrationApi, participantId, closeModal }: Props) {
  const client = useClient();
  const [choosing, setChoosing] = React.useState<{
    productId: number;
    productName: string;
    variants: ProductVariant[];
  } | null>(null);

  const postRegistration = async (productId: number, variantId: number | null) => {
    const response = await fetch(addRegistrationApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        registration_product_id: productId,
        registration_participant_id: participantId,
        ...(variantId ? { product_variant_id: variantId } : {})
      }),
      credentials: 'include'
    });
    const json = await response.json();
    if (!json.data?.success) {
      toast.error(json.data?.message || json.error?.message || 'Could not add the registration');
      return false;
    }
    toast.success('Registration added');
    return true;
  };

  const onSelectProduct = async (_sku: string, _uuid: string, productId: number) => {
    const result = await client.query(VariantsQuery, { id: productId }).toPromise();
    const variants: ProductVariant[] = result.data?.product?.variants || [];
    if (variants.length <= 1) {
      await postRegistration(productId, variants[0]?.productVariantId ?? null);
      return;
    }
    setChoosing({
      productId,
      productName: result.data.product.name,
      variants
    });
  };

  if (choosing) {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-4">
          <h3>Choose a variant of {choosing.productName}</h3>
          <a
            href="#"
            className="text-interactive"
            onClick={(e) => {
              e.preventDefault();
              setChoosing(null);
            }}
          >
            Back to products
          </a>
        </div>
        {choosing.variants.map((variant) => (
          <div
            key={variant.productVariantId}
            className="grid grid-cols-8 gap-8 py-4 border-divider items-center"
          >
            <div className="col-span-6">
              <h4>{variant.title || variant.sku}</h4>
              <p className="text-textSubdued">
                {variant.sku} · {variant.price?.text}
              </p>
            </div>
            <div className="col-span-2 text-right">
              <button
                type="button"
                className="button secondary"
                onClick={async (e) => {
                  e.preventDefault();
                  await postRegistration(choosing.productId, variant.productVariantId);
                }}
              >
                Select
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <RegistrationSkuSelector
      onSelect={onSelectProduct}
      closeModal={closeModal}
      // A participant can be registered for several variants (weeks) of the
      // same product, so products are never shown as "already added";
      // duplicates are rejected by createRegistration.
      selectedChecker={() => false}
      onUnSelect={() => {}}
    />
  );
}

export default AddRegistrations;

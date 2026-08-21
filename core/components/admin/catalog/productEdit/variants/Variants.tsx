import { CreateVariant } from '@components/admin/catalog/productEdit/variants/CreateVariant';
import { Variant } from '@components/admin/catalog/productEdit/variants/Variant';
import { Card } from '@components/admin/cms/Card';
import Spinner from '@components/Spinner';
import React from 'react';
import { useQuery } from 'urql';

export const VariantQuery = `
query Query($productId: ID!) {
  product(id: $productId) {
    variantGroup {
      items {
        id
        attributes {
          attributeId
          attributeCode
          optionId
          optionText
        }
        product {
          productId
          uuid
          name
          sku
          status
          visibility
          price {
            regular {
              value
              currency
              text
            }
          }
          inventory {
            qty
            isInStock
            stockAvailability
            manageStock
          }
          editUrl
          updateApi
          image {
            uuid
            url
          }
          gallery {
            uuid
            url
          }
        }
      }
    }
  }
}
`;

export interface VariantOption {
  optionId: number;
  optionText: string;
}

export interface VariantAttribute {
  attributeId: number;
  attributeName: string;
  attributeCode?: string;
  options?: VariantOption[];
}

export interface VariantProduct {
  productId: number;
  uuid: string;
  name: string;
  sku: string;
}

export interface VariantItem {
  id: string;
  product: VariantProduct;
}

export interface VariantGroup {
  variantGroupId: number;
  attributes: VariantAttribute[];
  items?: VariantItem[];
  addItemApi: string;
}

interface VariantQueryData {
  product: {
    variantGroup?: {
      items: VariantItem[];
    } | null;
  };
}

interface VariantsProps {
  productId: number;
  productUuid: string;
  variantGroup?: VariantGroup | null;
  variantAttributes: VariantAttribute[];
  createProductApi: string;
  addVariantItemApi: string;
  productImageUploadUrl: string;
}

export function Variants({
  productId,
  productUuid,
  variantGroup = null,
  variantAttributes,
  createProductApi,
  addVariantItemApi,
  productImageUploadUrl
}: VariantsProps) {
  const [result, reexecuteQuery] = useQuery<VariantQueryData>({
    query: VariantQuery,
    variables: {
      productId
    }
  });

  const refresh = () => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const { data, fetching, error } = result;

  if (fetching) {
    return (
      <div className="p-3 flex justify-center items-center border rounded border-divider">
        <Spinner width={30} height={30} />
      </div>
    );
  }

  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  return (
    <Card.Session>
      <div className="variant-list">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              {variantAttributes.map((attribute) => (
                <th key={attribute.attributeId}>
                  {attribute.attributeName}
                </th>
              ))}
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.product.variantGroup?.items ?? [])
              .filter((v) => v.product.productId !== productId)
              .map((v) => (
                <Variant
                  key={v.id}
                  variant={v}
                  productImageUploadUrl={productImageUploadUrl}
                  refresh={refresh}
                  variantGroup={variantGroup}
                />
              ))}
          </tbody>
        </table>
      </div>

      <div className="self-center">
        <CreateVariant
          productId={productUuid}
          variantGroup={variantGroup}
          createProductApi={createProductApi}
          addVariantItemApi={addVariantItemApi}
          productImageUploadUrl={productImageUploadUrl}
          refresh={refresh}
        />
      </div>
    </Card.Session>
  );
}
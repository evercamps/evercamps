import { New } from '@components/admin/catalog/productEdit/variants/New';
import { VariantGroup, Variants } from '@components/admin/catalog/productEdit/variants/Variants';
import { Card } from '@components/admin/cms/Card';
import React from 'react';

interface Product {
  productId: number;
  uuid: string;
  variantGroup?: VariantGroup | null;
}

interface VariantGroupProps {
  product: Product;
  createVariantGroupApi: string;
  createProductApi: string;
  productImageUploadUrl: string;
}

export default function VariantGroup({
  product,
  createVariantGroupApi,
  createProductApi,
  productImageUploadUrl
}: VariantGroupProps) {
  const [group, setGroup] = React.useState<VariantGroup | null>(
    product.variantGroup ?? null
  );

  return (
    <Card title="Variant">
      {!group && (
        <New
          createVariantGroupApi={createVariantGroupApi}
          setGroup={setGroup}
        />
      )}

      {group && (
        <Variants
          productId={product.productId}
          productUuid={product.uuid}
          variantGroup={group}
          variantAttributes={group.attributes}
          addVariantItemApi={group.addItemApi}
          createProductApi={createProductApi}
          productImageUploadUrl={productImageUploadUrl}
        />
      )}
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 70
};

export const query = `
query Query {
  product(id: getContextValue('productId', null)) {
    productId
    uuid
    variantGroup {
      variantGroupId
      attributes: variantAttributes {
        attributeId
        attributeCode
        attributeName
        options {
          optionId
          optionText
        }
      }
      addItemApi
    }
  }
  createVariantGroupApi: url(routeId: "createVariantGroup")
  createProductApi: url(routeId: "createProduct")
  productImageUploadUrl: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
}
`;
import Area from '@components/Area';
import { Form } from '@components/form/Form';
import React from 'react';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get.js';

interface ProductEditFormProps {
  action: string;
}

interface FormResponse {
  error?: unknown;
  [key: string]: unknown;
}

interface ProductFormData {
  tax_class?: string | null;
  images?: unknown[];
  [key: string]: unknown;
}

export default function ProductEditForm({
  action
}: ProductEditFormProps) {
  const id = 'productForm';

  return (
    <Form
      method="PATCH"
      action={action}
      dataFilter={(formData) => {
        const data = formData as ProductFormData;

        if (data.tax_class === '') {
          data.tax_class = null;
        }

        if (data.images === undefined) {
          data.images = [];
        }

        return data;
      }}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      onSuccess={(response) => {
        const formResponse = response as FormResponse;

        if (formResponse.error) {
          toast.error(String(
            get(
              formResponse,
              'error.message',
              'Something wrong. Please reload the page!'
            ))
          );
        } else {
          toast.success('Product saved successfully!');
        }
      }}
      submitBtn={false}
      id={id}
    >
      <Area id="productForm" noOuter />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateProduct", params: [{key: "id", value: getContextValue("productUuid")}]),
    gridUrl: url(routeId: "productGrid")
  }
`;
import Area from '@components/Area';
import { Form } from '@components/form/Form';
import React from 'react';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get.js';

interface ProductNewFormProps {
  action: string;
}

interface ProductResponse {
  error?: {
    message?: string;
  };
  data?: {
    links: Array<{
      rel: string;
      href: string;
    }>;
  };
}

export default function ProductNewForm({
  action
}: ProductNewFormProps) {
  const id = 'productForm';

  return (
    <Form
      method="POST"
      action={action}
      dataFilter={(formData) => {
        const data = formData as Record<string, any>;

        if (data.tax_class === '') {
          data.tax_class = null;
        }

        return data;
      }}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      onSuccess={(response) => {
        const formResponse = response as ProductResponse
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

          setTimeout(() => {
            const editUrl = formResponse.data?.links.find(
              (link) => link.rel === 'edit'
            )?.href;

            if (editUrl) {
              window.location.href = editUrl;
            }
          }, 1500);
        }
      }}
      submitBtn={false}
      id={id}
    >
      <Area id={id} noOuter />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "createProduct")
    gridUrl: url(routeId: "productGrid")
  }
`;
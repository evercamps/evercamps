import Area from '@components/Area';
import { Form } from '@components/form/Form';
import React from 'react';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get.js';

interface AttributeNewFormProps {
  action: string;
}

interface Link {
  rel: string;
  href: string;
}

export default function AttributeNewForm({
  action
}: AttributeNewFormProps) {
  const id = 'attributeForm';

  return (
    <Form
      method="POST"
      action={action}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      onSuccess={(response: any) => {
        if (response.error) {
          toast.error(String(
            get(
              response,
              'error.message',
              'Something wrong. Please reload the page!'
            ))
          );
        } else {
          toast.success('Attribute saved successfully!');

          setTimeout(() => {
            const editUrl = response.data?.links?.find(
              (link : Link) => link.rel === 'edit'
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
    action: url(routeId: "createAttribute")
    gridUrl: url(routeId: "attributeGrid")
  }
`;
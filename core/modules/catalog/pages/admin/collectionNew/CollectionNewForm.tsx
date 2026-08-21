import Area from '@components/Area';
import { Form } from '@components/form/Form';
import React from 'react';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get.js';

interface CollectionNewFormProps {
  action: string;
}

interface FormResponse {
  error?: {
    message?: string;
  };
  data?: {
    links: {
      rel: string;
      href: string;
    }[];
  };
}

export default function CollectionNewForm({
  action
}: CollectionNewFormProps) {
  const id = 'collectionForm';

  return (
    <Form
      method="POST"
      action={action}
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
          toast.success('Collection saved successfully!');

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
    action: url(routeId: "createCollection")
    gridUrl: url(routeId: "collectionGrid")
  }
`;
import Area from '@components/Area';
import { Form } from '@components/form/Form';
import React from 'react';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get.js';

interface CategoryEditFormProps {
  action: string;
}

interface FormResponse {
  error?: {
    message?: string;
  };
}

export default function CategoryEditForm({
  action
}: CategoryEditFormProps) {
  const id = 'categoryForm';

  return (
    <Form
      method="PATCH"
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
          toast.success('Category saved successfully!');
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
    action: url(routeId: "updateCategory", params: [{key: "id", value: getContextValue("categoryUuid")}]),
    gridUrl: url(routeId: "categoryGrid")
  }
`;
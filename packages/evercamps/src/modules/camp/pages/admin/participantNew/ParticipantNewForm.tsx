import Area from '@components/common/Area';
import { Form } from '@components/common/form/Form';
import React from 'react';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get.js';

interface Props {
  action: string;
}

export default function ParticipantNewForm({ action }: Props) {
  const id = 'participantForm';
  return (
    <Form
      method="POST"
      action={action}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      onSuccess={(response: any) => {
        if (response.error) {
          toast.error(
            get(
              response,
              'error.message',
              'Something wrong. Please reload the page!'
            )
          );
        } else {
          toast.success('Participant saved successfully!');
          setTimeout(() => {
            const editUrl = response.data.links.find(
              (link: any) => link.rel === 'edit'
            ).href;
            window.location.href = editUrl;
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
    action: url(routeId: "createParticipant")
    gridUrl: url(routeId: "participantGrid")
  }
`;

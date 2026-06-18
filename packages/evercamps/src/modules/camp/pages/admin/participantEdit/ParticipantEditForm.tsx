import Area from '@components/common/Area';
import { Form } from '@components/common/form/Form';
import React from 'react';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get.js';

interface Props {
  action: string;
}

export default function ParticipantEditForm({ action }: Props) {
  const id = 'participantForm';
  return (
    <Form
      method="PATCH"
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
            const gridUrl = response.data.links.find(
              (link: any) => link.rel === 'participantGrid'
            ).href;
            window.location.href = gridUrl;
          }, 1500);
        }
      }}
      submitBtn={false}
      id={id}
    >
      <Area id="participantForm" noOuter />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateParticipant", params: [{key: "id", value: getContextValue("participantUuid")}]),
    gridUrl: url(routeId: "participantGrid")
  }
`;

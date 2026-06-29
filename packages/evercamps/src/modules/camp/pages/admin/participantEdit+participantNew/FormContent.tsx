import Area from '@components/common/Area';
import Button from '@components/common/form/Button';
import { useFormContext } from '@components/common/form/Form';
import React from 'react';
import './FormContent.scss';

interface Props {
  gridUrl: string;
}

export default function FormContent({ gridUrl }: Props) {
  const { state } = useFormContext()!;
  return (
    <>
      <div className="grid grid-cols-2 gap-x-8 grid-flow-row ">
        <div className="col-span-1 grid grid-cols-1 gap-8 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-8 auto-rows-max">
          <Area id="rightSide" noOuter />
        </div>
      </div>
      <div className="form-submit-button flex border-t border-divider mt-6 pt-6 justify-between">
        <Button
          title="Cancel"
          variant="critical"
          outline
          onAction={() => {
            window.location.href = gridUrl;
          }}
        />
        <Button
          title="Save"
          onAction={() => {
            document
              .getElementById('participantForm')
              ?.dispatchEvent(
                new Event('submit', { cancelable: true, bubbles: true })
              );
          }}
          isLoading={state === 'submitting'}
        />
      </div>
    </>
  );
}

export const layout = {
  areaId: 'participantForm',
  sortOrder: 10
};

export const query = `
  query Query {
    gridUrl: url(routeId: "participantGrid")
  }
`;

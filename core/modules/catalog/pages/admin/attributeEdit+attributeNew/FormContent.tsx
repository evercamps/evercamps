import Area from '@components/Area';
import Button from '@components/form/Button';
import { useFormContext } from '@components/form/Form';
import React from 'react';
import './FormContent.scss';

interface FormContentProps {
  gridUrl: string;
}

export default function FormContent({ gridUrl }: FormContentProps) {
  const formContext = useFormContext();
  const state = formContext?.state;

  return (
    <>
      <div className="grid grid-cols-3 gap-x-8 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-8 auto-rows-max">
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
              .getElementById('attributeForm')
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
  areaId: 'attributeForm',
  sortOrder: 10
};

export const query = `
  query Query {
    gridUrl: url(routeId: "attributeGrid")
  }
`;
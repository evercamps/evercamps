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
    <div className="w-2/3" style={{ margin: '0 auto' }}>
      <div className="grid gap-8">
        <Area id="collectionFormInner" noOuter />
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
              .getElementById('collectionForm')
              ?.dispatchEvent(
                new Event('submit', {
                  cancelable: true,
                  bubbles: true
                })
              );
          }}
          isLoading={state === 'submitting'}
        />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'collectionForm',
  sortOrder: 10
};

export const query = `
  query Query {
    gridUrl: url(routeId: "collectionGrid")
  }
`;
import Button from '@components/form/Button';
import { Field } from '@components/form/Field';
import { Form } from '@components/form/Form';
import { useAlertContext } from '@components/modal/Alert';
import React from 'react';

interface Shipment {
  carrier?: string;
  trackingNumber?: string;
  updateShipmentApi: string;
}

interface Order {
  shipment?: Shipment | null;
}

interface Carrier {
  value: string;
  text: string;
}

interface AddTrackingButtonProps {
  order: Order;
  carriers: Carrier[];
}

export default function AddTrackingButton({
  order: { shipment },
  carriers
}: AddTrackingButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();

  if (!shipment) {
    return null;
  }

  return (
    <Button
      title="Edit Tracking Info"
      variant="primary"
      onAction={() => {
        openAlert({
          heading: 'Edit Tracking Information',
          content: (
            <div>
              <Form
                id="edit-tracking-info"
                method="PATCH"
                action={shipment.updateShipmentApi}
                submitBtn={false}
                isJSON
                onSuccess={() => {
                  window.location.reload();
                }}
                onValidationError={() => {
                  dispatchAlert({
                    type: 'update',
                    payload: { secondaryAction: { isLoading: false } }
                  });
                }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Field
                      form="edit-tracking-info"
                      type="text"
                      name="tracking_number"
                      label="Tracking number"
                      placeholder="Tracking number"
                      value={shipment.trackingNumber || ''}
                      validationRules={['notEmpty']}
                    />
                  </div>

                  <div>
                    <Field
                      form="edit-tracking-info"
                      type="select"
                      name="carrier"
                      label="Carrier"
                      value={shipment.carrier || ''}
                      options={carriers}
                      validationRules={['notEmpty']}
                    />
                  </div>
                </div>
              </Form>
            </div>
          ),
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: ''
          },
          secondaryAction: {
            title: 'Update tracking',
            onAction: () => {
              dispatchAlert({
                type: 'update',
                payload: { secondaryAction: { isLoading: true } }
              });

              document
                .getElementById('edit-tracking-info')
                ?.dispatchEvent(
                  new Event('submit', {
                    cancelable: true,
                    bubbles: true
                  })
                );
            },
            variant: 'primary',
            isLoading: false
          }
        });
      }}
    />
  );
}

export const layout = {
  areaId: 'order_actions',
  sortOrder: 5
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      shipment {
        shipmentId
        carrier
        trackingNumber
        updateShipmentApi
      }
      createShipmentApi
    }
    carriers {
      text: name
      value: code
    }
  }
`;
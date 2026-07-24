import Button from '@components/form/Button';
import { Field } from '@components/form/Field';
import { Form } from '@components/form/Form';
import { useAlertContext } from '@components/modal/Alert';
import RenderIfTrue from '@components/RenderIfTrue';
import React from 'react';
import { toast } from 'react-toastify';

interface Shipment {
  trackingNumber?: string;
  carrier?: string;
}

interface ShipmentStatus {
  code: string;
}

interface Order {
  shipment?: Shipment;
  createShipmentApi: string;
  shipmentStatus: ShipmentStatus;
}

interface Carrier {
  text: string;
  value: string;
}

interface ShipButtonProps {
  order: Order;
  carriers: Carrier[];
}

export default function ShipButton({
  order: { shipment, createShipmentApi, shipmentStatus },
  carriers
}: ShipButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();

  if (shipment) {
    return null;
  }

  return (
    <RenderIfTrue condition={shipmentStatus.code !== 'canceled'}>
      <Button
        title="Ship Items"
        variant="primary"
        onAction={() => {
          openAlert({
            heading: 'Ship Items',
            content: (
              <div>
                <Form
                  id="ship-items"
                  method="POST"
                  action={createShipmentApi}
                  submitBtn={false}
                  isJSON
                  onSuccess={(responseJson: unknown) => {
                    const response = responseJson as {
                      error?: {
                        message: string;
                      };
                    };

                    if (response.error) {
                      toast.error(response.error.message);
                      dispatchAlert({
                        type: 'update',
                        payload: {
                          secondaryAction: { isLoading: false }
                        }
                      });
                    } else {
                      window.location.reload();
                    }
                  }}
                  onValidationError={() => {
                    dispatchAlert({
                      type: 'update',
                      payload: {
                        secondaryAction: { isLoading: false }
                      }
                    });
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Field
                        form="ship-items"
                        type="text"
                        name="tracking_number"
                        label="Tracking number"
                        placeholder="Tracking number"
                        value=""
                      />
                    </div>
                    <div>
                      <Field
                        form="ship-items"
                        type="select"
                        name="carrier"
                        label="Carrier"
                        value=""
                        options={carriers}
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
              title: 'Ship',
              onAction: () => {
                dispatchAlert({
                  type: 'update',
                  payload: {
                    secondaryAction: { isLoading: true }
                  }
                });

                document
                  .getElementById('ship-items')
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
    </RenderIfTrue>
  );
}

export const layout = {
  areaId: 'order_actions',
  sortOrder: 10
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
      shipmentStatus {
        code
      }
      createShipmentApi
    },
    carriers {
      text: name
      value: code
    }
  }
`;
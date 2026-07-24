import Button from '@components/form/Button';
import { Field } from '@components/form/Field';
import { Form } from '@components/form/Form';
import { useAlertContext } from '@components/modal/Alert';
import RenderIfTrue from '@components/RenderIfTrue';
import React from 'react';
import { toast } from 'react-toastify';

interface OrderStatus {
  code?: string;
  isCancelable?: boolean;
}

interface Order {
  cancelApi: string;
  paymentStatus: OrderStatus;
  shipmentStatus: OrderStatus;
}

interface CancelButtonProps {
  order: Order;
}

export default function CancelButton({
  order: { cancelApi, paymentStatus, shipmentStatus }
}: CancelButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();

  return (
    <RenderIfTrue
      condition={
        paymentStatus.isCancelable !== false &&
        shipmentStatus.isCancelable !== false
      }
    >
      <Button
        title="Cancel Order"
        variant="critical"
        onAction={() => {
          openAlert({
            heading: 'Cancel Order',
            content: (
              <div>
                <Form
                  id="cancelReason"
                  method="POST"
                  action={cancelApi}
                  submitBtn={false}
                  isJSON
                  onSuccess={(response: unknown) => {
                    const result = response as {
                      error?: {
                        message: string;
                      };
                    };

                    if (result.error) {
                      toast.error(result.error.message);

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
                  <div>
                    <Field
                      form="cancelReason"
                      type="textarea"
                      name="reason"
                      label="Reason for cancellation"
                      placeholder="Reason for cancellation"
                      value=""
                      validationRules={['notEmpty']}
                    />
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
              title: 'Cancel Order',
              onAction: () => {
                dispatchAlert({
                  type: 'update',
                  payload: {
                    secondaryAction: { isLoading: true }
                  }
                });

                document
                  .getElementById('cancelReason')
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
  areaId: 'pageHeadingRight',
  sortOrder: 35
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      paymentStatus {
        code
        isCancelable
      }
      shipmentStatus {
        code
        isCancelable
      }
      cancelApi
    }
  }
`;
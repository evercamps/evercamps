import { Card } from '@components/admin/cms/Card';
import Button from '@components/form/Button';
import { Field } from '@components/form/Field';
import { Form } from '@components/form/Form';
import { useAlertContext } from '@components/modal/Alert';
import RenderIfTrue from '@components/RenderIfTrue';
import React from 'react';
import { toast } from 'react-toastify';

interface StripeRefundButtonProps {
  refundAPI: string;
  order: {
    paymentStatus: {
      code: string;
    };
    orderId: string;
    paymentMethod: string;
    grandTotal: {
      value: number;
      currency: string;
    };
  };
}

export default function StripeRefundButton({
  refundAPI,
  order: { paymentStatus, orderId, paymentMethod, grandTotal }
}: StripeRefundButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();

  return (
    <RenderIfTrue
      condition={() =>
        paymentMethod === 'stripe' &&
        ['paid', 'partial_refunded'].includes(paymentStatus.code)
      }
    >
      <Card.Session>
        <div className="flex justify-end">
          <Button
            title="Refund"
            variant="secondary"
            onAction={() => {
              openAlert({
                heading: 'Refund',
                content: (
                  <div>
                    <Form
                      id="stripeRefund"
                      method="POST"
                      action={refundAPI}
                      submitBtn={false}
                      isJSON
                      onSuccess={(response: any) => {
                        if (response.error) {
                          toast.error(response.error.message);

                          dispatchAlert({
                            type: 'update',
                            payload: {
                              secondaryAction: {
                                isLoading: false
                              }
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
                            secondaryAction: {
                              isLoading: false
                            }
                          }
                        });
                      }}
                    >
                      <div>
                        <Field
                          form="stripeRefund"
                          type="text"
                          name="amount"
                          label="Refund amount"
                          placeholder="Refund amount"
                          value={grandTotal.value}
                          validationRules={['notEmpty']}
                          suffix={grandTotal.currency}
                        />
                      </div>

                      <input
                        type="hidden"
                        name="order_id"
                        value={orderId}
                      />
                    </Form>
                  </div>
                ),
                primaryAction: {
                  title: 'Cancel',
                  onAction: closeAlert,
                  variant: ''
                },
                secondaryAction: {
                  title: 'Refund',
                  onAction: () => {
                    dispatchAlert({
                      type: 'update',
                      payload: {
                        secondaryAction: {
                          isLoading: true
                        }
                      }
                    });

                    document
                      .getElementById('stripeRefund')
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
        </div>
      </Card.Session>
    </RenderIfTrue>
  );
}

export const layout = {
  areaId: 'orderPaymentActions',
  sortOrder: 10
};

export const query = `
  query Query {
    refundAPI: url(routeId: "refundPaymentIntent")
    order(uuid: getContextValue("orderId")) {
      orderId
      grandTotal {
        value
        currency
      }
      paymentStatus {
        code
      }
      paymentMethod
    }
  }
`;
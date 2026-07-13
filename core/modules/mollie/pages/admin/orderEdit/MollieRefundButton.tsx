import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import { useAlertContext } from '@components/common/modal/Alert';
import RenderIfTrue from '@components/common/RenderIfTrue';
import { toast } from 'react-toastify';
import { MolliePaymentStatus } from '../../../types/molliePaymentStatus';

interface GrandTotal {
  value: number;
  currency: string;
}

interface RefundOrder {
  paymentStatus: MolliePaymentStatus;
  orderId: string;
  paymentMethod: string;
  grandTotal: GrandTotal;
}

interface MollieRefundButtonProps {
  refundAPI: string;
  order: RefundOrder;
}

export default function MollieRefundButton({
  refundAPI,
  order: { paymentStatus, orderId, paymentMethod, grandTotal }
}: MollieRefundButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  return (
    <RenderIfTrue
      condition={
        paymentMethod === 'mollie' &&
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
                      id="mollieRefund"
                      method="POST"
                      action={refundAPI}
                      submitBtn={false}
                      isJSON
                      onSuccess={(responseJson: unknown) => {
                        const result = responseJson as { error?: { message: string } };
                        if (result.error) {
                          toast.error(result.error.message);
                          dispatchAlert({
                            type: 'update',
                            payload: { secondaryAction: { isLoading: false } }
                          });
                        } else {
                          window.location.reload();
                        }
                      }}
                      onValidationError={() => {
                        dispatchAlert({
                          type: 'update',
                          payload: { secondaryAction: { isLoading: false } }
                        });
                      }}
                    >
                      <div>
                        <Field
                          type="text"
                          name="amount"
                          label="Refund amount"
                          placeholder="Refund amount"
                          value={grandTotal.value}
                          validationRules={['notEmpty']}
                          suffix={grandTotal.currency}
                        />
                      </div>
                      <input type="hidden" name="order_id" value={orderId} />
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
                      payload: { secondaryAction: { isLoading: true } }
                    });
                    document
                      .getElementById('mollieRefund')
                      ?.dispatchEvent(
                        new Event('submit', { cancelable: true, bubbles: true })
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
    refundAPI: url(routeId: "mollieRefundPayment")
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

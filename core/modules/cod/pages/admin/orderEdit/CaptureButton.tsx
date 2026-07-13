import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import RenderIfTrue from '@components/common/RenderIfTrue';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';

interface PaymentStatus {
  code: string;
}

interface CaptureOrder {
  paymentStatus: PaymentStatus;
  uuid: string;
  paymentMethod: string;
}

interface CaptureButtonProps {
  captureAPI: string;
  order: CaptureOrder;
}

export default function CaptureButton({
  captureAPI,
  order: { paymentStatus, uuid, paymentMethod }
}: CaptureButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const onAction = async () => {
    setIsLoading(true);
    const response = await axios.post(
      captureAPI,
      { order_id: uuid },
      { validateStatus: () => true }
    );
    if (!response.data.error) {
      window.location.reload();
    } else {
      toast.error(response.data.error.message);
    }
    setIsLoading(false);
  };

  return (
    <RenderIfTrue
      condition={paymentStatus.code === 'pending' && paymentMethod === 'cod'}
    >
      <Card.Session>
        <div className="flex justify-end">
          <Button title="Capture" onAction={onAction} isLoading={isLoading} />
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
    captureAPI: url(routeId: "codCapturePayment")
    order(uuid: getContextValue("orderId")) {
      uuid
      paymentStatus {
        code
      }
      paymentMethod
    }
  }
`;

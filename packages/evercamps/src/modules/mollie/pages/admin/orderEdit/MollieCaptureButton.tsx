import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import RenderIfTrue from '@components/common/RenderIfTrue';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { MolliePaymentStatus } from '../../../types/molliePaymentStatus';

interface CaptureOrder {
  paymentStatus: MolliePaymentStatus;
  uuid: string;
  paymentMethod: string;
}

interface MollieCaptureButtonProps {
  captureAPI: string;
  order: CaptureOrder;
}

export default function MollieCaptureButton({
  captureAPI,
  order: { paymentStatus, uuid, paymentMethod }
}: MollieCaptureButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const onAction = async () => {
    setIsLoading(true);
    const result = await axios.post(
      captureAPI,
      { order_id: uuid },
      { validateStatus: () => true }
    );
    if (!result.data.error) {
      window.location.reload();
    } else {
      toast.error(result.data.error.message);
    }
    setIsLoading(false);
  };

  return (
    <RenderIfTrue
      condition={paymentStatus.code === 'authorized' && paymentMethod === 'mollie'}
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
    captureAPI: url(routeId: "capturePaymentIntent")
    order(uuid: getContextValue("orderId")) {
      uuid
      paymentStatus {
        code
      }
      paymentMethod
    }
  }
`;

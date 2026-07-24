import { Card } from '@components/admin/cms/Card';
import Button from '@components/form/Button';
import RenderIfTrue from '@components/RenderIfTrue';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';

interface StripeCaptureButtonProps {
  captureAPI: string;
  order: {
    paymentStatus: {
      code: string;
    };
    uuid: string;
    paymentMethod: string;
  };
}

export default function StripeCaptureButton({
  captureAPI,
  order: { paymentStatus, uuid, paymentMethod }
}: StripeCaptureButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const onAction = async () => {
    setIsLoading(true);

    try {
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RenderIfTrue
      condition={
        paymentStatus.code === 'authorized' &&
        paymentMethod === 'stripe'
      }
    >
      <Card.Session>
        <div className="flex justify-end">
          <Button
            title="Capture"
            onAction={onAction}
            isLoading={isLoading}
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
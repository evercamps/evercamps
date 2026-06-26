import Area from '@components/common/Area';
import { useAppDispatch, useAppState } from '@components/common/context/app';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import ProductNoThumbnail from '@components/common/ProductNoThumbnail';
import produce from 'immer';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../../../lib/locale/translate/_.js';
import './Form.scss';
import { useModal } from '@components/common/modal/useModal';
import ParticipantForm from './ParticipantForm';

interface ParticipantCheckoutField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
}

interface ToastMessageProps {
  thumbnail?: string | null;
  name: string;
  qty: number;
  count: number;
  cartUrl: string;
  toastId: string;
}

function ToastMessage({ thumbnail = null, name, qty, count, cartUrl, toastId }: ToastMessageProps) {
  return (
    <div className="toast-mini-cart">
      <div className="top-head grid grid-cols-2">
        <div className="self-center">{_('JUST ADDED TO YOUR CART')}</div>
        <div className="self-center close flex justify-end">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toast.dismiss(toastId);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </a>
        </div>
      </div>
      <div className="item-line flex justify-between">
        <div className="popup-thumbnail flex justify-center items-center">
          {thumbnail ? (
            <img src={thumbnail} alt={name} />
          ) : (
            <ProductNoThumbnail width={25} height={25} />
          )}
        </div>
        <div className="item-info flex justify-between">
          <div className="name">
            <span className="font-bold">{name}</span>
          </div>
          <div>{_('QTY: ${qty}', { qty: String(qty) })}</div>
        </div>
      </div>
      <a className="add-cart-popup-button" href={cartUrl}>
        {_('VIEW CART (${count})', { count: String(count) })}
      </a>
      <a
        className="add-cart-popup-continue text-center underline block"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          toast.dismiss(toastId);
        }}
      >
        {_('Continue Shopping')}
      </a>
    </div>
  );
}

interface AddToCartProps {
  stockAvailability: boolean;
  loading?: boolean;
  error?: string;
  onAddToCartClick: () => void;
  manageRegistrations: number;
}

function AddToCart({ stockAvailability, loading = false, error, onAddToCartClick, manageRegistrations }: AddToCartProps) {
  return (
    <div className="add-to-cart mt-8">
      <div style={{ width: '8rem' }}>
        <Field
          type={manageRegistrations === 1 ? 'hidden' : 'text'}
          value="1"
          validationRules={['notEmpty']}
          name="qty"
          placeholder={_('Qty')}
          form="productForm"
        />
      </div>
      {error && <div className="text-critical mt-4">{error}</div>}
      <div className="mt-4">
        {stockAvailability === true && (
          <Button
            title={manageRegistrations === 1 ? _('ADD PARTICIPANT') : _('ADD TO CART')}
            outline
            isLoading={loading}
            onAction={onAddToCartClick}
          />
        )}
        {stockAvailability === false && (
          <Button title={_('SOLD OUT')} onAction={() => {}} />
        )}
      </div>
    </div>
  );
}

interface VariantAttribute {
  attributeCode: string;
}

interface Product {
  productId: number;
  sku: string;
  name: string;
  inventory: {
    isInStock: boolean;
  };
  manageRegistrations: number;
  variantGroup?: {
    variantAttributes?: VariantAttribute[];
  };
}

interface CurrentCustomer {
  email: string;
  participants?: {
    participantId: number;
    firstName: string;
    lastName: string;
  }[];
}

interface Setting {
  participantCheckoutFields?: string;
}

interface Props {
  product: Product;
  action: string;
  currentCustomer?: CurrentCustomer | null;
  loginUrl: string;
  registerUrl: string;
  setting?: Setting;
}

export default function ProductForm({ product, action, currentCustomer, loginUrl, registerUrl, setting }: Props) {
  const extraFields = React.useMemo<ParticipantCheckoutField[]>(() => {
    if (!setting?.participantCheckoutFields) return [];
    try {
      return JSON.parse(setting.participantCheckoutFields);
    } catch {
      return [];
    }
  }, [setting?.participantCheckoutFields]);

  const [loading, setLoading] = useState(false);
  const [toastId, setToastId] = useState<string | number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const appContext = useAppState()!;
  const { setData } = useAppDispatch()!;
  const modal = useModal();

  const onSuccess = (response: any) => {
    if (!response.error) {
      if (product.manageRegistrations === 1) {
        modal.closeModal();
      }
      setData(
        produce(appContext, (draft: any) => {
          draft.cart = appContext.cart || {};
          draft.cart.totalQty = response.data.count;
          draft.cart.uuid = response.data.cartId;
        })
      );
      setToastId(
        toast(
          <ToastMessage
            thumbnail={response.data.item.thumbnail}
            name={product.name}
            qty={response.data.item.qty}
            count={response.data.count}
            cartUrl="/cart"
            toastId={`${toastId}-${Math.random().toString(36).slice(2)}`}
          />,
          { closeButton: false }
        )
      );
    } else {
      setError(response.error.message);
    }
  };

  const handleAddToCartClick = () => {
    const { variantGroup } = product;

    if (variantGroup && variantGroup.variantAttributes && variantGroup.variantAttributes.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);

      const missingAttribute = variantGroup.variantAttributes.some(
        (attr) => !urlParams.has(attr.attributeCode)
      );

      if (missingAttribute) {
        setError(_('Please select variant options'));
        return;
      }
    }
    if (product.manageRegistrations === 1) {
      modal.openModal();
    } else {
      document
        .getElementById('productForm')!
        .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const handleModalSubmit = () => {
    document
      .getElementById('productForm')!
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  };

  return (
    <Form
      id="productForm"
      action={action}
      method="POST"
      submitBtn={false}
      onSuccess={onSuccess}
      onStart={() => setLoading(true)}
      onComplete={() => setLoading(false)}
      onError={(e: any) => setError(e.message)}
      isJSON
    >
      <input type="hidden" name="sku" value={product.sku} />
      <Area
        id="productSinglePageForm"
        coreComponents={[
          {
            component: { default: AddToCart },
            props: {
              stockAvailability: product.inventory.isInStock,
              loading,
              error,
              onAddToCartClick: handleAddToCartClick,
              manageRegistrations: product.manageRegistrations
            },
            sortOrder: 50,
            id: 'productSingleBuyButton'
          }
        ]}
      />
      {modal.state.showing && (
        <div
          className={modal.className}
          onAnimationEnd={modal.onAnimationEnd}
        >
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <ParticipantForm
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                loading={loading}
                onCancel={modal.closeModal}
                onSubmit={handleModalSubmit}
                customer={currentCustomer}
                loginUrl={loginUrl}
                registerUrl={registerUrl}
                extraFields={extraFields}
              />
            </div>
          </div>
        </div>
      )}
    </Form>
  );
}

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 45
};

export const query = `
  query Query {
    product(id: getContextValue('productId')) {
      productId
      sku
      name
      gallery {
        thumb
      }
      inventory {
        isInStock
      }
      manageRegistrations
      variantGroup {
        variantAttributes {
          attributeCode
        }
      }
    }
    currentCustomer {
      email
      participants {
        participantId
        firstName
        lastName
      }
    }
    action:url (routeId: "addMineCartItem")
    loginUrl: url(routeId: "login")
    registerUrl: url(routeId: "register")
    setting {
      participantCheckoutFields
    }
  }
`;

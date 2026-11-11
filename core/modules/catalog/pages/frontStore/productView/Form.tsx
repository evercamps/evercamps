import Area from '@components/Area';
import { useAppDispatch, useAppState } from '@components/context/app';
import Button from '@components/form/Button';
import { Field } from '@components/form/Field';
import { Form } from '@components/form/Form';
import ProductNoThumbnail from '@components/ProductNoThumbnail';
import produce from 'immer';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../../../lib/locale/translate/_.js';
import './Form.scss';
import { useModal } from '@components/modal/useModal';
import ParticipantForm from './ParticipantForm';
import type { ParticipantCheckoutField, CheckoutSetting } from '../../../../../types/checkout';

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

interface BookableVariant {
  productVariantId: number;
  label: string;
  price: { value: number; text: string };
  startDate?: string | null;
  endDate?: string | null;
  availableSeats?: number | null;
  soldOut: boolean;
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
  bookableVariants?: BookableVariant[];
}

function formatDate(value: string): string {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

// Choose a variant (e.g. a camp week) when the product has more than one
// bookable variant. The choice is posted as product_variant_id.
function VariantPicker({
  variants,
  selected,
  onSelect
}: {
  variants: BookableVariant[];
  selected: number | null;
  onSelect: (variantId: number) => void;
}) {
  return (
    <div className="product-variant-picker mt-8">
      <div className="font-semibold mb-2">{_('Choose a week')}</div>
      <div className="flex flex-col gap-2">
        {variants.map((variant) => {
          const isSelected = selected === variant.productVariantId;
          return (
            <label
              key={variant.productVariantId}
              className={`flex justify-between items-center gap-4 border rounded p-3 ${
                variant.soldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${isSelected ? 'border-interactive' : 'border-divider'}`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={isSelected}
                  disabled={variant.soldOut}
                  onChange={() => onSelect(variant.productVariantId)}
                />
                <span>
                  <span className="block">{variant.label}</span>
                  {variant.startDate && variant.endDate && (
                    <span className="block text-sm text-textSubdued">
                      {formatDate(variant.startDate)} – {formatDate(variant.endDate)}
                    </span>
                  )}
                </span>
              </span>
              <span className="text-right whitespace-nowrap">
                <span className="block">{variant.price?.text}</span>
                {variant.soldOut ? (
                  <span className="block text-sm text-critical">{_('Sold out')}</span>
                ) : (
                  variant.availableSeats !== null &&
                  variant.availableSeats !== undefined &&
                  variant.availableSeats <= 5 && (
                    <span className="block text-sm text-textSubdued">
                      {_('${count} places left', { count: String(variant.availableSeats) })}
                    </span>
                  )
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface CurrentCustomer {
  email: string;
  participants?: {
    participantId: number;
    firstName: string;
    lastName: string;
  }[];
}

interface Props {
  product: Product;
  action: string;
  currentCustomer?: CurrentCustomer | null;
  loginUrl: string;
  registerUrl: string;
  setting?: Pick<CheckoutSetting, 'participantCheckoutFields'>;
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

  // Variants (e.g. camp weeks). With one bookable variant it's used directly;
  // with several the customer chooses one.
  const bookableVariants = product.bookableVariants ?? [];
  const showPicker = bookableVariants.length > 1;
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    bookableVariants.length === 1 ? bookableVariants[0].productVariantId : null
  );
  const isInStock =
    bookableVariants.length > 0
      ? bookableVariants.some((variant) => !variant.soldOut)
      : product.inventory.isInStock;

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
    if (showPicker && !selectedVariantId) {
      setError(_('Please choose a week'));
      return;
    }
    setError(undefined);
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
      {selectedVariantId && (
        <input type="hidden" name="product_variant_id" value={selectedVariantId} />
      )}
      {showPicker && (
        <VariantPicker
          variants={bookableVariants}
          selected={selectedVariantId}
          onSelect={(variantId) => {
            setSelectedVariantId(variantId);
            setError(undefined);
          }}
        />
      )}
      <Area
        id="productSinglePageForm"
        coreComponents={[
          {
            component: { default: AddToCart },
            props: {
              stockAvailability: isInStock,
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
      bookableVariants {
        productVariantId
        label
        price {
          value
          text
        }
        startDate
        endDate
        availableSeats
        soldOut
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

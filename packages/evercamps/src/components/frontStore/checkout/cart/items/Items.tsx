import { useAppDispatch } from '@components/common/context/app';
import ProductNoThumbnail from '@components/common/ProductNoThumbnail';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { ItemOptions } from './ItemOptions';
import { ItemVariantOptions } from './ItemVariantOptions';
import './Items.scss';
import Quantity from './Quantity';
import EditParticipantForm from './EditParticipantForm';
import { useModal } from '@components/common/modal/useModal';
import { Form } from '@components/common/form/Form';

interface Price {
  value: number;
  text: string;
}

interface CartItemRegistration {
  cartItemRegistrationId: string;
  cartItemId: string;
  firstName: string;
  lastName: string;
  extraData?: string;
  editApi: string;
  removeApi: string;
}

interface CartItem {
  cartItemId: string;
  thumbnail?: string;
  qty: number;
  productName: string;
  productSku: string;
  variantOptions?: string;
  productCustomOptions?: string;
  productUrl: string;
  productPrice: Price;
  productPriceInclTax: Price;
  finalPrice: Price;
  finalPriceInclTax: Price;
  lineTotal: Price;
  lineTotalInclTax: Price;
  removeApi: string;
  updateQtyApi: string;
  manageRegistrations?: number;
  registrations: CartItemRegistration[];
  errors: string[];
}

interface ParticipantCheckoutField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
}

interface Setting {
  priceIncludingTax: boolean;
  participantCheckoutFields?: string;
}

interface Props {
  items: CartItem[];
  setting: Setting;
}

export default function Items({ items, setting: { priceIncludingTax, participantCheckoutFields } }: Props) {
  const AppContextDispatch = useAppDispatch();
  const modal = useModal();
  const [editingRegistration, setEditingRegistration] = useState<CartItemRegistration | null>(null);
  const [loading, setLoading] = React.useState(false);

  const extraFields = React.useMemo<ParticipantCheckoutField[]>(() => {
    if (!participantCheckoutFields) return [];
    try {
      return JSON.parse(participantCheckoutFields);
    } catch {
      return [];
    }
  }, [participantCheckoutFields]);

  const updateRegistration = async (updatedRegistration: CartItemRegistration) => {
    try {
      setLoading(true);
      const response = await fetch(updatedRegistration.editApi, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRegistration)
      });

      const json = await response.json();
      if (!json.error) {
        const url = new URL(window.location.href);
        url.searchParams.set('ajax', 'true');
        await AppContextDispatch.fetchPageData(url);
      } else {
        toast.error(json.error.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (item: CartItem) => {
    const response = await fetch(item.removeApi, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const url = new URL(window.location.href);
      url.searchParams.set('ajax', 'true');
      await AppContextDispatch.fetchPageData(url);
    } else {
      const data = await response.json();
      toast(data.error.message);
    }
  };

  const removeRegistration = async (registration: CartItemRegistration) => {
    const response = await fetch(registration.removeApi, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const url = new URL(window.location.href);
      url.searchParams.set('ajax', 'true');
      await AppContextDispatch.fetchPageData(url);
    } else {
      const data = await response.json();
      toast(data.error.message);
    }
  };

  return (
    <div id="shopping-cart-items">
      <table className="items-table listing">
        <thead>
          <tr>
            <td><span>{_('Product')}</span></td>
            <td><span>{_('Price')}</span></td>
            <td className="hidden md:table-cell"><span>{_('Quantity')}</span></td>
            <td className="hidden md:table-cell"><span>{_('Total')}</span></td>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.cartItemId}>
              <td>
                <div className="flex justify-start space-x-4 product-info">
                  <div className="product-image flex justify-center items-center">
                    {item.thumbnail ? (
                      <img className="self-center" src={item.thumbnail} alt={item.productName} />
                    ) : (
                      <ProductNoThumbnail width={40} height={40} />
                    )}
                  </div>
                  <div className="cart-tem-info">
                    <a href={item.productUrl} className="name font-semibold hover:underline">
                      {item.productName}
                    </a>
                    {item.errors.map((e, i) => (
                      <div className="text-critical" key={i}>{e}</div>
                    ))}
                    <ItemOptions options={JSON.parse(item.productCustomOptions || '[]')} />
                    <ItemVariantOptions options={JSON.parse(item.variantOptions || '[]')} />
                    <div className="mt-2">
                      {item.manageRegistrations !== 1 && (
                        <a
                          onClick={async (e) => { e.preventDefault(); await removeItem(item); }}
                          href="#"
                          className="text-textSubdued underline"
                        >
                          <span>{_('Remove')}</span>
                        </a>
                      )}
                      {item.registrations.length > 0 && (
                        <div className="mt-2">
                          {item.registrations.map((reg, idx) => (
                            <div key={idx} className="mb-2">
                              <div className="font-semibold">Participant {idx + 1}:</div>
                              <div>Name: {reg.firstName} {reg.lastName}</div>
                              {extraFields.map((field) => {
                                const val = reg.extraData ? JSON.parse(reg.extraData)[field.code] : null;
                                return val ? (
                                  <div key={field.code}>{field.label}: {val}</div>
                                ) : null;
                              })}
                              <div className="flex space-x-4 mt-1">
                                <a
                                  onClick={async (e) => { e.preventDefault(); await removeRegistration(reg); }}
                                  href="#"
                                  className="text-textSubdued underline"
                                >
                                  <span>{_('Remove Participant')}</span>
                                </a>
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setEditingRegistration(reg);
                                    modal.openModal();
                                  }}
                                  className="text-textSubdued underline"
                                >
                                  {_('Edit')}
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                {item.finalPrice.value < item.productPrice.value && (
                  <div>
                    <span className="regular-price">
                      {priceIncludingTax ? item.productPriceInclTax.text : item.productPrice.text}
                    </span>{' '}
                    <span className="sale-price">
                      {priceIncludingTax ? item.finalPriceInclTax.text : item.finalPrice.text}
                    </span>
                  </div>
                )}
                {item.finalPrice.value >= item.productPrice.value && (
                  <div>
                    <span className="sale-price">
                      {priceIncludingTax ? item.finalPriceInclTax.text : item.finalPrice.text}
                    </span>
                  </div>
                )}
                <div className="md:hidden mt-2 flex justify-end">
                  <Quantity qty={item.qty} api={item.updateQtyApi} disabled={item.manageRegistrations === 1} />
                </div>
              </td>
              <td className="hidden md:table-cell">
                <Quantity qty={item.qty} api={item.updateQtyApi} disabled={item.manageRegistrations === 1} />
              </td>
              <td className="hidden md:table-cell">
                <span>{priceIncludingTax ? item.lineTotalInclTax.text : item.lineTotal.text}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal.state.showing && editingRegistration && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <Form
                id="editParticipantForm"
                action={editingRegistration.editApi}
                method="PATCH"
                submitBtn={false}
                onSuccess={() => {
                  modal.closeModal();
                  setEditingRegistration(null);
                }}
                onStart={() => setLoading(true)}
                onComplete={() => setLoading(false)}
                onError={(e: any) => toast.error(e.message)}
                isJSON
              >
                <EditParticipantForm
                  registration={editingRegistration}
                  setRegistration={(updated) => setEditingRegistration(updated)}
                  loading={loading}
                  onCancel={() => {
                    modal.closeModal();
                    setEditingRegistration(null);
                  }}
                  onSubmit={async () => {
                    await updateRegistration(editingRegistration);
                    modal.closeModal();
                    setEditingRegistration(null);
                  }}
                  extraFields={extraFields}
                />
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Card } from '@components/admin/cms/Card';
import CollectionSelector from '@components/admin/promotion/couponEdit/CollectionSelector';
import { useAlertContext } from '@components/modal/Alert';
import { useModal } from '@components/modal/useModal';
import CollectionIcon from '@heroicons/react/solid/esm/TagIcon';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

// "Collections" card on the product edit page: list, add and remove the
// collections this product belongs to.
//
// Like the Variants card, nothing here is posted with the product form (no
// input `name`s, every button type="button"): each add/remove calls the
// collection API straight away.

interface Collection {
  collectionId: number;
  uuid: string;
  name: string;
  editUrl: string;
  removeProductUrl: string | null;
}

interface PickedCollection {
  collectionId: number;
  addProductUrl: string;
}

interface CollectionsProps {
  product?: {
    productId: number;
    uuid: string;
  };
}

const CollectionsQuery = `
  query Query($id: ID) {
    product(id: $id) {
      uuid
      collections {
        collectionId
        uuid
        name
        editUrl
        removeProductUrl
      }
    }
  }
`;

// The collection APIs answer { success: false, message } on errors.
async function callApi(url: string, method: string, body?: unknown): Promise<boolean> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include'
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false || json.error) {
    toast.error(json.message || json.error?.message || 'Something went wrong');
    return false;
  }
  return true;
}

export default function Collections({ product }: CollectionsProps) {
  const [result, reexecute] = useQuery({
    query: CollectionsQuery,
    variables: { id: product?.productId },
    pause: !product?.productId,
    requestPolicy: 'network-only'
  });
  const modal = useModal();
  const { openAlert, closeAlert } = useAlertContext();

  if (!product?.productId) {
    return null;
  }

  const collections: Collection[] = result.data?.product?.collections ?? [];
  const productUuid: string = result.data?.product?.uuid ?? product.uuid;
  const refresh = () => reexecute({ requestPolicy: 'network-only' });

  const add = async (_id: number, collection: PickedCollection) => {
    if (await callApi(collection.addProductUrl, 'POST', { product_id: productUuid })) {
      toast.success('Added to collection');
      refresh();
    }
  };

  const remove = async (collectionId: number) => {
    const collection = collections.find((c) => c.collectionId === collectionId);
    if (!collection?.removeProductUrl) {
      return;
    }
    if (await callApi(collection.removeProductUrl, 'DELETE')) {
      toast.success('Removed from collection');
      refresh();
    }
  };

  const confirmRemove = (collection: Collection) => {
    openAlert({
      heading: `Remove from ${collection.name}`,
      content: <div>The product is removed from this collection right away.</div>,
      primaryAction: {
        title: 'Cancel',
        onAction: closeAlert,
        variant: 'primary'
      },
      secondaryAction: {
        title: 'Remove',
        variant: 'critical',
        onAction: async () => {
          closeAlert();
          await remove(collection.collectionId);
        }
      }
    });
  };

  return (
    <Card
      title="Collections"
      subdued
      actions={[
        {
          name: 'Add to collection',
          onAction: () => modal.openModal()
        }
      ]}
    >
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <CollectionSelector
                onSelect={add}
                onUnSelect={remove}
                selectedIDs={collections.map((c) => c.collectionId)}
                closeModal={() => modal.closeModal()}
              />
            </div>
          </div>
        </div>
      )}
      <Card.Session>
        {result.fetching && !result.data && <div>Loading collections…</div>}
        {result.error && <div className="text-critical">Could not load collections.</div>}

        {collections.map((collection) => (
          <div
            className="flex justify-between gap-4 items-center align-middle"
            key={collection.uuid}
          >
            <div className="flex justify-start gap-4 items-center">
              <CollectionIcon width={16} height={16} fill="#2c6ecb" />
              <a href={collection.editUrl} className="hover:underline">
                <span>{collection.name}</span>
              </a>
            </div>
            {collection.removeProductUrl && (
              <button
                type="button"
                className="text-critical hover:underline"
                onClick={() => confirmRemove(collection)}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        {result.data && collections.length === 0 && (
          <div className="text-gray-500">No collections</div>
        )}

        <div className="text-textSubdued text-sm mt-2">Changes are saved immediately.</div>
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 20
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      productId
      uuid
    }
  }
`;

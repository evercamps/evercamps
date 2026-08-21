import { Card } from '@components/admin/cms/Card';
import AddProducts from '@components/admin/catalog/collection/collectionEdit/AddProducts';
import Spinner from '@components/Spinner';
import { useModal } from '@components/modal/useModal';
import React from 'react';
import { useQuery } from 'urql';

import './Products.scss';

interface Product {
  productId: number;
  uuid: string;
  name: string;
  sku: string;
  price: {
    regular: {
      text: string;
    };
  };
  image?: {
    url?: string;
  };
  editUrl?: string;
  removeFromCollectionUrl: string;
}

interface CollectionProductsResponse {
  collection: {
    products: {
      items: Product[];
      total: number;
    };
  };
}

interface Collection {
  code: string;
  addProductApi: string;
}

interface ProductsProps {
  collection: Collection;
}

interface RemoveProductFunction {
  (api: string, uuid: string): Promise<void>;
}

const ProductsQuery = `
  query Query ($code: String!, $filters: [FilterInput!]) {
    collection (code: $code) {
      products (filters: $filters) {
        items {
          productId
          uuid
          name
          sku
          price {
            regular {
              text
            }
          }
          image {
            url: thumb
          }
          editUrl
          removeFromCollectionUrl
        }
        total
      }
    }
  }
`;

export default function Products({
  collection: { code, addProductApi }
}: ProductsProps) {
  const [keyword, setKeyword] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [removing, setRemoving] = React.useState<string[]>([]);
  const modal = useModal();

  const [result, reexecuteQuery] = useQuery<CollectionProductsResponse>({
    query: ProductsQuery,
    variables: {
      code,
      filters: !keyword
        ? [
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: '10' }
          ]
        : [
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: '10' },
            { key: 'keyword', operation: 'eq', value: keyword }
          ]
    },
    pause: true
  });

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);

  const closeModal = () => {
    reexecuteQuery({ requestPolicy: 'network-only' });
    modal.closeModal();
  };

  const removeProduct: RemoveProductFunction = async (api, uuid) => {
    setRemoving([...removing, uuid]);

    await fetch(api, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    });

    setPage(1);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      reexecuteQuery({ requestPolicy: 'network-only' });
    }, 1500);

    return () => clearTimeout(timer);
  }, [keyword]);

  React.useEffect(() => {
    if (!result.fetching) {
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  }, [page]);

  const { data, fetching, error } = result;

  if (error) {
    return <p>Oh no... {error.message}</p>;
  }

  if (!data && !fetching) {
    return null;
  }

  return (
    <Card
      title="Products"
      actions={[
        {
          name: 'Add products',
          onAction: () => modal.openModal()
        }
      ]}
    >
      {modal.state.showing && data && (
        <div
          className={modal.className}
          onAnimationEnd={modal.onAnimationEnd}
        >
          <div className="modal-wrapper flex self-center justify-center items-center">
            <div className="modal">
              <AddProducts
                addProductApi={addProductApi}
                closeModal={closeModal}
                addedProductIDs={data.collection.products.items.map(
                  (p) => p.productId
                )}
              />
            </div>
          </div>
        </div>
      )}

      <Card.Session>
        <div>
          <div className="border rounded border-divider mb-8">
            <input
              type="text"
              value={keyword}
              placeholder="Search products"
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {data && (
            <>
              {data.collection.products.items.map((p) => (
                <div key={p.uuid}>
                  <a href={p.editUrl ?? ''}>{p.name}</a>
                </div>
              ))}
            </>
          )}

          {fetching && (
            <Spinner width={25} height={25} />
          )}
        </div>
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'collectionFormInner',
  sortOrder: 20
};

export const query = `
  query Query {
    collection(code: getContextValue("collectionCode", null)) {
      collectionId
      code
      addProductApi: addProductUrl
    }
  }
`;
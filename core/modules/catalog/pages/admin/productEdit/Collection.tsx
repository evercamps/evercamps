import { Card } from '@components/admin/cms/Card';
import CollectionIcon from '@heroicons/react/solid/esm/TagIcon';
import React from 'react';

interface Collection {
  name: string;
  editUrl: string;
  uuid: string;
}

interface CollectionsProps {
  product?: {
    collections?: Collection[];
  };
}

export default function Collections({
  product = {
    collections: []
  }
}: CollectionsProps) {
  const { collections = [] } = product;

  return (
    <Card title="Collections" subdued>
      <Card.Session>
        {collections.map((collection) => (
          <div
            className="flex justify-start gap-4 items-center align-middle"
            key={collection.uuid}
          >
            <CollectionIcon width={16} height={16} fill="#2c6ecb" />

            <a href={collection.editUrl} className="hover:underline">
              <span>{collection.name}</span>
            </a>
          </div>
        ))}

        {collections.length === 0 && (
          <div className="text-gray-500">No collections</div>
        )}
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      collections {
        uuid
        name
        editUrl
      }
    }
  }
`;
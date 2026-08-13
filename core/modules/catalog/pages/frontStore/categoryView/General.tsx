import React from 'react';

import './General.scss';
import Editor from '@components/Editor';

interface EditorColumn {
  id: string;
  size: number;
  data: object;
}

interface EditorRow {
  id: string;
  size: number;
  columns?: EditorColumn[];
}

interface CategoryInfoProps {
  category: {
    name: string;
    description?: EditorRow[];
    image?: {
      url: string;
    };
  };
}

export default function CategoryInfo({
  category: { name, description, image }
}: CategoryInfoProps): React.ReactElement {
  return (
    <div className="page-width">
      <div className="mb-4 md:mb-8 category__general">
        {image && (
          <img src={image.url} alt={name} className="category__image" />
        )}

        <div className="category__info prose prose-base max-w-none">
          <h1 className="category__name">{name}</h1>

          <div className="category__description">
            <Editor rows={description} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    category(id: getContextValue('categoryId')) {
      name
      description
      image {
        alt
        url
      }
    }
  }
`;
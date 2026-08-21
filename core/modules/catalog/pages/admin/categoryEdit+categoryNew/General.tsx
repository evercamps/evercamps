import CategoryTree from '@components/admin/catalog/productEdit/category/CategoryTree';
import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import Editor from '@components/form/fields/Editor';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';

interface CategoryPathItem {
  name: string;
}

interface ParentCategoryData {
  categoryId: number;
  name: string;
  path: CategoryPathItem[];
}

interface ParentCategoryProps {
  currentId?: number | null;
  parent?: ParentCategoryData | null;
}

interface Category {
  categoryId?: number;
  name?: string;
  description?: unknown;
  parent?: ParentCategoryData | null;
}

interface GeneralProps {
  category?: Category;
  browserApi: string;
  deleteApi: string;
  uploadApi: string;
  folderCreateApi: string;
}

interface FieldConfig {
  component: {
    default: React.ComponentType<any>;
  };
  props: {
    id?: string;
    name?: string;
    label?: string;
    type?: string;
    validationRules?: string[];
    value?: unknown;
    parent?: ParentCategoryData | null;
    currentId?: number;
    browserApi?: string;
    deleteApi?: string;
    uploadApi?: string;
    folderCreateApi?: string;
  };
  sortOrder: number;
  id?: string;
}

function ParentCategory({
  currentId = null,
  parent = null
}: ParentCategoryProps) {
  const [selecting, setSelecting] = React.useState(false);
  const [category, setCategory] = React.useState<ParentCategoryData | null>(
    parent
  );

  return (
    <div className="mt-6 relative">
      <div className="mb-4">Parent category</div>

      {category && (
        <div className="border rounded border-[#c9cccf] mb-4 p-4">
          {category.path.map((item, index) => (
            <span key={item.name} className="text-gray-500">
              {item.name}
              {index < category.path.length - 1 && ' > '}
            </span>
          ))}

          <span className="text-interactive pl-8 hover:underline">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setSelecting(true);
              }}
            >
              Change
            </a>
          </span>

          <span className="text-critical pl-8 hover:underline">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCategory(null);
              }}
            >
              Unlink
            </a>
          </span>
        </div>
      )}

      {!selecting && !category && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSelecting(!selecting);
          }}
          className="text-interactive"
        >
          Select category
        </a>
      )}

      {selecting && (
        <CategoryTree
          selectedCategory={category ?? undefined}
          setSelectedCategory={(c: ParentCategoryData) => {
            if (c.categoryId === currentId) {
              return;
            }

            setCategory(c);
            setSelecting(false);
          }}
        />
      )}

      <input
        type="hidden"
        name="parent_id"
        value={category?.categoryId || ''}
      />
    </div>
  );
}

export default function General({
  category = {},
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}: GeneralProps) {
  const fields: FieldConfig[] = [
    {
      component: { default: Field },
      props: {
        id: 'name',
        name: 'name',
        label: 'Name',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 10,
      id: 'name'
    },
    {
      component: { default: ParentCategory },
      props: {
        parent: category?.parent,
        currentId: category?.categoryId
      },
      sortOrder: 15,
      id: 'parent'
    },
    {
      component: { default: Field },
      props: {
        id: 'categoryId',
        name: 'category_id',
        type: 'hidden'
      },
      sortOrder: 20
    },
    {
      component: { default: Editor },
      props: {
        id: 'description',
        name: 'description',
        label: 'Description',
        browserApi,
        deleteApi,
        uploadApi,
        folderCreateApi
      },
      sortOrder: 30
    }
  ];

  const fieldsWithValues = fields.map((f): FieldConfig => {
    const value = f.props.id ? get(category, f.props.id) : undefined;

    if (value !== undefined) {
      f.props.value = value;
    }

    return f;
  });

  return (
    <Card title="General">
      <Card.Session>
        <Area id="categoryEditGeneral" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      categoryId
      name
      description
      status
      parent {
        categoryId
        name
        path {
          name
        }
      }
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;
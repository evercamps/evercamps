import { Card } from '@components/admin/cms/Card';
import CategorySelector from '@components/admin/promotion/couponEdit/CategorySelector';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import Editor from '@components/form/fields/Editor';
import { useModal } from '@components/modal/useModal';
import React from 'react';
import { useQuery } from 'urql';

interface Price {
  value?: number;
}

interface Weight {
  value?: number;
}

interface Setting {
  storeCurrency: string;
  weightUnit: string;
}

interface CategoryPathItem {
  name: string;
}

interface Category {
  categoryId: number;
  name?: string;
  path?: CategoryPathItem[];
}

interface Product {
  productId?: number;
  name?: string;
  sku?: string;
  taxClass?: number;
  description?: unknown[];
  price?: {
    regular?: Price;
  };
  weight?: Weight;
  category?: Category;
}

interface TaxClass {
  value: number;
  text: string;
}

interface ProductTaxClasses {
  items: TaxClass[];
}

interface SKUPriceWeightProps {
  sku?: string;
  price?: Price;
  weight?: Weight;
  setting: Setting;
}

function SKUPriceWeight({
  sku,
  price,
  weight,
  setting
}: SKUPriceWeightProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      <div>
        <Field
          id="sku"
          name="sku"
          value={sku}
          placeholder="SKU"
          label="SKU"
          type="text"
          validationRules={['notEmpty']}
        />
      </div>

      <div>
        <Field
          id="price"
          name="price"
          value={price?.value}
          placeholder="Price"
          label="Price"
          type="text"
          validationRules={['notEmpty']}
          suffix={setting.storeCurrency}
        />
      </div>

      <div>
        <Field
          id="weight"
          name="weight"
          value={weight?.value}
          placeholder="Weight"
          label="Weight"
          type="text"
          validationRules={['notEmpty']}
          suffix={setting.weightUnit}
        />
      </div>
    </div>
  );
}

const CategoryQuery = `
  query Query ($id: Int!) {
    category(id: $id) {
      name
      path {
        name
      }
    }
  }
`;

interface ProductCategoryProps {
  categoryId: number;
  onChange: () => void;
  onUnassign: () => void;
}

function ProductCategory({
  categoryId,
  onChange,
  onUnassign
}: ProductCategoryProps) {
  const [result] = useQuery({
    query: CategoryQuery,
    variables: {
      id: categoryId
    }
  });

  const { data, fetching, error } = result;

  if (error) {
    return (
      <p className="text-critical">
        There was an error fetching categories.
        {error.message}
      </p>
    );
  }

  if (fetching) {
    return <span>Loading...</span>;
  }

  return (
    <div>
      {data?.category.path.map((item: CategoryPathItem, index: number) => (
        <span key={item.name} className="text-gray-500">
          {item.name}
          {index < data.category.path.length - 1 && ' > '}
        </span>
      ))}

      <span className="text-interactive pl-8">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onChange();
          }}
        >
          Change
        </a>

        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onUnassign();
          }}
          className="text-critical ml-8"
        >
          Unassign
        </a>
      </span>
    </div>
  );
}

interface CategorySelectProps {
  product?: Product;
}

function CategorySelect({ product }: CategorySelectProps) {
  const [category, setCategory] = React.useState<number | null>(
    product?.category?.categoryId || null
  );

  const modal = useModal();

  const closeModal = () => {
    modal.closeModal();
  };

  const onSelect = (categoryId: number) => {
    setCategory(categoryId);
    closeModal();
  };

  return (
    <div className="mt-6 relative">
      <div className="mb-4">Category</div>

      {category && (
        <div className="border rounded border-[#c9cccf] mb-4 p-4">
          <ProductCategory
            categoryId={category}
            onChange={() => modal.openModal()}
            onUnassign={() => setCategory(null)}
          />
        </div>
      )}

      {!category && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            modal.openModal();
          }}
          className="text-interactive"
        >
          Select category
        </a>
      )}

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
              <CategorySelector
                onSelect={onSelect}
                onUnSelect={() => {}}
                selectedIDs={category ? [category] : []}
                closeModal={closeModal}
              />
            </div>
          </div>
        </div>
      )}

      <input
        type="hidden"
        name="category_id"
        value={category ?? ''}
      />
    </div>
  );
}

interface GeneralProps {
  product?: Product;
  browserApi: string;
  deleteApi: string;
  uploadApi: string;
  folderCreateApi: string;
  setting: Setting;
  productTaxClasses?: ProductTaxClasses;
}

export default function General({
  product,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi,
  setting,
  productTaxClasses = { items: [] }
}: GeneralProps) {
  const taxClasses = productTaxClasses.items;

  return (
    <Card title="General">
      <Card.Session>
        <Area
          id="productEditGeneral"
          coreComponents={[
            {
              component: { default: Field },
              props: {
                id: 'name',
                name: 'name',
                label: 'Name',
                value: product?.name,
                validationRules: ['notEmpty'],
                type: 'text',
                placeholder: 'Name'
              },
              sortOrder: 10,
              id: 'name'
            },

            {
              component: { default: Field },
              props: {
                id: 'product_id',
                name: 'product_id',
                value: product?.productId,
                type: 'hidden'
              },
              sortOrder: 10,
              id: 'product_id'
            },

            {
              component: { default: SKUPriceWeight },
              props: {
                sku: product?.sku,
                price: product?.price?.regular,
                weight: product?.weight,
                setting
              },
              sortOrder: 20,
              id: 'SKUPriceWeight'
            },

            {
              component: { default: CategorySelect },
              props: {
                product
              },
              sortOrder: 22,
              id: 'category'
            },

            {
              component: { default: Field },
              props: {
                id: 'tax_class',
                name: 'tax_class',
                value: product?.taxClass || '',
                type: 'select',
                label: 'Tax class',
                options: taxClasses,
                placeholder: 'None',
                disableDefaultOption: false
              },
              sortOrder: 25,
              id: 'tax_class'
            },

            {
              component: { default: Editor },
              props: {
                id: 'description',
                name: 'description',
                label: 'Description',
                value: product?.description,
                browserApi,
                deleteApi,
                uploadApi,
                folderCreateApi
              },
              sortOrder: 30,
              id: 'description'
            }
          ]}
        />
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
    product(id: getContextValue("productId", null)) {
      productId
      name
      description
      sku
      taxClass
      price {
        regular {
          value
          currency
        }
      }
      weight {
        value
        unit
      }
      category {
        categoryId
        path {
          name
        }
      }
    }

    setting {
      weightUnit
      storeCurrency
    }

    browserApi: url(
      routeId: "fileBrowser",
      params: [{key: "0", value: ""}]
    )

    deleteApi: url(
      routeId: "fileDelete",
      params: [{key: "0", value: ""}]
    )

    uploadApi: url(
      routeId: "imageUpload",
      params: [{key: "0", value: ""}]
    )

    folderCreateApi: url(routeId: "folderCreate")

    productTaxClasses: taxClasses {
      items {
        value: taxClassId
        text: name
      }
    }
  }
`;
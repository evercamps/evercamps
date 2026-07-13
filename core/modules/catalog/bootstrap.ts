import path from 'path';
import config from 'config';
import { CONSTANTS } from '../../lib/helpers.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerWidget } from '../../lib/widget/widgetManager.js';
import { registerCartItemProductUrlField } from './services/registerCartItemProductUrlField.js';
import { registerCartItemVariantOptionsField } from './services/registerCartItemVariantOptionsField.js';
import registerDefaultAttributeCollectionFilters from './services/registerDefaultAttributeCollectionFilters.js';
import registerDefaultCategoryCollectionFilters from './services/registerDefaultCategoryCollectionFilters.js';
import registerDefaultCollectionCollectionFilters from './services/registerDefaultCollectionCollectionFilters.js';
import registerDefaultProductCollectionFilters from './services/registerDefaultProductCollectionFilters.js';

export default (): void => {
  addProcessor('cartItemFields', registerCartItemProductUrlField, 0);
  addProcessor('cartItemFields', registerCartItemVariantOptionsField, 0);

  addProcessor('configurationSchema', (schema: Record<string, any>) => {
    merge(schema, {
      properties: {
        catalog: {
          type: 'object',
          properties: {
            product: {
              type: 'object',
              properties: {
                image: {
                  type: 'object',
                  properties: {
                    thumbnail: {
                      type: 'object',
                      properties: {
                        width: { type: 'integer' },
                        height: { type: 'integer' }
                      }
                    },
                    listing: {
                      type: 'object',
                      properties: {
                        width: { type: 'integer' },
                        height: { type: 'integer' }
                      }
                    },
                    single: {
                      type: 'object',
                      properties: {
                        width: { type: 'integer' },
                        height: { type: 'integer' }
                      }
                    },
                    placeHolder: {
                      type: 'string',
                      format: 'uri-reference'
                    }
                  }
                }
              }
            },
            showOutOfStockProduct: {
              type: 'boolean'
            }
          }
        },
        pricing: {
          type: 'object',
          properties: {
            rounding: {
              type: 'string',
              enum: ['round', 'floor', 'ceil']
            },
            precision: {
              type: 'integer'
            }
          }
        }
      }
    });

    return schema;
  });

  const defaultCatalogConfig = {
    product: {
      image: {
        thumbnail: {
          width: 100,
          height: 100
        },
        listing: {
          width: 300,
          height: 300
        },
        single: {
          width: 500,
          height: 500
        },
        placeHolder: '/default/image/placeholder.png'
      }
    },
    showOutOfStockProduct: false
  };

  config.util.setModuleDefaults('catalog', defaultCatalogConfig);

  const defaultPricingConfig = {
    rounding: 'round',
    precision: 2
  };

  config.util.setModuleDefaults('pricing', defaultPricingConfig);

  addProcessor(
    'productCollectionFilters',
    registerDefaultProductCollectionFilters,
    1
  );

  addProcessor(
    'productCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );

  addProcessor(
    'categoryCollectionFilters',
    registerDefaultCategoryCollectionFilters,
    1
  );

  addProcessor(
    'categoryCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );

  addProcessor(
    'collectionCollectionFilters',
    registerDefaultCollectionCollectionFilters,
    1
  );

  addProcessor(
    'collectionCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );

  addProcessor(
    'attributeCollectionFilters',
    registerDefaultAttributeCollectionFilters,
    1
  );

  addProcessor(
    'attributeCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );

  addProcessor(
    'attributeGroupCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    1
  );

  registerWidget({
    type: 'collection_products',
    name: 'Collection products',
    description: 'A list of products from a collection',
    settingComponent: path.resolve(
      CONSTANTS.LIBPATH,
      '../components/admin/widgets/CollectionProductsSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.LIBPATH,
      '../components/frontStore/widgets/CollectionProducts.js'
    ),
    defaultSettings: {
      collection: null,
      count: 4
    },
    enabled: true
  });

  const parseIntCount = (data: any) => {
    if (data.type !== 'collection_products') {
      return data;
    }

    data.settings = data.settings || {};

    if (data.settings.count) {
      data.settings.count = parseInt(data.settings.count, 10);
    } else {
      data.settings.count = 4;
    }

    return data;
  };

  addProcessor('widgetDataBeforeCreate', parseIntCount, 1);
  addProcessor('widgetDataBeforeUpdate', parseIntCount, 1);
};
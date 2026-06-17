import path from 'path';
import config from 'config';
import { CONSTANTS } from '../../lib/helpers.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerWidget } from '../../lib/widget/widgetManager.js';
import { registerDefaultPageCollectionFilters } from './services/registerDefaultPageCollectionFilters.js';
import { registerDefaultWidgetCollectionFilters } from './services/registerDefaultWidgetCollectionFilters.js';

export default (): void => {
  addProcessor('configurationSchema', (schema: Record<string, any>) => {
    merge(schema, {
      properties: {
        themeConfig: {
          type: 'object',
          properties: {
            logo: {
              type: 'object',
              properties: {
                alt: { type: 'string' },
                src: { type: 'string', format: 'uri-reference' },
                width: { type: 'integer' },
                height: { type: 'integer' }
              }
            },
            headTags: {
              type: 'object',
              properties: {
                links: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      rel: { type: 'string' },
                      href: { type: 'string', format: 'uri-reference' }
                    },
                    required: ['rel', 'href']
                  }
                },
                metas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      content: { type: 'string' }
                    },
                    required: ['name', 'content']
                  }
                },
                scripts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      src: { type: 'string', format: 'uri-reference' },
                      type: { type: 'string' },
                      async: { type: 'boolean' },
                      defer: { type: 'boolean' },
                      crossorigin: { type: 'string' },
                      integrity: { type: 'string' },
                      noModule: { type: 'string' },
                      nonce: { type: 'string' }
                    },
                    required: ['src']
                  }
                },
                bases: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      href: { type: 'string', format: 'uri-reference' }
                    },
                    required: ['href']
                  }
                }
              }
            }
          }
        },
        system: {
          type: 'object',
          properties: {
            file_storage: {
              type: 'string',
              enum: ['local']
            }
          }
        }
      }
    });

    return schema;
  });

  const defaultThemeConfig = {
    logo: {
      alt: undefined,
      src: undefined,
      width: undefined,
      height: undefined
    },
    headTags: {
      links: [],
      metas: [],
      scripts: [],
      bases: []
    },
    copyRight: `© 2025 EverCamps. All Rights Reserved.`
  };

  config.util.setModuleDefaults('themeConfig', defaultThemeConfig);

  config.util.setModuleDefaults('system', {
    file_storage: 'local'
  });

  registerWidget({
    type: 'text_block',
    settingComponent: path.resolve(
      CONSTANTS.LIBPATH,
      '../components/admin/widgets/TextBlockSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.LIBPATH,
      '../components/frontStore/widgets/TextBlock.js'
    ),
    name: 'Text block',
    description: 'A text block widget',
    defaultSettings: {
      className: 'page-width'
    },
    enabled: true
  });

  registerWidget({
    type: 'basic_menu',
    settingComponent: path.resolve(
      CONSTANTS.LIBPATH,
      '../components/admin/widgets/BasicMenuSetting.js'
    ),
    defaultSettings: {},
    component: path.resolve(
      CONSTANTS.LIBPATH,
      '../components/frontStore/widgets/BasicMenu.js'
    ),
    name: 'Menu',
    description: 'A menu widget',
    enabled: true
  });

  addProcessor(
    'cmsPageCollectionFilters',
    registerDefaultPageCollectionFilters,
    1
  );

  addProcessor(
    'cmsPageCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );

  addProcessor(
    'widgetCollectionFilters',
    registerDefaultWidgetCollectionFilters,
    1
  );

  addProcessor(
    'widgetCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );

  const parseMenus = (data: any) => {
    if (data?.type !== 'basic_menu') {
      return data;
    }

    data.settings = data.settings || {};

    if (data.settings.menus) {
      data.settings.menus = JSON.parse(data.settings.menus);
    } else {
      data.settings.menus = [];
    }

    return data;
  };

  addProcessor('widgetDataBeforeCreate', parseMenus, 1);
  addProcessor('widgetDataBeforeUpdate', parseMenus, 1);
};
import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { get } from '../../../../../lib/util/get.js';

// Finds a product's first/primary category (there's no "is_primary" flag on
// product_category - a product can belong to several, so the lowest
// category_id is just a deterministic pick) directly via the join table,
// since the generic breadcrumb logic below can't see it (it only recognizes
// categories that show up as literal url_rewrite path segments).
async function getProductCategory(productId, pool) {
  return select('category.uuid', 'category_description.name')
    .from('product_category')
    .innerJoin('category')
    .on('category.category_id', '=', 'product_category.category_id')
    .leftJoin('category_description')
    .on(
      'category_description.category_description_category_id',
      '=',
      'category.category_id'
    )
    .where('product_category.product_id', '=', productId)
    .orderBy('category.category_id', 'ASC')
    .limit(0, 1)
    .load(pool);
}

async function buildProductBreadcrumbs(uuid, context) {
  const breadcrumbs = [
    { title: translate('Home'), url: '/' },
    { title: translate('Shop'), url: '/shop' }
  ];

  const product = await select('product_id')
    .from('product')
    .where('uuid', '=', uuid)
    .load(context.pool);

  if (product) {
    const category = await getProductCategory(product.product_id, context.pool);
    if (category) {
      breadcrumbs.push({
        title: category.name,
        url: buildUrl('categoryView', { uuid: category.uuid })
      });
    }
  }

  breadcrumbs.push({
    title: get(context, 'pageInfo.title', ''),
    url: get(context, 'currentUrl')
  });

  return breadcrumbs;
}

export default {
  Query: {
    pageInfo: (root, args, context) => ({
      url: get(context, 'currentUrl'),
      title: get(context, 'pageInfo.title', ''),
      description: get(context, 'pageInfo.description', ''),
      keywords: get(context, 'pageInfo.keywords', '')
    })
  },
  PageInfo: {
    breadcrumbs: async (root, args, context) => {
      // Check if the current page is home page
      if (context.originalUrl === '/') {
        return [];
      }
      // Product pages (/product/:uuid) get Home > Shop > [Category >] Title
      // instead of the generic logic below - matched directly off the URL
      // rather than url_rewrite, since no product currently has a
      // url_rewrite row (nothing in this codebase ever inserts one).
      const productMatch = context.originalUrl
        .split('?')[0]
        .match(/^\/product\/([^/]+)\/?$/);
      if (productMatch) {
        return buildProductBreadcrumbs(productMatch[1], context);
      }
      // Get the current path
      const path = context.originalUrl
        .split('?')[0]
        .replace(/^\/|\/$/g, '')
        .replace(/\./g, '');

      // Check if the path is existed in the url_rewrite table
      const rewriteRule = await select()
        .from('url_rewrite')
        .where('request_path', '=', `/${path}`)
        .load(context.pool);
      if (!rewriteRule) {
        return [
          {
            title: translate('Home'),
            url: '/'
          },
          {
            title: get(context, 'pageInfo.title', ''),
            url: get(context, 'currentUrl')
          }
        ];
      } else {
        // Split the target path and remove the last element
        const paths = rewriteRule.request_path.split('/');
        paths.pop();
        // Each element is represented for a category (url_key)
        // Build the breadrumbs
        const breadcrumbs = [
          {
            title: translate('Home'),
            url: '/'
          }
        ];
        for (let i = 0; i < paths.length; i += 1) {
          if (paths[i] === '') {
            continue;
          }
          const urlKey = paths[i];
          const categoryQuery = select().from('category');
          categoryQuery
            .leftJoin('category_description')
            .on(
              'category_description.category_description_category_id',
              '=',
              'category.category_id'
            );
          categoryQuery.where('category_description.url_key', '=', urlKey);
          const category = await categoryQuery.load(context.pool);
          if (category) {
            breadcrumbs.push({
              title: category.name,
              url: `${paths.slice(0, i + 1).join('/')}`
            });
          } else {
            continue;
          }
        }

        breadcrumbs.push({
          title: get(context, 'pageInfo.title', ''),
          url: get(context, 'currentUrl')
        });

        return breadcrumbs;
      }
    }
  }
};

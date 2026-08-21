interface CollectionProductsWidgetArgs {
  collection: string;
  count?: string | number;
}

interface CollectionProductsWidget {
  collection: string;
  count: number;
}

export default {
  Query: {
    collectionProductsWidget: async (
      _root: unknown,
      { collection, count }: CollectionProductsWidgetArgs
    ): Promise<CollectionProductsWidget> => ({
      collection,
      count: count ? parseInt(String(count), 10) : 5
    })
  }
};
export type ProductFamilyData = {
  attribute_group_id: number;
  attribute_codes: string[];
  name?: string;
  url_key?: string;
  description?: string;
  short_description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  default_variant_id?: number;
  [key: string]: any;
};

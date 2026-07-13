export interface TaxClassRow {
  tax_class_id: number;
  uuid: string;
  name: string;
}

export interface TaxRateRow {
  tax_rate_id: number;
  uuid: string;
  name: string;
  tax_class_id: number;
  country: string;
  province: string;
  postcode: string;
  rate: number;
  is_compound: boolean;
  priority: number;
}

export interface SettingRow {
  name: string;
  value: string;
}

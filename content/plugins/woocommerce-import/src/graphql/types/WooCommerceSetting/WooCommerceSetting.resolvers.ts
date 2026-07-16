interface SettingRow {
  name: string;
  value: string;
}

// wooCommerceConsumerSecret is intentionally never resolved here - the
// settings form always renders that field blank and only sends a new value
// when the admin retypes it (see WooCommerceSettings.tsx).
const findValue = (setting: SettingRow[], name: string): string | null =>
  setting.find((s) => s.name === name)?.value ?? null;

export default {
  Setting: {
    wooCommerceStoreUrl: (setting: SettingRow[]) => findValue(setting, 'wooCommerceStoreUrl'),
    wooCommerceConsumerKey: (setting: SettingRow[]) => findValue(setting, 'wooCommerceConsumerKey')
  }
};

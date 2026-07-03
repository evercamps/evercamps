export interface StripeConfig {
  publishableKey?: string;
  secretKey?: string;
  endpointSecret?: string;
  status?: string | number;
}

export interface PaypalConfig {
  status?: string | number;
  clientId?: string;
  clientSecret?: string;
  webhookSecret?: string;
}

export interface MollieConfig {
  molliePaymentStatus?: string;
  molliePaymentMode?: string;
  mollieTestApiKey?: string;
  mollieLiveApiKey?: string;
  mollieDisplayName?: string;
}

export interface CodConfig {
  status?: string | number;
}

import type { Extension } from '../../types/extension.js';

export interface Config {
  admin_collection_size: number;
  resetPasswordTokenLifetime: number;
  shop: {
    currency: string;
    language: string;
    weightUnit: string;
    timezone: string;
    homeUrl: string;
  };
  system: {
    database: {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
      ssl_mode: string;
    };
    session: {
      resave: boolean;
      saveUninitialized: boolean;
      cookieName: string;
      cookieSecret: string;
      adminCookieName: string;
      maxAge: number;
    };
    theme: string;
    extensions: Extension[];
    stripe: StripeConfig;
    paypal: PaypalConfig;
    mollie: MollieConfig;
    cod: CodConfig;
    file_storage: string;
    upload_allowed_mime_types: string[];
  };
  themeConfig: Record<string, unknown>;
  pricing: {
    rounding: 'up' | 'down' | 'round';
    precision: number;
    tax: {
      precision: string;
      price_including_tax: boolean;
      rounding: 'up' | 'down' | 'round';
      round_level: 'unit' | 'line' | 'total';
    };
  };
  catalog: {
    product: {
      image: {
        thumbnail: { width: number; height: number };
        listing: { width: number; height: number };
        single: { width: number; height: number };
      };
    };
    showOutOfStockProduct: boolean;
  };
  customer: {
    addressSchema: unknown;
  };
  checkout: {
    showShippingNote: boolean;
  };
  oms: {
    order: {
      status: Record<string, unknown>;
      shipmentStatus: Record<string, unknown>;
      paymentStatus: Record<string, unknown>;
      psoMapping: Record<string, unknown>;
    };
    carriers: Record<string, unknown>;
  };
}

type IsLeaf<T> = T extends object
  ? T extends unknown[]
    ? true
    : string extends keyof T
    ? true
    : false
  : true;

export type ConfigPaths = {
  [K in keyof Config & string]:
    | K
    | (IsLeaf<Config[K]> extends true ? never : `${K}.${NestedPaths<Config[K]>}`);
}[keyof Config & string];

type NestedPaths<T> = T extends object
  ? {
      [K in keyof T & string]:
        | K
        | (IsLeaf<T[K]> extends true ? never : `${K}.${NestedPaths<T[K]>}`);
    }[keyof T & string]
  : never;

export type ConfigPathValue<P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof Config
      ? DeepValue<Config[K], Rest>
      : never
    : P extends keyof Config
    ? Config[P]
    : never;

type DeepValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? DeepValue<T[K], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

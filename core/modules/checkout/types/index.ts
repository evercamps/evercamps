export type PaymentMethodInfo = {
  methodCode: string;
  methodName: string;
  meta?: Record<string, unknown>;
};

export type PaymentMethodFactory = {
  init: () => PaymentMethodInfo | Promise<PaymentMethodInfo>;
  validator?: () => boolean | Promise<boolean>;
};

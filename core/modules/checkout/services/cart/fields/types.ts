export interface ItemContext {
  getData(key: string): any;
  setError(key: string, message: string | undefined): void;
  getCart(): CartContext;
  getProduct(): Promise<Record<string, any>>;
  getTriggeredField(): string | undefined;
  getRequestedValue(): any;
  getId(): string | undefined;
  hasError(): boolean;
}

export interface CartContext {
  getData(key: string): any;
  setError(key: string, message: string | undefined): void;
  getItems(): ItemContext[];
  getTriggeredField(): string | undefined;
  getRequestedValue(): any;
}

export interface CartField {
  key: string;
  resolvers: Array<(this: CartContext, value?: any) => any>;
  dependencies?: string[];
}

export interface ItemField {
  key: string;
  resolvers: Array<(this: ItemContext, value?: any) => any>;
  dependencies?: string[];
}

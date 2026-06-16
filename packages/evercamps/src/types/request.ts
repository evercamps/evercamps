import { Request as ExpressRequest } from 'express';
import { Route } from './route.js';
import { AdminUserRow } from '../modules/auth/types/index.js';

export interface EvercampsRequest extends ExpressRequest {
  isAdmin: boolean;
  session: any;
  currentRoute: Route;
  locals?: {
    delegates?: {
      setOnce: (key: string, value: any) => void;
      get: (key: string) => any;
      has: (key: string) => boolean;
      keys: () => string[];
      getAll: () => Record<string, unknown>;
    };
    user?: AdminUserRow;
    customer?: {
      customer_id: number;
      uuid: string;
      email: string;
      full_name: string;
      status: number;
      created_at: Date;
      updated_at: Date;
    };
    context?: Record<string, any>;
  };
  loginCustomerWithEmail: (
    email: string,
    password: string,
    callback: (err: Error | null, customer?: any) => void
  ) => Promise<void>;
  logoutCustomer: (callback: (err: Error | null) => void) => void;
  isCustomerLoggedIn: () => boolean;
  getCurrentCustomer: () => any;
  loginUserWithEmail: (
    email: string,
    password: string
  ) => Promise<void>;
  logoutUser: (callback: (err: Error | null) => void) => void;
  isUserLoggedIn: () => boolean;
  getCurrentUser: () => AdminUserRow | undefined;
}

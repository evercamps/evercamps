import { request } from 'express';
import { hookable } from '../../lib/util/hookable.js';
import loginUserWithEmail from './services/loginUserWithEmail.js';
import logoutUser from './services/logoutUser.js';
import type { AdminUserRow } from './types/index.js';

declare global {
  namespace Express {
    interface Request {
      loginUserWithEmail(email: string, password: string): Promise<void>;
      logoutUser(callback?: (err?: any) => void): void;
      isUserLoggedIn(): boolean;
      getCurrentUser(): AdminUserRow | undefined;
    }
  }
}

export default () => {
  (request as any).loginUserWithEmail = async function (
    email: string,
    password: string,
    callback: (err?: any) => void
  ) {
    await hookable(loginUserWithEmail.bind(this))(email, password);
    this.session.save(callback);
  };

  (request as any).logoutUser = function (callback: (err?: any) => void) {
    hookable(logoutUser.bind(this))();
    this.session.save(callback);
  };

  (request as any).isUserLoggedIn = function () {
    return !!this.session.userID;
  };

  (request as any).getCurrentUser = function () {
    return this.locals.user;
  };
};

import type { EvercampsRequest } from '../../../../types/request.js';

/**
 * Logout the current customer. This function must be accessed from the request object (request.logoutCustomer())
 */
function logoutCustomer(this: EvercampsRequest): void {
  this.session.customerID = undefined;
  if (this.locals) {
    this.locals.customer = undefined;
  }  
}

export default logoutCustomer;
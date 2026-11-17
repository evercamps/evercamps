import adminNewOrder from './adminNewOrder.js';
import customerWelcome from './customerWelcome.js';
import emailTest from './emailTest.js';
import orderCanceled from './orderCanceled.js';
import orderConfirmation from './orderConfirmation.js';
import registrationConfirmation from './registrationConfirmation.js';
import resetPassword from './resetPassword.js';

export const coreEmailTemplates = [
  orderConfirmation,
  adminNewOrder,
  orderCanceled,
  customerWelcome,
  registrationConfirmation,
  resetPassword,
  emailTest
];

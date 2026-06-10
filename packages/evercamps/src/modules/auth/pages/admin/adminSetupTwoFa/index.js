import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response, next) => {    
  const user = request.getCurrentUser();
  if (user) {
    setContextValue(request, 'adminUserId', user.admin_user_id);
  }
      
  setContextValue(request, 'pageInfo', {
    title: 'Admin 2FA Setup',
    description: 'Admin 2FA Setup'
  });
  next();
  
};

import type { EvercampsRequest } from '../../types/request.js';

export function isAjax(request: EvercampsRequest) {
  return request.get('X-Requested-With') === 'XMLHttpRequest';
}

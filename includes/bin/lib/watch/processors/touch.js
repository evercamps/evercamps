import { resolve } from 'path';
import touch from 'touch';
import { CONSTANTS } from '../../../../lib/helpers.js';

export function justATouch() {
  touch(
    resolve(CONSTANTS.LIBPATH, '../components/react/client/Index.jsx')
  );
}

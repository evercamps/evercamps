// core/ and includes/ are one tree at build time (tsconfig "rootDirs"), so a
// file in core/ can import "../../lib/x" that only exists as includes/lib/x.
// When a relative import from core/ can't be found, retry it under includes/.
const path = require('path');

const root = __dirname;
const core = path.join(root, 'core') + path.sep;
const includes = path.join(root, 'includes') + path.sep;

module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (e) {
    if (!request.startsWith('.')) throw e;
    const absolute = path.resolve(options.basedir, request);
    if (!absolute.startsWith(core)) throw e;
    const mirrored = includes + absolute.slice(core.length);
    return options.defaultResolver(mirrored, options);
  }
};

import path from 'path';
import { promises as fsp } from 'fs';
import { compileSwc } from '../lib/watch/compileSwc.js';
import { getSrcPaths } from '../lib/watch/getSrcPaths.js';

async function compileTs() {
  const srcPaths = getSrcPaths();
  const events = srcPaths.map((srcPath) => {
    return {
      srcPath: srcPath,
      distPath: path.resolve(srcPath, '..', 'dist')
    };
  });

  // Multiple srcPaths (e.g. core/ and includes/) can share the same distPath.
  // Clean each unique dist target once upfront so the compiles below don't
  // race each other deleting/recreating the same shared directory.
  const uniqueDistPaths = [...new Set(events.map((event) => event.distPath))];
  await Promise.all(
    uniqueDistPaths.map((distPath) =>
      fsp.rm(distPath, { recursive: true, force: true })
    )
  );

  await Promise.all(
    events.map((event) => {
      return compileSwc(event.srcPath, event.distPath, { clean: false });
    })
  );
}

export { compileTs };

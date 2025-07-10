import fs from 'fs';
import path from 'path';
import packageJson from '../package.json' with { type: 'json' };
// Get the current version of the package from the nearest package.json file
const { version } = packageJson;
// Get the --pack-destination from the command line arguments
// Create a package.json file in the packDestination directory with dependencies is the package itself
fs.writeFileSync(
  path.resolve(process.env.npm_config_pack_destination, 'package.json'),
  JSON.stringify(
    {
      name: packageJson.name,
      version,
      dependencies: {
        '@evercamps/evercamps': `file:./evercamps-evercamps-${version}.tgz`
      },
      scripts: {
        setup: 'evercamps install',
        start: 'evercamps start',
        'start:debug': 'evercamps start:debug',
        build: 'evercamps build',
        dev: 'evercamps dev',
        'user:create': 'evercamps user:create'
      }
    },
    null,
    2
  )
);

import * as program from 'commander';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  npm, writeFileOrFail, readFileOrFail, SERVER_SRC_FOLDER,
  updateDvConfig, updatePackage, concurrentlyCmd, startServerCmd, buildFeCmd,
  buildServerCmd, DVCONFIG_FILE_PATH, SERVER_DIST_FOLDER
} from './dv';


const SERVER_PATH = path.join(SERVER_SRC_FOLDER, 'server.ts');
const SERVER_TSCONFIG_PATH = path.join(SERVER_SRC_FOLDER, 'tsconfig.json');
const SERVER_BLUEPRINT: string = readFileOrFail(
  path.join(__dirname, 'server.blueprint.ts'));
const SERVER_TSCONFIG_BLUEPRINT: string = readFileOrFail(
  path.join(__dirname, 'tsconfig.blueprint.json'));


program
  .version('0.0.1')
  .command('action <name>', 'create a new action')
  .command('server', 'create a new server')
  .action(cmd => {
    if (cmd == 'server') {
      console.log('Installing packages');
      npm([
        'install', 'apollo-server-express', 'body-parser', 'express',
        'graphql', 'graphql-tools', '@types/command-line-args',
        '@types/mongodb', '--save'
      ]);

      console.log('Create server file');
      if (!existsSync(SERVER_SRC_FOLDER)) {
        mkdirSync(SERVER_SRC_FOLDER);
      }
      writeFileOrFail(SERVER_PATH, SERVER_BLUEPRINT);

      console.log('Create server tsconfig');
      writeFileOrFail(SERVER_TSCONFIG_PATH, SERVER_TSCONFIG_BLUEPRINT);

      console.log('Update dvconfig.json');
      updateDvConfig(dvConfig => {
        dvConfig.config = { wsPort: 3001 };
        dvConfig.startServer = true;
        return dvConfig;
      });

      console.log('Add start and watch scripts to package.json');
      const name: string = JSON.parse(readFileOrFail(DVCONFIG_FILE_PATH)).name;
      updatePackage(pkg => {
        pkg.scripts[`dv-build-${name}`] = concurrentlyCmd(
          buildFeCmd(false), buildServerCmd(false));
        pkg.scripts[`dv-build-watch-${name}`] = concurrentlyCmd(
          buildFeCmd(true), buildServerCmd(true));

        pkg.scripts[`dv-start-${name}`] = startServerCmd(
          false, SERVER_DIST_FOLDER, 'config');
        pkg.scripts[`dv-start-watch-${name}`] = startServerCmd(
          true, SERVER_DIST_FOLDER, 'config');

        return pkg;
      });
    }
  }) 
  .parse(process.argv);

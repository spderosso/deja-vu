import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import {
  buildFeCmd,
  buildServerCmd,
  concurrentlyCmd,
  DVCONFIG_FILE_PATH,
  npm,
  readFileOrFail,
  SERVER_DIST_FOLDER,
  SERVER_SRC_FOLDER,
  startServerCmd,
  updateDvConfig,
  updatePackage,
  writeFileOrFail
} from '../../utils';


const SERVER_PATH = path.join(SERVER_SRC_FOLDER, 'server.ts');
const SERVER_TSCONFIG_PATH = path.join(SERVER_SRC_FOLDER, 'tsconfig.json');
const SERVER_BLUEPRINT: string = readFileOrFail(
  path.join(__dirname, 'blueprints', 'server.blueprint.ts'));
const SCHEMA_PATH = path.join(SERVER_SRC_FOLDER, 'schema.graphql');
const SCHEMA_BLUEPRINT: string = readFileOrFail(
  path.join(__dirname, 'blueprints', 'schema.blueprint.graphql'));
const SERVER_TSCONFIG_BLUEPRINT: string = readFileOrFail(
  path.join(__dirname, 'blueprints', 'tsconfig.blueprint.json'));

exports.command = 'server';
exports.desc = 'create a new server';
exports.handler = () => {
  console.log('Installing server packages');
  npm([
    'install', 'minimist', 'express', 'body-parser', 'mongodb',
    'apollo-server-express', 'graphql-tools', '@types/minimist', 'graphql',
    '@types/express', '@types/body-parser', '@types/mongodb', '--save'
  ]);
  npm([
    'install', '@types/minimist', '@types/express', '@types/body-parser',
    '@types/mongodb', '--save-dev'
  ]);

  console.log('Create server file');
  if (!existsSync(SERVER_SRC_FOLDER)) {
    mkdirSync(SERVER_SRC_FOLDER);
  }
  writeFileOrFail(SERVER_PATH, SERVER_BLUEPRINT);
  writeFileOrFail(SCHEMA_PATH, SCHEMA_BLUEPRINT);

  console.log('Create server tsconfig');
  writeFileOrFail(SERVER_TSCONFIG_PATH, SERVER_TSCONFIG_BLUEPRINT);

  console.log('Update dvconfig.json');
  updateDvConfig((dvConfig) => {
    dvConfig.config = { wsPort: 3001 };
    dvConfig.startServer = true;

    return dvConfig;
  });

  console.log('Add start and watch scripts to package.json');
  const name: string = JSON.parse(readFileOrFail(DVCONFIG_FILE_PATH)).name;
  updatePackage((pkg) => {
    pkg.scripts[`dv-build-${name}`] = buildFeCmd(false) + ' && ' +
      buildServerCmd(false, 'server');
    pkg.scripts[`dv-build-watch-${name}`] = concurrentlyCmd(
      buildFeCmd(true), buildServerCmd(true, 'server'));

    pkg.scripts[`dv-start-${name}`] = startServerCmd(
      false, SERVER_DIST_FOLDER, 'config');
    pkg.scripts[`dv-start-watch-${name}`] = startServerCmd(
      true, SERVER_DIST_FOLDER, 'config');

    return pkg;
  });
};

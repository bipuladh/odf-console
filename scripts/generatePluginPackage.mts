import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SUPPORTED_PLUGINS = ['odf', 'mco'];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const validatePluginName = (pluginName) =>
  SUPPORTED_PLUGINS.includes(pluginName);

const plguinNameArgument = '--plugin';

const args = process.argv;

const indexOfPluginArgument = args.indexOf(plguinNameArgument);
const pluginToBeProcessed = args[indexOfPluginArgument + 1];

if (!validatePluginName(pluginToBeProcessed)) {
  // eslint-disable-next-line no-console
  console.error(`Invalid argument ${pluginToBeProcessed}`);
  process.exit(1);
}
const pluginDir = `${__dirname}/../plugins/${pluginToBeProcessed}`;

const frontendPackage = JSON.parse(
  fs.readFileSync(`${__dirname}/../package.json`, { encoding: 'utf-8' })
);
frontendPackage.consolePlugin = JSON.parse(
  fs.readFileSync(`${pluginDir}/console-plugin.json`, {
    encoding: 'utf-8',
  })
);
fs.writeFileSync(`${pluginDir}./package.json`, JSON.stringify(frontendPackage));


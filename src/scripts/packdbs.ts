import fs from 'fs';
import path from 'path';

import { FileHelper } from 'adash-ts-helper';
import jsonpack from 'jsonpack/main';
import { Config } from '../types/config';

export default async function (config: Config) {
  const fPaths = fs
    .readdirSync(`${config.dataDir}`, { withFileTypes: true })
    .filter((item) => !item.isDirectory() && item.name.includes('.json'))
    .map((item) => item.name);

  for (const fPath of fPaths) {
    console.log("Reading...", path.join(`${config.dataDir}`, fPath))
    const content = await FileHelper.readJSONFile(path.join(`${config.dataDir}`, fPath));
    await FileHelper.writeFile(
      jsonpack.pack(content),
      path.join(`${config.dataDir}`, fPath.replace('.json', '.db'))
    );

    console.log("Done!", fPath.replace('.json', '.db'))
  }
}

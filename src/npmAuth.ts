/* eslint-disable no-console */
import fs from 'fs';

export const setupNpmAuth = () => {
  const npmrcPath = `${process.env.HOME}/.npmrc`;
  if (fs.existsSync(npmrcPath)) {
    console.log('Found existing .npmrc file');
    return;
  }

  console.log('No .npmrc file found, creating one');
  const { NPM_TOKEN } = process.env;

  if (NPM_TOKEN) {
    fs.writeFileSync(npmrcPath, `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}`);
  }
};

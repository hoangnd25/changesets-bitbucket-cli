import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage('$0 [command] [flags]')
  .option('publish-command', {
    describe: 'Command to use to build and publish packages',
    alias: 'pc',
    string: true,
  })
  .option('version-command', {
    describe: 'Command to update version, edit CHANGELOG, read and delete changesets',
    alias: 'vc',
    string: true,
  })
  .option('pr', {
    describe: 'If false, changes will be committed and published without PR',
    boolean: true,
    default: true,
  })
  .option('pr-title', {
    describe: 'PR title to use for Bitbucket',
    string: true,
  })
  .option('commit-message', {
    describe: 'Commit message to use for Bitbucket',
    string: true,
  })
  .option('git-user-name', {
    describe: 'Git user name',
    string: true,
  })
  .option('git-user-email', {
    describe: 'Git user name',
    string: true,
  })
  .option('git-user-email', {
    describe: 'Commit message to use for Bitbucket',
    string: true,
  })
  .option('cwd', {
    describe: 'Working directory to use',
    default: process.cwd(),
  })
  .help().argv;

export const cliArgs = () => ({
  publishCommand: argv['publish-command'],
  versionCommand: argv['version-command'],
  createPr: argv['pr'],
  prTitle: argv['pr-title'],
  commitMessage: argv['commit-message'],
  cwd: argv['cwd'],
  gitUserName: argv['git-user-name'],
  gitUserEmail: argv['git-user-email'],
});

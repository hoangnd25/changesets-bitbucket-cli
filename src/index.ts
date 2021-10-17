#!/usr/bin/env node

/* eslint-disable no-console */
import { readChangesetState } from './utils';
import { setupNpmAuth } from './npmAuth';
import { runPublish, runVersion } from './commands';
import { cliArgs } from './cliArgs';

const { publishCommand, versionCommand, commitMessage, prTitle, noPr, cwd } = cliArgs();

(async () => {
  const { changesets } = await readChangesetState(cwd);

  const hasChangesets = changesets.length !== 0;
  const hasPublishCommand = !!publishCommand;

  if (!hasChangesets && !hasPublishCommand) {
    console.log('No changesets found');
    return;
  }

  if (!hasChangesets && hasPublishCommand) {
    console.log('No changesets found, attempting to publish any unpublished packages to npm');
    setupNpmAuth();
    await runPublish({
      command: publishCommand,
      cwd,
    });
    return;
  }

  if (hasChangesets) {
    await runVersion({
      command: versionCommand,
      cwd,
      prTitle,
      commitMessage,
      hasPublishCommand,
      createPr: !noPr,
    });
    return;
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});

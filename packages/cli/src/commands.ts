import path from 'path';
import exec from 'execa';
import fs from 'fs-extra';
import resolveFrom from 'resolve-from';
import * as semver from 'semver';
import { getPackages, Package } from '@manypkg/get-packages';
import * as gitUtils from './gitUtils';
import {
  readChangesetState,
  getChangedPackages,
  getChangelogEntry,
  getVersionsByDirectory,
  sortTheThings,
} from './utils';
import { createPullRequest, getPullRequest, updatePullRequest } from './bitbucketUtils';

interface PublishOptions {
  command: string;
  cwd?: string;
}

export const runPublish = async ({ command, cwd = process.cwd() }: PublishOptions) => {
  const [publishCommand, ...publishArgs] = command.split(/\s+/);

  const changesetPublishOutput = await exec(publishCommand, publishArgs, { cwd });
  await gitUtils.pushTags();

  const { packages, tool } = await getPackages(cwd);
  const releasedPackages: Package[] = [];

  if (tool !== 'root') {
    const newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
    const packagesByName = new Map(packages.map(x => [x.packageJson.name, x]));

    for (const line of changesetPublishOutput.stdout.split('\n')) {
      const match = line.match(newTagRegex);
      if (match === null) {
        continue;
      }
      const pkgName = match[1];
      const pkg = packagesByName.get(pkgName);
      if (pkg === undefined) {
        throw new Error(
          `Package "${pkgName}" not found.` +
            'This is probably a bug in the action, please open an issue',
        );
      }
      releasedPackages.push(pkg);
    }
  } else {
    if (packages.length === 0) {
      throw new Error(
        `No package found.` + 'This is probably a bug in the action, please open an issue',
      );
    }
    const pkg = packages[0];
    const newTagRegex = /New tag:/;

    for (const line of changesetPublishOutput.stdout.split('\n')) {
      const match = line.match(newTagRegex);

      if (match) {
        releasedPackages.push(pkg);
        break;
      }
    }
  }

  return;
};

interface VersionOptions {
  command?: string;
  cwd?: string;
  prTitle?: string;
  commitMessage?: string;
  hasPublishCommand?: boolean;
}
export const runVersion = async ({
  command,
  cwd = process.cwd(),
  prTitle = 'Version Packages',
  commitMessage = 'Version Packages',
  hasPublishCommand = false,
}: VersionOptions) => {
  const branch = process.env.BITBUCKET_BRANCH || 'master';
  const versionBranch = `changeset-release/${branch}`;
  const { preState } = await readChangesetState(cwd);

  await gitUtils.switchToMaybeExistingBranch(versionBranch);
  await gitUtils.reset(process.env.BITBUCKET_COMMIT || '');

  const versionsByDirectory = await getVersionsByDirectory(cwd);

  if (command) {
    const [versionCommand, ...versionArgs] = command.split(/\s+/);
    await exec(versionCommand, versionArgs, { cwd });
  } else {
    const changesetsCliPkgJson = requireChangesetsCliPkgJson(cwd);
    const cmd = semver.lt(changesetsCliPkgJson.version, '2.0.0') ? 'bump' : 'version';
    await exec('node', [resolveFrom(cwd, '@changesets/cli/bin.js'), cmd], {
      cwd,
    });
  }

  const changedPackages = await getChangedPackages(cwd, versionsByDirectory);

  const preStateMessage = preState
    ? `
⚠️⚠️⚠️⚠️⚠️⚠️
\`${branch}\` is currently in **pre mode** so this branch has prereleases rather than normal releases. If you want to exit prereleases, run \`changeset pre exit\` on \`${branch}\`.
⚠️⚠️⚠️⚠️⚠️⚠️
`
    : '';

  const prBodyPromise = (async () => {
    return (
      `This PR was opened by Changesets.

When you're ready to do a release, you can merge this and ${
        hasPublishCommand
          ? `the packages will be published to npm automatically`
          : `publish to npm yourself or [setup this action to publish automatically]`
      }.

If you're not ready to do a release yet, that's fine, whenever you add more changesets to ${branch}, this PR will be updated.
${preStateMessage}
# Releases
  ` +
      (
        await Promise.all(
          changedPackages.map(async pkg => {
            const changelogContents = await fs.readFile(path.join(pkg.dir, 'CHANGELOG.md'), 'utf8');

            const entry = await getChangelogEntry(changelogContents, pkg.packageJson.version);
            return {
              highestLevel: entry.highestLevel,
              private: !!pkg.packageJson.private,
              content: `## ${pkg.packageJson.name}@${pkg.packageJson.version}\n\n` + entry.content,
            };
          }),
        )
      )
        .filter(x => x)
        .sort(sortTheThings)
        .map(x => x.content)
        .join('\n ')
    );
  })();

  const finalPrTitle = `${prTitle}${preState ? ` (${preState.tag})` : ''}`;

  if (!(await gitUtils.checkIfClean())) {
    const finalCommitMessage = `${commitMessage}${preState ? ` (${preState.tag})` : ''}`;
    await gitUtils.commitAll(finalCommitMessage);
  }

  await gitUtils.push(versionBranch, { force: true });

  const existingPr = await getPullRequest({
    branch: versionBranch,
    destinationBranch: branch,
  });

  console.error(await prBodyPromise);

  if (existingPr) {
    await updatePullRequest({
      id: existingPr.id,
      title: finalPrTitle,
      description: await prBodyPromise,
    });
  } else {
    await createPullRequest({
      title: finalPrTitle,
      description: await prBodyPromise,
      branch: versionBranch,
      destinationBranch: branch,
    });
  }

  return;
};

const requireChangesetsCliPkgJson = (cwd: string) => {
  try {
    return require(resolveFrom(cwd, '@changesets/cli/package.json'));
  } catch (
    err: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    if (err && err.code === 'MODULE_NOT_FOUND') {
      throw new Error(`Have you forgotten to install \`@changesets/cli\` in "${cwd}"?`);
    }
    throw err;
  }
};

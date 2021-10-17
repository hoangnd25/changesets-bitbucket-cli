import exec from 'execa';
import { cliArgs } from './cliArgs';

export const setupUser = async () => {
  const { gitUserName, gitUserEmail } = cliArgs();
  if (gitUserName) {
    await exec('git', ['config', '--global', 'user.name', `"${gitUserName}`]);
  }

  if (gitUserEmail) {
    await exec('git', ['config', '--global', 'user.email', `"${gitUserEmail}"`]);
  }
};

export const pullBranch = async (branch: string) => {
  await exec('git', ['pull', 'origin', branch]);
};

export const push = async (branch: string, { force }: { force?: boolean } = {}) => {
  await exec(
    'git',
    ['push', 'origin', `HEAD:${branch}`, force && '--force'].filter<string>(Boolean as any),
  );
};

export const pushTags = async () => {
  await exec('git', ['push', 'origin', '--tags']);
};

export const switchToMaybeExistingBranch = async (branch: string) => {
  await exec('git', ['checkout', branch]).catch(error => {
    const isCreatingBranch = !error.stderr
      .toString()
      .includes(`Switched to a new branch '${branch}'`);
    if (isCreatingBranch) {
      return exec('git', ['checkout', '-b', branch]);
    }
  });
};

export const reset = async (pathSpec: string, mode: 'hard' | 'soft' | 'mixed' = 'hard') => {
  await exec('git', ['reset', `--${mode}`, pathSpec]);
};

export const commitAll = async (message: string) => {
  await exec('git', ['add', '.']);
  await exec('git', ['commit', '-m', message]);
};

export const checkIfClean = async (): Promise<boolean> => {
  const { stdout } = await exec('git', ['status', '--porcelain']);
  return !stdout.length;
};

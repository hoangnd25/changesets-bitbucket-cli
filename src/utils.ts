import { getPackages, Package } from '@manypkg/get-packages';
import { PreState, NewChangeset } from '@changesets/types';
import { readPreState } from '@changesets/pre';
import readChangesets from '@changesets/read';
import unified from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import mdastToString from 'mdast-util-to-string';

export async function getChangedPackages(cwd: string, previousVersions: Map<string, string>) {
  const { packages } = await getPackages(cwd);
  const changedPackages = new Set<Package>();

  for (const pkg of packages) {
    const previousVersion = previousVersions.get(pkg.dir);
    if (previousVersion !== pkg.packageJson.version) {
      changedPackages.add(pkg);
    }
  }

  return [...changedPackages];
}

export async function getVersionsByDirectory(cwd: string) {
  const { packages } = await getPackages(cwd);
  return new Map(packages.map(x => [x.dir, x.packageJson.version]));
}

export function sortTheThings(
  a: { private: boolean; highestLevel: number },
  b: { private: boolean; highestLevel: number },
) {
  if (a.private === b.private) {
    return b.highestLevel - a.highestLevel;
  }
  if (a.private) {
    return 1;
  }
  return -1;
}

export type ChangesetState = {
  preState: PreState | undefined;
  changesets: NewChangeset[];
};

export const readChangesetState = async (cwd: string = process.cwd()): Promise<ChangesetState> => {
  const preState = await readPreState(cwd);
  const isInPreMode = preState !== undefined && preState.mode === 'pre';

  let changesets = await readChangesets(cwd);

  if (isInPreMode) {
    const changesetsToFilter = new Set(preState.changesets);
    changesets = changesets.filter(x => !changesetsToFilter.has(x.id));
  }

  return {
    preState: isInPreMode ? preState : undefined,
    changesets,
  };
};

export const BumpLevels = {
  dep: 0,
  patch: 1,
  minor: 2,
  major: 3,
} as const;

export async function getChangelogEntry(changelog: string, version: string) {
  const ast = unified().use(remarkParse).parse(changelog) as any;

  let highestLevel: number = BumpLevels.dep;

  const nodes = ast.children as Array<any>;
  let headingStartInfo:
    | {
        index: number;
        depth: number;
      }
    | undefined;
  let endIndex: number | undefined;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 'heading') {
      const stringified: string = mdastToString(node);
      const match = stringified.toLowerCase().match(/(major|minor|patch)/);
      if (match !== null) {
        const level = BumpLevels[match[0] as 'major' | 'minor' | 'patch'];
        highestLevel = Math.max(level, highestLevel);
      }
      if (headingStartInfo === undefined && stringified === version) {
        headingStartInfo = {
          index: i,
          depth: node.depth,
        };
        continue;
      }
      if (
        endIndex === undefined &&
        headingStartInfo !== undefined &&
        headingStartInfo.depth === node.depth
      ) {
        endIndex = i;
        break;
      }
    }
  }
  if (headingStartInfo) {
    ast.children = (ast.children as any).slice(headingStartInfo.index + 1, endIndex);
  }
  return {
    content: unified().use(remarkStringify).stringify(ast),
    highestLevel: highestLevel,
  };
}

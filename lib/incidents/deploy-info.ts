import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export type DeployInfo = {
  gitSha: string | null;
  gitBranch: string | null;
  versionLabel: string | null;
  source: 'env' | 'git' | 'package' | 'unknown';
};

/** Best-effort deploy correlation — never throws; never exposes secrets. */
export function getDeployInfo(): DeployInfo {
  const envSha =
    process.env.RENDER_GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    null;
  const envBranch =
    process.env.RENDER_GIT_BRANCH ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.GIT_BRANCH ||
    null;

  if (envSha) {
    return {
      gitSha: String(envSha).slice(0, 40),
      gitBranch: envBranch ? String(envBranch).slice(0, 128) : null,
      versionLabel: String(envSha).slice(0, 7),
      source: 'env',
    };
  }

  try {
    const sha = execSync('git rev-parse HEAD', {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    })
      .toString()
      .trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    })
      .toString()
      .trim();
    if (sha) {
      return {
        gitSha: sha.slice(0, 40),
        gitBranch: branch || null,
        versionLabel: sha.slice(0, 7),
        source: 'git',
      };
    }
  } catch {
    /* ignore */
  }

  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    ) as { version?: string };
    if (pkg.version) {
      return {
        gitSha: null,
        gitBranch: null,
        versionLabel: pkg.version,
        source: 'package',
      };
    }
  } catch {
    /* ignore */
  }

  return { gitSha: null, gitBranch: null, versionLabel: null, source: 'unknown' };
}

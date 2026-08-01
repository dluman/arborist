const util = require('util');
const { exec } = require('child_process');

const github = require('@actions/github');
const core = require('@actions/core');

const execAsync = util.promisify(exec);

// Parse a JSON input safely.
function parseJsonInput(name, value, fallback = {}) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error(`Input "${name}" is not valid JSON: ${err.message}`);
  }
}

// Validate that branches is a non-empty array of strings.
function validateBranches(branches) {
  if (!Array.isArray(branches) || branches.length === 0) {
    throw new Error('Input "branches" must be a non-empty JSON array of branch names');
  }
  for (const branch of branches) {
    if (typeof branch !== 'string' || branch.trim() === '') {
      throw new Error('Each branch name in "branches" must be a non-empty string');
    }
  }
}

// Validate required-checks mapping.
function validateRequiredChecks(checks) {
  if (typeof checks !== 'object' || checks === null || Array.isArray(checks)) {
    throw new Error('Input "required-checks" must be a JSON object mapping branch names to arrays of check contexts');
  }
  for (const [branch, contexts] of Object.entries(checks)) {
    if (!Array.isArray(contexts)) {
      throw new Error(`Required checks for branch "${branch}" must be an array of strings`);
    }
    for (const ctx of contexts) {
      if (typeof ctx !== 'string' || ctx.trim() === '') {
        throw new Error(`Required check context for branch "${branch}" must be a non-empty string`);
      }
    }
  }
}

// Validate team-roles mapping.
function validateTeamRoles(roles) {
  if (typeof roles !== 'object' || roles === null || Array.isArray(roles)) {
    throw new Error('Input "team-roles" must be a JSON object mapping team slugs to permission levels');
  }
  const validPermissions = ['pull', 'triage', 'push', 'maintain', 'admin'];
  for (const [team, permission] of Object.entries(roles)) {
    if (!validPermissions.includes(permission)) {
      throw new Error(`Invalid permission "${permission}" for team "${team}". Must be one of: ${validPermissions.join(', ')}`);
    }
  }
}

// Determine which teams may bypass pull request requirements.
function buildBypassAllowances(teams) {
  const bypass = { users: [], teams: [] };
  for (const team of teams) {
    const name = Object.keys(team)[0];
    const permission = Object.values(team)[0];
    if (permission === 'maintain' || permission === 'admin') {
      bypass.teams.push(name);
    }
  }
  if (bypass.teams.length === 0) {
    return {};
  }
  return bypass;
}

// Build branch protection payload for a single branch.
function buildBranchProtectionPayload(branch, teams, checks, approvals, enforceAdmins) {
  const bypass = buildBypassAllowances(teams);
  const branchChecks = Array.isArray(checks[branch]) && checks[branch].length > 0
    ? { strict: true, contexts: checks[branch] }
    : null;
  return {
    required_status_checks: branchChecks,
    enforce_admins: enforceAdmins ? true : null,
    restrictions: null,
    required_pull_request_reviews: {
      required_approving_review_count: approvals,
      dismiss_stale_reviews: true,
      bypass_pull_request_allowances: bypass
    }
  };
}

// Apply team role overrides from the team-roles input.
function applyTeamRoleOverrides(teams, overrides) {
  return teams.map(team => {
    const name = Object.keys(team)[0];
    if (name in overrides) {
      return { [name]: overrides[name] };
    }
    return team;
  });
}

// Extract template repository information from repo metadata.
function getRepoTemplate(info) {
  if (!info || !info.template_repository) {
    return null;
  }
  const template = info.template_repository;
  return {
    owner: template.owner.login,
    repo: template.name,
    clone: template.clone_url
  };
}

// Octokit client factory.
function getOctokitClient() {
  const token = core.getInput('token');
  if (!token) {
    throw new Error('Input "token" is required');
  }
  return github.getOctokit(token);
}

// GitHub API helpers.
async function getTeamNames(octokit, owner, repo) {
  const { data } = await octokit.rest.repos.listTeams({ owner, repo });
  return data.map(team => ({ [team.slug]: team.permission }));
}

async function getRepoInfo(octokit, owner, repo) {
  return octokit.rest.repos.get({ owner, repo });
}

async function getBranches(octokit, owner, repo) {
  const { data } = await octokit.rest.repos.listBranches({ owner, repo, protected: false });
  return data;
}

async function getCommits(octokit, owner, repo) {
  const { data } = await octokit.rest.repos.listCommits({ owner, repo });
  return data;
}

async function setTeamRepoPermissions(octokit, owner, repo, teams) {
  for (const team of teams) {
    const slug = Object.keys(team)[0];
    const permission = Object.values(team)[0];
    core.info(`Setting ${slug} permission to ${permission} on ${owner}/${repo}`);
    await octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
      org: owner,
      team_slug: slug,
      owner,
      repo,
      permission
    });
  }
}

async function setBranchProtection(octokit, owner, repo, branches, teams, checks, approvals, enforceAdmins) {
  for (const branch of branches) {
    const payload = buildBranchProtectionPayload(branch, teams, checks, approvals, enforceAdmins);
    core.info(`Applying branch protection to ${owner}/${repo}:${branch}`);
    core.debug(`Protection payload: ${JSON.stringify(payload, null, 2)}`);
    try {
      await octokit.rest.repos.updateBranchProtection({
        owner,
        repo,
        branch,
        required_status_checks: payload.required_status_checks,
        enforce_admins: payload.enforce_admins,
        restrictions: payload.restrictions,
        required_pull_request_reviews: payload.required_pull_request_reviews
      });
    } catch (err) {
      throw new Error(`Failed to protect branch "${branch}": ${err.message}`);
    }
  }
}

async function setGit(name, email) {
  await execRun(`git config --global user.name "${name}"`);
  await execRun(`git config --global user.email "${email}"`);
}

async function branchExists(branch) {
  try {
    await execRun(`git rev-parse --verify "refs/heads/${branch}"`);
    return true;
  } catch {
    return false;
  }
}

async function setRemote(octokit, template) {
  const branches = await getBranches(octokit, template.owner, template.repo);
  if (branches.length === 0) {
    core.info('No unprotected branches found on template; nothing to mirror.');
    return;
  }

  await setGit('github-classroom[bot]', 'github-classroom[bot]@users.noreply.github.com');
  try {
    await execRun(`git remote add template ${template.clone}`);
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      core.info('Remote "template" already exists; using existing remote.');
    } else {
      throw err;
    }
  }
  await execRun(`git fetch template`);

  for (const branch of branches) {
    const exists = await branchExists(branch.name);
    if (exists) {
      core.warning(`Branch "${branch.name}" already exists locally; skipping template mirror.`);
      continue;
    }
    try {
      core.info(`Mirroring template branch ${branch.name}`);
      await execRun(`git checkout -b ${branch.name} template/${branch.name}`);
      await execRun(`git push origin ${branch.name}`);
      await execRun(`git checkout main`);
    } catch (err) {
      throw new Error(`Failed to mirror template branch "${branch.name}": ${err.message}`);
    }
  }
}

async function execRun(cmd) {
  core.debug(`Running: ${cmd}`);
  const { stdout, stderr } = await execAsync(cmd);
  return { stdout, stderr };
}

async function run() {
  try {
    const octokit = getOctokitClient();

    const repo = github.context.payload.repository.name;
    const owner = github.context.payload.repository.owner.login;

    core.info(`Running Arborist on ${owner}/${repo}`);

    const branches = parseJsonInput('branches', core.getInput('branches'));
    validateBranches(branches);

    const checks = parseJsonInput('required-checks', core.getInput('required-checks'), {});
    validateRequiredChecks(checks);

    const teamRoles = parseJsonInput('team-roles', core.getInput('team-roles'), {});
    validateTeamRoles(teamRoles);

    const approvals = parseInt(core.getInput('min-approvals'), 10);
    if (Number.isNaN(approvals) || approvals < 0) {
      throw new Error('Input "min-approvals" must be a non-negative integer');
    }

    const enforceAdmins = core.getInput('enforce-admins') === 'true';
    const forceProtect = core.getInput('force-protect') === 'true';

    const info = await getRepoInfo(octokit, owner, repo);
    const teams = await getTeamNames(octokit, owner, repo);
    const template = getRepoTemplate(info.data);
    const commits = await getCommits(octokit, owner, repo);

    const lastCommit = commits[0];
    const lastAuthorLogin = lastCommit && lastCommit.author ? lastCommit.author.login : null;

    const effectiveTeams = applyTeamRoleOverrides(teams, teamRoles);

    if (template || forceProtect) {
      await setTeamRepoPermissions(octokit, owner, repo, effectiveTeams);
      await setBranchProtection(octokit, owner, repo, branches, effectiveTeams, checks, approvals, enforceAdmins);
    }

    if (template && lastAuthorLogin === 'github-classroom[bot]') {
      await setRemote(octokit, template);
    }

    if (!template && lastAuthorLogin !== 'github-classroom[bot]' && !forceProtect) {
      core.info('No template repository detected and last commit was not from github-classroom[bot]; no action taken.');
    }
  } catch (err) {
    core.setFailed(err.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  parseJsonInput,
  validateBranches,
  validateRequiredChecks,
  validateTeamRoles,
  buildBypassAllowances,
  buildBranchProtectionPayload,
  applyTeamRoleOverrides,
  getRepoTemplate
};

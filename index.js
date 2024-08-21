const path = require('path');
const util = require('util');
const async = require('async');

const github = require('@actions/github');
const core = require('@actions/core');

const exec = util.promisify(require('child_process').exec);

const octokit = github.getOctokit(
  process.env.GITHUB_TOKEN
);

// Gets

const getContributors = async (owner, repo) => {
  let list = await octokit.rest.repos.listContributors({
    owner: owner,
    repo: repo
  });
  return list;
};

const getTeamNames = async (owner, repo) => {
  let teams = [];

  let list = await octokit.rest.repos.listTeams({
    owner: owner,
    repo: repo
  });

  let data = list.data;

  async.map(data, (value, fn) => {
    fn(null, value);
  }, (err, res) => {
    for(let item in res){
      let name = res[item].slug;
      let permission = res[item].permission;
      teams.push({[name] : permission});
    }
  });

  return teams;
};

const getRepoInfo = async (owner, repo) => {
  let info = octokit.rest.repos.get({
    owner: owner,
    repo: repo
  });
  return info;
};

const getRepoTemplate = async (info) => {
  let templateInfo;
  if (info.template_repository) {
    let template = info.template_repository;
    templateInfo = {
      owner: template.owner.login,
      repo: template.name,
      clone: template.clone_url
    }
  }
  return templateInfo;
};

const getBranches = async(owner, repo) => {
  let info = await octokit.rest.repos.listBranches({
    owner,
    repo,
    protected: false
  });
  return info;
};

const getCommits = async(owner, repo) => {
  let info = await octokit.rest.repos.listCommits({
    owner: owner,
    repo: repo
  });
  return info;
};

// Set

const setBranchProtection = async (owner, repo, teams) => {
  let branches = JSON.parse(core.getInput('branches'));
  let override = core.getInput('enforce-admins');
  let approvals = parseInt(core.getInput('min-approvals'));
  let reqChecks = JSON.parse(core.getInput('required-checks'));
  branches = branches.map((branch) => {
    // Below code restricts branch push to certain teams
    // rather than allowing restriction bypass
    let bypass = {users: [], teams: []};
    for (let team of teams) {
        let name = Object.keys(team)[0];
        if (Object.values(team)[0] = 'maintain') {
            bypass.teams.push(name);
        }
    }
    if(bypass.teams.length === 0) {
        bypass = {};
    }
    let restrictions = null;
    let checks = (branch in reqChecks) ? {"strict": true, contexts: reqChecks[branch]} : null;
    console.log(checks);
    return {
      name: branch,
      checks: checks,
      restrictions: restrictions,
      approvals: approvals,
      bypass: bypass
    }
  });
  for (let branch of branches) {
    try {
        octokit.rest.repos.updateBranchProtection({
          owner: owner,
          repo: repo,
          branch: branch.name,
          required_status_checks: null,
          enforce_admins: override == 'true' ? true : null,
          restrictions: branch.restrictions,
          required_status_checks: branch.checks,
          required_pull_request_reviews: {
            required_approving_review_count: branch.approvals,
            dismiss_stale_reviews: true,
            bypass_pull_request_allowances: branch.bypass
          }
        });
    } catch(err) {
        console.log(`ERROR PROTECTING ${branch}...`);
    }
  }
}

const setTeamRepoPermissions = async (owner, repo, teams) => {
  for(let team of teams){
    octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
      org: owner,
      team_slug: Object.keys(team)[0],
      owner: owner,
      repo: repo,
      permission: Object.values(team)[0]
    });
  }
}

const setGit = async() => {
  await execRun(`git config --global user.name "github-classroom[bot]"`);
  await execRun(`git config --global user.email "github-classroom[bot]@users.noreply.github.com"`);
}

const setRemote = async(template) => {
  let info = await getBranches(template.owner, template.repo);
  let branches = info.data;
  info = await setGit();
  let response = await execRun(`git remote add template ${template.clone}`);
  response = await(execRun(`git fetch template`));
  for (let branch of branches) {
    try {
        response = await execRun(`git checkout -b ${branch.name} template/${branch.name}`)
        response = await execRun(`git push origin ${branch.name}`);
        response = await execRun(`git checkout main`);
    } catch (err)  {
        console.log(`ERROR SETTING REMOTE FOR ${branch}...`);
    }
  }
  response = await execRun(`git branch`);
}

// Runner

const execRun = async(cmd) => {
  let { stdout, stderr } = await exec(`${cmd}`);
  return {
    stdout: stdout,
    strerr: stderr
  }
}

const run = async () => {

  // Constants
  const repo = github.context.payload.repository.name;
  const owner = github.context.payload.repository.owner.login;

  // Properties
  const info = await getRepoInfo(owner, repo);
  const teams = await getTeamNames(owner, repo);

  // Facts
  const template = await getRepoTemplate(info.data);
  const commits = await getCommits(owner, repo);
  const lastAuthor = commits.data[0].author;

  // Check for forced branch protection
  let force = (core.getInput('force-protect') === 'true');

  // Set protections
  // TODO: Fix this redundancy? Needed to set repo permissions and to
  //       update the branch management permissions.

  let overrides = JSON.parse(core.getInput('team-roles'));
  for(let team of teams){
    let name = Object.keys(team)[0];
    let idx = teams.indexOf(team);
    if(name in overrides) {
      teams[idx] = {[name]: overrides[name]}
    }
  }

  if (template || force) setTeamRepoPermissions(owner, repo, teams);
  if (template || force) setBranchProtection(owner, repo, teams);

  // If repo has a template and this is the last bot commit
  if (template && lastAuthor == 'github-classroom[bot]') setRemote(template);

  // If repo is not a template and not an assignment
  if (!template && lastAuthor != 'github-classroom[bot]' && !force) console.log("MAIN TEMPLATE: No action taken.");

};

run();

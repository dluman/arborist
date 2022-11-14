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
  let slugs = [];
  let list = await octokit.rest.repos.listTeams({
    owner: owner,
    repo: repo
  });
  let teams = list.data;
  async.map(teams, (value, fn) => {
    fn(null, value.slug);
  }, (err, res) => {
    for(let item in res){
      slugs.push(res[item]);
    }
  });
  return slugs;
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
  let branches = [{
    name: 'main',
    restrictions: null,
    approvals: 1
  },
  {
    name: 'feedback',
    restrictions: {
      users: [],
      teams: [],
      apps: []
    },
    approvals: 1
  }];
  for (let branch in branches) {
    octokit.rest.repos.updateBranchProtection({
      owner: owner,
      repo: repo,
      branch: branches[branch].name,
      required_status_checks: null,
      enforce_admins: true,
      restrictions: branches[branch].restrictions,
      required_pull_request_reviews: {
        required_approving_review_count: branches[branch].approvals,
        dismiss_stale_reviews: true
      },
    });
  }
}

const setTeamRepoPermissions = async (owner, repo, teams) => {
  for(let team in teams){
    octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
      org: owner,
      team_slug: teams[team],
      owner: owner,
      repo: repo,
      permission: 'push'
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
    response = await execRun(`git checkout -b ${branch.name} template/${branch.name}`)
    response = await execRun(`git push origin ${branch.name}`);
    resopnse = await execRun(`git checkout main`);
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
  const lastAuthor = commits.data[commits.data.length -1].author;

  // Set protections
  if (template) setBranchProtection(owner, repo, teams);
  if (template) setTeamRepoPermissions(owner, repo, teams);

  // If repo has a template and this is the last bot commit
  if (template && lastAuthor == 'github-classroom[bot]') setRemote(template);

  if (!template && lastAuthor != 'github-classroom[bot]') console.log("MAIN TEMPLATE: No action taken.");

};

run();

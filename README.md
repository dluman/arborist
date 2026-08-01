# The Arborist

![Arborist logo](https://raw.githubusercontent.com/term-world/arborist/media/media/CMPSC%20-%20arborist.png)

The automated GitHub branch protector!

## Description

Arborist is a GitHub Action that automates branch protection rules for repositories. It is especially useful for GitHub Classroom assignments, where every student repository should follow the same protection policy.

Features include:

* automatic branch protection on configurable branches
* required pull request review counts
* required status checks per branch
* disallowal of review process bypass (except for maintain/admin teams)
* optional mirror of template repository branches
* team permission management

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `token` | GitHub token with repo administration and branch protection permissions | yes | — |
| `branches` | JSON array of branches to protect | yes | `["main", "feedback"]` |
| `required-checks` | JSON object mapping branch names to arrays of required status check contexts | no | `{}` |
| `min-approvals` | Minimum number of approving reviews required | yes | `1` |
| `team-roles` | JSON object mapping team slugs to repo permission levels | no | `{}` |
| `enforce-admins` | Require status checks to pass before merging even for admins | yes | `false` |
| `force-protect` | Force branch protection regardless of template/assignment status | no | `false` |

### `required-checks` format

```json
{
  "main": ["ci/test", "ci/lint"],
  "feedback": ["ci/test"]
}
```

Branches not listed receive no required status checks.

### `team-roles` format

```json
{
  "staff": "maintain",
  "students": "push"
}
```

Valid permission levels are `pull`, `triage`, `push`, `maintain`, and `admin`.

## Token requirements

Branch protection changes require repository administration permissions.

### Using the built-in `GITHUB_TOKEN`

Grant the following permissions in the calling workflow:

```yaml
permissions:
  administration: write
  contents: write
  pull-requests: write
```

Organization-level team management may require additional permissions.

### Using a Personal Access Token (PAT)

If you need organization-level team management, create a fine-grained PAT or classic PAT with at least:

* `repo` (full control of private repositories)
* `admin:org` (if managing organization teams)

Then pass it as a secret:

```yaml
with:
  token: ${{ secrets.ARBORIST_PAT }}
```

## Example workflow

```yaml
name: Arborist

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  administration: write
  contents: write
  pull-requests: write

jobs:
  protect:
    runs-on: ubuntu-latest
    steps:
      - name: Apply branch protections
        uses: term-world/arborist@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          branches: '["main", "feedback"]'
          min-approvals: 1
          required-checks: '{"main": ["ci/test"]}'
          team-roles: '{"staff": "maintain"}'
          enforce-admins: true
```

## Template branch mirroring

When a repository was created from a template and the most recent commit was made by `github-classroom[bot]`, Arborist will mirror any unprotected branches from the template into the current repository. This is intended to reconstruct branches such as `feedback` that GitHub Classroom sometimes omits.

To disable this behavior, ensure the repository is not treated as a fresh template assignment or set `force-protect: true` to run protection without mirroring.

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build the distribution:

```bash
npm run build
```

The bundled `dist/index.js` must be committed after any source change.

## License

This project is released into the public domain under the [Unlicense](LICENSE).

const {
  parseJsonInput,
  validateBranches,
  validateRequiredChecks,
  validateTeamRoles,
  buildBypassAllowances,
  buildBranchProtectionPayload,
  applyTeamRoleOverrides,
  getRepoTemplate
} = require('../index.js');

describe('parseJsonInput', () => {
  test('parses valid JSON', () => {
    expect(parseJsonInput('branches', '["main", "feedback"]')).toEqual(['main', 'feedback']);
  });

  test('returns fallback when value is empty', () => {
    expect(parseJsonInput('checks', '', {})).toEqual({});
    expect(parseJsonInput('checks', null, {})).toEqual({});
  });

  test('throws on invalid JSON', () => {
    expect(() => parseJsonInput('branches', 'not-json')).toThrow('Input "branches" is not valid JSON');
  });
});

describe('validateBranches', () => {
  test('accepts valid branch array', () => {
    expect(() => validateBranches(['main', 'feedback'])).not.toThrow();
  });

  test('rejects empty array', () => {
    expect(() => validateBranches([])).toThrow('non-empty JSON array');
  });

  test('rejects non-array', () => {
    expect(() => validateBranches('main')).toThrow('non-empty JSON array');
  });

  test('rejects empty branch names', () => {
    expect(() => validateBranches(['main', ''])).toThrow('non-empty string');
  });
});

describe('validateRequiredChecks', () => {
  test('accepts valid mapping', () => {
    expect(() => validateRequiredChecks({ main: ['ci/test'] })).not.toThrow();
  });

  test('rejects non-object', () => {
    expect(() => validateRequiredChecks(['ci/test'])).toThrow('JSON object');
  });

  test('rejects non-array contexts', () => {
    expect(() => validateRequiredChecks({ main: 'ci/test' })).toThrow('must be an array');
  });

  test('rejects empty context strings', () => {
    expect(() => validateRequiredChecks({ main: [''] })).toThrow('non-empty string');
  });
});

describe('validateTeamRoles', () => {
  test('accepts valid roles', () => {
    expect(() => validateTeamRoles({ staff: 'maintain' })).not.toThrow();
  });

  test('rejects non-object', () => {
    expect(() => validateTeamRoles(['maintain'])).toThrow('JSON object');
  });

  test('rejects invalid permissions', () => {
    expect(() => validateTeamRoles({ staff: 'owner' })).toThrow('Invalid permission');
  });
});

describe('buildBypassAllowances', () => {
  test('includes maintain and admin teams', () => {
    const teams = [{ staff: 'maintain' }, { students: 'push' }, { admins: 'admin' }];
    expect(buildBypassAllowances(teams)).toEqual({ users: [], teams: ['staff', 'admins'] });
  });

  test('returns empty object when no maintain/admin teams', () => {
    const teams = [{ students: 'push' }];
    expect(buildBypassAllowances(teams)).toEqual({});
  });
});

describe('buildBranchProtectionPayload', () => {
  test('builds payload with checks and bypass allowances', () => {
    const payload = buildBranchProtectionPayload(
      'main',
      [{ staff: 'maintain' }],
      { main: ['ci/test'] },
      1,
      true
    );
    expect(payload).toEqual({
      required_status_checks: { strict: true, contexts: ['ci/test'] },
      enforce_admins: true,
      restrictions: null,
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        bypass_pull_request_allowances: { users: [], teams: ['staff'] }
      }
    });
  });

  test('builds payload without checks when branch not in mapping', () => {
    const payload = buildBranchProtectionPayload(
      'feedback',
      [{ staff: 'maintain' }],
      { main: ['ci/test'] },
      2,
      false
    );
    expect(payload.required_status_checks).toBeNull();
    expect(payload.enforce_admins).toBeNull();
    expect(payload.required_pull_request_reviews.required_approving_review_count).toBe(2);
  });
});

describe('applyTeamRoleOverrides', () => {
  test('overrides team roles from input mapping', () => {
    const teams = [{ staff: 'push' }, { students: 'push' }];
    const overrides = { staff: 'maintain' };
    expect(applyTeamRoleOverrides(teams, overrides)).toEqual([
      { staff: 'maintain' },
      { students: 'push' }
    ]);
  });

  test('leaves roles unchanged when no overrides match', () => {
    const teams = [{ staff: 'push' }];
    expect(applyTeamRoleOverrides(teams, {})).toEqual([{ staff: 'push' }]);
  });
});

describe('getRepoTemplate', () => {
  test('returns template info when present', () => {
    const info = {
      template_repository: {
        owner: { login: 'term-world' },
        name: 'assignment-template',
        clone_url: 'https://github.com/term-world/assignment-template.git'
      }
    };
    expect(getRepoTemplate(info)).toEqual({
      owner: 'term-world',
      repo: 'assignment-template',
      clone: 'https://github.com/term-world/assignment-template.git'
    });
  });

  test('returns null when no template repository', () => {
    expect(getRepoTemplate({})).toBeNull();
    expect(getRepoTemplate(null)).toBeNull();
  });
});

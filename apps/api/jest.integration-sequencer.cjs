// Jest loads its sequencer synchronously as CommonJS alongside the CJS config.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sequencer = require('@jest/test-sequencer').default;

// Bootstrap tests require an unconfigured organization. Later suites intentionally
// retain committed fixtures for concurrency checks, so timing-based order is unsafe.
module.exports = class IntegrationSequencer extends Sequencer {
  sort(tests) {
    return [...tests].sort((a, b) => {
      const priority = test => test.path.endsWith('organization.database.api.spec.ts') ? 0 : 1;
      return priority(a) - priority(b) || a.path.localeCompare(b.path);
    });
  }
};

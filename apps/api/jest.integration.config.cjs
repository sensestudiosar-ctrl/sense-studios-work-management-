module.exports = {
  testEnvironment: "node",
  testSequencer: "<rootDir>/jest.integration-sequencer.cjs",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.api.spec.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "<rootDir>/tsconfig.json" }]
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" }
};

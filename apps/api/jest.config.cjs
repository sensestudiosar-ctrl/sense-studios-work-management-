const workerSetting = process.env.API_TEST_WORKERS;
if (workerSetting !== undefined && (!/^[1-9]\d*$/.test(workerSetting) || !Number.isSafeInteger(Number(workerSetting)))) {
  throw new Error("API_TEST_WORKERS must be a positive integer.");
}

module.exports = {
  maxWorkers: workerSetting === undefined ? 2 : Number(workerSetting),
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.unit.spec.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "<rootDir>/tsconfig.json" }]
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" }
};

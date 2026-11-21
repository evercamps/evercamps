export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  // Resolves core/ imports that point into includes/ (tsconfig rootDirs).
  resolver: '<rootDir>/jest.resolver.cjs',
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
    "^.+\\.jsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@evershop)/)"
  ],
  testMatch: [
    "**/src/**/tests/**/unit/**/*.test.[jt]s",
    "**/core/modules/email/tests/unit/**/*.test.[jt]s",
    "**/includes/lib/webpack/tests/unit/**/*.test.[jt]s",
    // Need a Postgres from .env; skipped unless RUN_DB_TESTS=1.
    "**/core/modules/*/tests/db/**/*.test.[jt]s"
  ],
  modulePathIgnorePatterns: ["<rootDir>/packages/evercamps/dist/"]
};

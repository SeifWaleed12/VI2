module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.[jt]s"],
  transform: { "^.+\\.[jt]sx?$": ["@swc/jest", { jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } } }] },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Hoisted packages must use the same React as the storefront renderer.
    "^react$": "<rootDir>/node_modules/react",
    "^react/(.*)$": "<rootDir>/node_modules/react/$1",
    "^react-dom$": "<rootDir>/node_modules/react-dom",
    "^react-dom/(.*)$": "<rootDir>/node_modules/react-dom/$1",
  },
};

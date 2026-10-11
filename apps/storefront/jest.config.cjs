module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.[jt]s"],
  transform: { "^.+\\.[jt]sx?$": ["@swc/jest", { jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } } }] },
  moduleNameMapper: { "^react$": "<rootDir>/node_modules/react", "^react/(.*)$": "<rootDir>/node_modules/react/$1", "^react-dom$": "<rootDir>/node_modules/react-dom", "^react-dom/(.*)$": "<rootDir>/node_modules/react-dom/$1", "^@/(.*)$": "<rootDir>/src/$1" },
};

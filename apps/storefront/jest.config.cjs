module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.[jt]s"],
  transform: { "^.+\\.[jt]sx?$": ["@swc/jest", { jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } } }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
};

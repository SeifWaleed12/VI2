module.exports = {
  ...require("./jest.config"),
  testMatch: ["**/integration-tests/**/*.spec.[jt]s", "**/src/modules/**/__tests__/**/*.integration.spec.[jt]s"],
  setupFiles: ["./integration-tests/setup.js"],
};

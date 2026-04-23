export default {
  setupFiles: ["<rootDir>/tests/environment.js"],
  transform: {},
  testEnvironment: "node",
  moduleFileExtensions: ["js", "mjs", "cjs", "jsx", "ts", "tsx", "json", "node"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/e2e/"],
};

module.exports = {
    setupFiles: ["<rootDir>/environment.js"],
    coverageThreshold: {
        global: {
            lines: 70,
            statements: 70,
            branches: 70,
            functions: 70,
        },
    },
};

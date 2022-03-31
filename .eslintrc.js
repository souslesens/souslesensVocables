module.exports = {
    parser: "@typescript-eslint/parser",

    settings: {
        react: {
            version: "detect",
        },
    },
    extends: ["plugin:prettier/recommended", "eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:react/recommended"],

    rules: {
        "no-console": ["error", { allow: ["error", "warn"] }],
    },
    overrides: [
        {
            files: ["scripts/*.js", "routes/*.js", "other/**/*.js", "bin/**/*.js", "api/**/*.js", "**/webpack.config.js", ".eslintrc.js"],
            env: {
                node: true,
            },
            rules: {
                "@typescript-eslint/no-var-requires": "off",
                "no-console": "off",
            },
        },
        {
            files: ["public/vocables/**"],
            rules: {},
            env: { browser: true },
        },
        {
            files: ["mainapp/src/**/*.ts", "mainapp/src/**/*.tsx"],

            extends: [
                "plugin:prettier/recommended",
                "eslint:recommended",
                "plugin:@typescript-eslint/recommended-requiring-type-checking",
                "plugin:@typescript-eslint/recommended",
                "plugin:react/recommended",
            ],
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
                project: "mainapp/tsconfig.json",
                ecmaFeatures: {
                    jsx: true,
                },
            },
            rules: {
                "@typescript-eslint/no-misused-promises": [
                    "error",
                    {
                        checksVoidReturn: {
                            arguments: false,
                            attributes: false,
                        },
                    },
                ],
                "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
                "@typescript-eslint/explicit-function-return-type": "off",
                "@typescript-eslint/no-explicit-any": "off",
                "@typescript-eslint/ban-types": [
                    "error",
                    {
                        extendDefaults: true,
                        types: {
                            "{}": false,
                        },
                    },
                ],
                "react/prop-types": "off",
            },
        },
    ],
};

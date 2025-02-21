import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import jest from 'eslint-plugin-jest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "mainapp/static",
        "mainapp/lib",
        "public/YasGui",
        "public/vocables/js/external",
        "docker-data",
    ],
}, ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:prettier/recommended",
), {
    languageOptions: {
        parser: tsParser,
    },

    settings: {
        react: {
            version: "detect",
        },
    },

    rules: {
        "no-console": ["error", {
            allow: ["error", "warn"],
        }],

        "@typescript-eslint/no-unused-vars": ["error", {
            ignoreRestSiblings: true,
            varsIgnorePattern: "^_",
            argsIgnorePattern: "^_",
        }],
    },
}, {
    files: [
        "**/app.js",
        "scripts/*.js",
        "other/**/*.js",
        "bin/**/*.js",
        "api/**/*.js",
        "**/webpack.config.js",
        "**/.eslintrc.js",
        "model/**/*.js",
        "mainapp/*.js",
    ],

    languageOptions: {
        globals: {
            ...globals.node,
        },
    },

    rules: {
        "@typescript-eslint/no-var-requires": "off",
        "no-console": "off",
    },
}, ...compat.extends("plugin:jest/recommended").map(config => ({
    ...config,
    files: ["tests/**/*.js"],
})), {
    files: ["tests/**/*.js"],

    languageOptions: {
        globals: {
            ...globals.node,
            ...jest.environments.globals.globals,
        },
    },

    rules: {
        "@typescript-eslint/no-var-requires": "off",
    },
}, {
    files: ["public/**/*.js"],

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.jquery,
            Admin: "readable",
            Blender: "readable",
            C2S: "readable",
            Clipboard: "readable",
            stopInterv: "writable",
            Collection: "readable",
            Config: "writable",
            ConfigEditor: "readable",
            CustomPluginController: "readable",
            ElasticSearchProxy: "readable",
            Evaluate: "readable",
            Export: "readable",
            Genealogy: "readable",
            GraphController: "readable",
            GraphFilter: "readable",
            GraphMlExport: "readable",
            GraphTraversal: "readable",
            JsonEditor: "readable",
            KGadvancedMapping: "readable",
            KGassetGraph: "readable",
            KGbrowser: "readable",
            KGbrowserCustom: "readable",
            KGbrowserDataTable: "readable",
            KGbrowserGraph: "readable",
            KGbrowserQuery: "readable",
            KGbuild: "readable",
            KGcommon: "readable",
            KGcreator: "readable",
            KGmappingData: "readable",
            KGmappingGraph: "readable",
            KGmappings: "readable",
            KGpropertyFilter: "readable",
            KGquery: "readable",
            Lineage_whiteboard: "readable",
            Lineage_common: "readable",
            Lineage_decoration: "readable",
            Lineage_properties: "writable",
            Lineage_relations: "readable",
            Lineage_types: "readable",
            MainController: "readable",
            OwlSchema: "readable",
            Schema: "readable",
            SearchUtil: "readable",
            SourceBrowser: "readable",
            SourceEditor: "readable",
            SourceMatcher: "readable",
            Sparql_INDIVIDUALS: "readable",
            Sparql_ISO_15926: "readable",
            Sparql_ISO_15926_part4: "readable",
            Sparql_OWL: "readable",
            Sparql_SKOS: "readable",
            Sparql_common: "readable",
            Sparql_endpoint: "readable",
            Sparql_generic: "readable",
            Sparql_proxy: "readable",
            Sparql_schema: "readable",
            Sparql_WORDNET: "readable",
            SQLquery: "readable",
            Standardizer: "readable",
            Sunburst: "readable",
            SVGexport: "readable",
            TE_14224_browser: "readable",
            TE_AssetConfigurator: "readable",
            TE_AssetDataManager: "readable",
            TE_SqlTojstreeConnectors: "readable",
            TextAnnotator: "readable",
            TreeController: "readable",
            Treemap: "readable",
            YASR: "readable",
            Yasgui: "readable",
            arc: "readable",
            arcTween: "readable",
            async: "readable",
            authentication: "readable",
            blinkVisjsNode: "readable",
            broadcastChannel: "readable",
            buildPaths: "readable",
            call: "readable",
            callback: "readable",
            classUrisBySource: "readable",
            click: "readable",
            common: "readable",
            computeTextRotation: "readable",
            constraintsMap: "writable",
            context: "readable",
            d3: "readable",
            dataTable: "readable",
            defaultNodeShape: "writable",
            dialogLarge: "readable",
            displaySampleData: "readable",
            domain: "readable",
            download: "readable",
            drawRootNode: "writable",
            fill: "readable",
            filter_min_arc_size_text: "readable",
            formatVariableName: "readable",
            h: "readable",
            i: "readable",
            insertTriplesStr: "readable",
            item: "readable",
            jstreeData: "readable",
            key: "readable",
            leftPanelWidth: "readable",
            message: "readable",
            mouseMoveArc: "readable",
            mouseOutArc: "readable",
            mouseOverArc: "readable",
            node: "readable",
            nodeData: "readable",
            nul: "readable",
            partition: "readable",
            payload: "readable",
            prop: "readable",
            propId: "writable",
            query: "readable",
            radius: "readable",
            rangeSource: "readable",
            rightPanelWidth: "readable",
            showOlderGenealogyOnly: "readable",
            socket: "readable",
            source: "writable",
            sourceColors: "writable",
            sourceVariables: "readable",
            sparql_abstract: "readable",
            svg: "readable",
            table: "readable",
            text: "readable",
            toutlesensController: "readable",
            typeObj: "readable",
            updateArc: "readable",
            vis: "readable",
            visJsDataProcessor: "readable",
            visjsGraph: "readable",
            w: "readable",
            yasr: "readable",
        },
    },

    rules: {
        "no-constant-condition": "warn",
        "no-empty-function": "warn",
        "no-unreachable": "warn",
    },
}, ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:prettier/recommended",
).map(config => ({
    ...config,
    files: ["mainapp/src/**/*.ts", "mainapp/src/**/*.tsx"],
})), {
    files: ["mainapp/src/**/*.ts", "mainapp/src/**/*.tsx"],

    languageOptions: {
        ecmaVersion: 2018,
        sourceType: "module",

        parserOptions: {
            tsconfigRootDir: __dirname,
            project: "mainapp/tsconfig.json",

            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    rules: {
        "@typescript-eslint/no-misused-promises": ["error", {
            checksVoidReturn: {
                arguments: false,
                attributes: false,
            },
        }],

        "@typescript-eslint/explicit-function-return-type": "off",

        "@typescript-eslint/no-empty-object-type": "off",

        "react/prop-types": "off",
    },
}];
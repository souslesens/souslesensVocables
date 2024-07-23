const bcrypt = require("bcrypt");
const fs = require("fs");
const merge = require("lodash.merge");

// create data/mapping dir if not exists
fs.mkdirSync("data/mappings", { recursive: true });

// Create configs dir if not exists
fs.mkdirSync("config/users", { recursive: true });

// config/users/users.json
const usersPath = "config/users/users.json";
if (!fs.existsSync(usersPath)) {
    const USERNAME = process.env.USER_USERNAME || "admin";
    const PASSWORD = process.env.USER_PASSWORD || "admin";

    const HASH_PASSWORD = bcrypt.hashSync(PASSWORD, 10);

    const user_json = {
        [USERNAME]: {
            id: USERNAME,
            login: USERNAME,
            password: HASH_PASSWORD,
            groups: ["admin"],
            source: "json",
            _type: "user",
            name: USERNAME,
            allowSourceCreation: true,
            maxNumberCreatedSource: 5,
        },
    };

    fs.writeFileSync("config/users/users.json", JSON.stringify(user_json, null, 2));
}

// config/blenderSources.json
const blenderSourcesPath = "config/blenderSources.json";
const blenderSourcesTemplatePath = "config_templates/blenderSources.json.default";

if (!fs.existsSync(blenderSourcesPath)) {
    fs.readFile(blenderSourcesTemplatePath, (_err, data) => {
        fs.writeFileSync(blenderSourcesPath, JSON.stringify(JSON.parse(data), null, 2));
    });
}

// config/mainConfig.json
const mainConfigPath = "config/mainConfig.json";
const mainConfigTemplatePath = "config_templates/mainConfig.json.default";

// Create a config file if not already exists
if (!fs.existsSync(mainConfigPath)) {
    // Read config template
    fs.readFile(mainConfigTemplatePath, (_err, data) => {
        let mainConfigJson = JSON.parse(data);

        // convert environment into config entries
        const environment = process.env;
        const envList = Object.entries(environment);

        const vocablesEnvList = envList.filter(([env, value]) => {
            if (env.startsWith("VOCABLES__")) {
                return [env, value];
            }
        });

        vocablesEnvList.forEach(([env, value]) => {
            const entryPath = env.replace("VOCABLES__", "");
            const additionalConfig = convertDotPathToNestedObject(entryPath, value);
            mainConfigJson = merge(mainConfigJson, additionalConfig);
        });
        // Write config file
        fs.writeFileSync(mainConfigPath, JSON.stringify(mainConfigJson, null, 2));
    });
}

// config/profiles.json
const profilesPath = "config/profiles.json";
const profilesTemplatePath = "config_templates/profiles.json.default";
if (!fs.existsSync(profilesPath)) {
    fs.readFile(profilesTemplatePath, (_err, data) => {
        fs.writeFileSync(profilesPath, JSON.stringify(JSON.parse(data), null, 2));
    });
}

// config/sources.json
const sourcesPath = "config/sources.json";
const sourcesTemplatePath = "config_templates/sources.json.default";
if (!fs.existsSync(sourcesPath)) {
    fs.readFile(sourcesTemplatePath, (_err, data) => {
        fs.writeFileSync(sourcesPath, JSON.stringify(JSON.parse(data), null, 2));
    });
}

const convertDotPathToNestedObject = (path, value) => {
    const [last, ...paths] = path.split("__").reverse();
    return paths.reduce((acc, el) => ({ [el]: acc }), { [last]: value });
};
const isObject = (item) => {
    return item && typeof item === "object" && !Array.isArray(item);
};
const mergeDeep = (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key])
                    Object.assign(target, {
                        [key]: {},
                    });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, {
                    [key]: source[key],
                });
            }
        }
    }

    return mergeDeep(target, ...sources);
};

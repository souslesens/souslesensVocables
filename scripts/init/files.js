import fs from "fs";

// create data/mapping dir if not exists
const dataMappingsPath = "data/mappings";
if (!fs.existsSync(dataMappingsPath)) {
    fs.mkdirSync(dataMappingsPath, { recursive: true });
    console.log(`✅ ${dataMappingsPath}`);
}

fs.mkdirSync("config", { recursive: true });

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
        console.log(`✅ ${mainConfigPath}`);
    });
}

// config/sources.json
const sourcesPath = "config/sources.json";
const sourcesTemplatePath = "config_templates/sources.json.default";
if (!fs.existsSync(sourcesPath)) {
    fs.readFile(sourcesTemplatePath, (_err, data) => {
        fs.writeFileSync(sourcesPath, JSON.stringify(JSON.parse(data), null, 2));
        console.log(`✅ ${sourcesPath}`);
    });
}

// config/databases.json
const databasesPath = "config/databases.json";
const databasesTemplatePath = "config_templates/databases.json.default";
if (!fs.existsSync(databasesPath)) {
    fs.readFile(databasesTemplatePath, (_err, data) => {
        fs.writeFileSync(databasesPath, JSON.stringify(JSON.parse(data), null, 2));
        console.log(`✅ ${databasesPath}`);
    });
}

// config/plugins.json
const pluginsPath = "config/plugins.json";
const pluginsTemplatePath = "config_templates/plugins.json.default";
if (!fs.existsSync(pluginsPath)) {
    fs.readFile(pluginsTemplatePath, (_err, data) => {
        fs.writeFileSync(pluginsPath, JSON.stringify(JSON.parse(data), null, 2));
        console.log(`✅ ${pluginsPath}`);
    });
}

// config/pluginsConfig.json
const pluginsConfigPath = "config/pluginsConfig.json";
const pluginsConfigTemplatePath = "config_templates/pluginsConfig.json.default";
if (!fs.existsSync(pluginsConfigPath)) {
    fs.readFile(pluginsConfigTemplatePath, (_err, data) => {
        fs.writeFileSync(pluginsConfigPath, JSON.stringify(JSON.parse(data), null, 2));
        console.log(`✅ ${pluginsConfigPath}`);
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

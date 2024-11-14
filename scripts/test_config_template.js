const { checkMainConfig, readMainConfig } = require("../model/config");

const mainConfigTemplatePath = "config_templates/mainConfig.json.default";
console.log(`Checking ${mainConfigTemplatePath}`);

const isValid = checkMainConfig(readMainConfig(mainConfigTemplatePath));

if (!isValid) {
    process.exit(1);
}

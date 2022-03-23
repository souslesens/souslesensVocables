//const bcrypt = require('bcrypt');
const fs = require('fs');
// Create configs dir if not exists
fs.mkdirSync('config/users', options = { "recursive": true })


// config/users/users.json
const usersPath = "config/users/users.json"
if (!fs.existsSync(usersPath)) {
  const USERNAME = process.env.USER_USERNAME || "admin";
  const PASSWORD = process.env.USER_PASSWORD || "admin";

  // const HASH_PASSWORD = bcrypt.hashSync(PASSWORD, 10);

  const user_json = {
    [USERNAME]: {
      "id": USERNAME,
      "login": USERNAME,
      "password": PASSWORD,
      "groups": [
        "admin"
      ],
      "source": "json",
      "_type": "user",
      "name": USERNAME,
    }
  }

  fs.writeFileSync('config/users/users.json', JSON.stringify(user_json, null, 2));
}


// config/blenderSources.json
const blenderSourcesPath = "config/blenderSources.json"
const blenderSourcesTemplatePath = "config_templates/blenderSources.json.default"

if (!fs.existsSync(blenderSourcesPath)) {
  fs.readFile(blenderSourcesTemplatePath, (err, data) => {
    fs.writeFileSync(blenderSourcesPath, JSON.stringify(JSON.parse(data), null, 2))
  })
}


// config/mainConfig.json
const mainConfigPath = "config/mainConfig.json"
const mainConfigTemplatePath = "config_templates/mainConfig.json.default"

// Create a config file if not already exists
if (!fs.existsSync(mainConfigPath)) {
  // Read config template
  fs.readFile(mainConfigTemplatePath, (err, data) => {

    // Get env
    const DEFAULT_SPARQL_URL = process.env.DEFAULT_SPARQL_URL;

    const SQLSERVER_USER = process.env.SQLSERVER_USER;
    const SQLSERVER_PASSWORD = process.env.SQLSERVER_PASSWORD;
    const SQLSERVER_SERVER = process.env.SQLSERVER_SERVER;
    const SQLSERVER_DATABASE = process.env.SQLSERVER_DATABASE;

    const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL;

    const ANNOTATOR_TIKASERVERURL = process.env.ANNOTATOR_TIKASERVERURL;
    const ANNOTATOR_SPACYSERVERURL = process.env.ANNOTATOR_SPACYSERVERURL;
    const ANNOTATOR_PARSEDDUCUMENTSHOMEDIR = process.env.ANNOTATOR_PARSEDDUCUMENTSHOMEDIR;
    const ANNOTATOR_UPLOADDIRPATH = process.env.ANNOTATOR_UPLOADDIRPATH;

    // parse config data
    let mainConfigJson = JSON.parse(data)

    // Update config with env (if env exists)
    DEFAULT_SPARQL_URL ? mainConfigJson.default_sparql_url = DEFAULT_SPARQL_URL : null

    SQLSERVER_USER ? mainConfigJson.SQLserver.user = SQLSERVER_USER : null
    SQLSERVER_PASSWORD ? mainConfigJson.SQLserver.password = SQLSERVER_PASSWORD : null
    SQLSERVER_SERVER ? mainConfigJson.SQLserver.server = SQLSERVER_SERVER : null
    SQLSERVER_DATABASE ? mainConfigJson.SQLserver.database = SQLSERVER_DATABASE : null

    ELASTICSEARCH_URL ? mainConfigJson.ElasticSearch.url = ELASTICSEARCH_URL : null

    ANNOTATOR_TIKASERVERURL ? mainConfigJson.annotator.tikaServerUrl = ANNOTATOR_TIKASERVERURL : null
    ANNOTATOR_SPACYSERVERURL ? mainConfigJson.annotator.spacyServerUrl = ANNOTATOR_SPACYSERVERURL : null
    ANNOTATOR_PARSEDDUCUMENTSHOMEDIR ? mainConfigJson.annotator.parsedDocumentsHomeDir = ANNOTATOR_PARSEDDUCUMENTSHOMEDIR : null
    ANNOTATOR_UPLOADDIRPATH ? mainConfigJson.annotator.uploadDirPath = ANNOTATOR_UPLOADDIRPATH : null

    // Write config file
    fs.writeFileSync(mainConfigPath, JSON.stringify(mainConfigJson, null, 2));
  })
}


// config/profiles.json
const profilesPath = "config/profiles.json"
const profilesTemplatePath = "config_templates/profiles.json.default"
if (!fs.existsSync(profilesPath)) {
  fs.readFile(profilesTemplatePath, (err, data) => {
    fs.writeFileSync(profilesPath, JSON.stringify(JSON.parse(data), null, 2))
  })
}


// config/sources.json
const sourcesPath = "config/sources.json"
const sourcesTemplatePath = "config_templates/sources.json.default"
if (!fs.existsSync(sourcesPath)) {
  fs.readFile(sourcesTemplatePath, (err, data) => {
    fs.writeFileSync(sourcesPath, JSON.stringify(JSON.parse(data), null, 2));
  });
}


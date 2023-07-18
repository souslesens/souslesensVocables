const fs = require("fs");
const YAML = require("yaml");
const yargs = require("yargs");

const argv = yargs
    .alias("dck", "docker_file")
    .describe("dck", "path to docker-compose.yaml")
    .alias("cfg", "config_dir")
    .describe("cfg", "path to config directory")
    .demandOption(["dck", "cfg"])
    .help().argv;

// get data from docker-compose
function get_sparql_url(compose_data) {
    const sparql_port = compose_data["services"]["virtuoso"]["ports"][0].split(":")[0];
    return "http://localhost:" + sparql_port + "/sparql";
}

function get_elastic_url(compose_data) {
    const elastic_port = compose_data["services"]["elasticsearch"]["ports"][0].split(":")[0];
    return "http://localhost:" + elastic_port + "/";
}

// read docker-compose
const compose_filename = argv.docker_file;
const compose_file = fs.readFileSync(compose_filename, "utf8");
const compose_data = YAML.parse(compose_file);

// read config
const config_filename = argv.config_dir + "/mainConfig.json";
const config_file = fs.readFileSync(config_filename);
const config_data = JSON.parse(config_file);

// update config
const sparql_url = get_sparql_url(compose_data);
config_data["default_sparql_url"] = sparql_url;
config_data["sparql_server"]["url"] = sparql_url;
config_data["ElasticSearch"]["url"] = get_elastic_url(compose_data);

// write back config
fs.writeFileSync(config_filename, JSON.stringify(config_data, null, 2));

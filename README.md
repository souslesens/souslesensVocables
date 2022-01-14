# SouslesensVocables

![Lint](https://github.com/souslesens/souslesensVocables/actions/workflows/lint.yaml/badge.svg)
![Check updates](https://github.com/souslesens/souslesensVocables/actions/workflows/check-updates.yaml/badge.svg)
![Docker](https://github.com/souslesens/souslesensVocables/actions/workflows/build-docker-images.yaml/badge.svg)

![sousLeSensVocables large](https://user-images.githubusercontent.com/1880078/130787939-adf887d3-0054-4aa7-9867-0fbcd5bfc7a2.png)

**SousLesensVocables is a set of tools developped to manage Thesaurus and Ontologies resources through SKOS , OWL and RDF standards and graph visualisation approaches.**

It has functionalites to :

- read : visualize, navigate and export
- edit : create , modify, aggregate

both on SKOS or OWL resources

Annotate tool allows annotate textual corpus with several registered lexical resources and identify missing terms

## Prerequisites installation

souslesensVocable needs the following prerequisites:

- Nodejs
- A sparql endpoint with public access
- optional: elasticSearch, Spacy server

### Nodejs

Install nodejs from the nodesource package repository (detailed instruction [here](https://github.com/nodesource/distributions/blob/master/README.md#manual-installation)).

```bash
# Add nodesource repository
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | gpg --dearmor > /usr/share/keyrings/nodesource.gpg
echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_16.x buster main" > /etc/apt/sources.list.d/nodesource.list
echo "deb-src [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_16.x buster main" >> /etc/apt/sources.list.d/nodesource.list
apt update
# Install node
apt install -y nodejs
# Check versions
node --version
npm --version
```

## Local installation

### Install node dependencies

Use `npm ci` to install the node environment along with react app dependancies.

```bash
npm ci && cd mainapp && npm ci && cd ..
```

### Configure

souslesensVocable use `.json` config files located in `config` directory. Templates are available in `config_templates` directory. Use the `scripts/init_config.js` to create the config files from templates.

```bash
node scripts/init_configs.js
```

Then, edit `scripts/*.json` to your needs.

```bash
node scripts/sanitizeDB.js
```

Use this script if something is off when you launch the app.

### Run

Start the app with `npm start`

You may also want to start the app in dev mode with `npm run dev`.

!Caveats! Dev mode use nodemon to restart node when there is a change in file, including files within `config/`.
When you write those files from the Admin interface, nodemon will restart and, for a short moment, you won't have access to the routes allowing you to write those files.

### Test

Run End-to-End testing with `npm run test`

If you want to add tests, you can add files to `cypress/integration/`

```bash
npm start
```

App is available at [localhost:3010/vocables](http://localhost:3010/vocables)

## Deployment

souslesensVocable is deployed with Docker and docker-compose. The following services are included in the docker-compose stack:

- souslesensVocable
- Virtuoso

Copy `docker-compose.yaml` and `env.template` to your production server and create a `.env` file.

### Configuration

Configuration is done through environment variables. They can be overridden in the `.env` file.

```bash
vim .env
```

Here is a list of the environment variable available:

| Variable                           | Description                     | Default               |
| ---------------------------------- | ------------------------------- | --------------------- |
| `TAG`                              | Docker tag of souslesensVocable | latest                |
| `VOCABLES_LISTEN_PORT`             | souslesensVocable port          | 3010                  |
| `VIRTUOSO_LISTEN_PORT`             | Virtuoso port                   | 8890                  |
| `DATA_ROOT_DIR`                    | Persistent data directory       | `/tmp`                |
| `USER_USERNAME`                    | Admin user                      | admin                 |
| `USER_PASSWORD`                    | Admin password                  | admin                 |
| `DEFAULT_SPARQL_URL`               | Url of sparql endpoint          | http://localhost:8890 |
| `SQLSERVER_USER`                   |                                 |                       |
| `SQLSERVER_PASSWORD`               |                                 |                       |
| `SQLSERVER_SERVER`                 |                                 |                       |
| `SQLSERVER_DATABASE`               |                                 |                       |
| `ELASTICSEARCH_URL`                |                                 |                       |
| `ANNOTATOR_TIKASERVERURL`          |                                 |                       |
| `ANNOTATOR_SPACYSERVERURL`         |                                 |                       |
| `ANNOTATOR_PARSEDDUCUMENTSHOMEDIR` |                                 |                       |
| `ANNOTATOR_UPLOADDIRPATH`          |                                 |                       |

### Build

First, build `souslesensvocables` image.

```bash
docker-compose build
```

### Run

```bash
docker-compose up -d
```

The first up will create the config files in `$DATA_ROOT_DIR/vocables/app/config` according to the environment. This files can be edited if a more precise configuration is needed.

### Upgrade

If your set a `TAG` in the `.env` file, change it. Then, pull images and restart the stack.

```bash
docker-compose pull
docker-compose up -d
```

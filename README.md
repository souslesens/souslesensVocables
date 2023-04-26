# SouslesensVocables

[![Prettier](https://github.com/souslesens/souslesensVocables/actions/workflows/prettier.yaml/badge.svg)](https://github.com/souslesens/souslesensVocables/actions/workflows/prettier.yaml)
[![Jest](https://github.com/souslesens/souslesensVocables/actions/workflows/jest.yaml/badge.svg)](https://github.com/souslesens/souslesensVocables/actions/workflows/jest.yaml)
[![Cypress Tests](https://github.com/souslesens/souslesensVocables/actions/workflows/cypress.yaml/badge.svg)](https://github.com/souslesens/souslesensVocables/actions/workflows/cypress.yaml)
[![Docker build and push](https://github.com/souslesens/souslesensVocables/actions/workflows/build-docker-images.yaml/badge.svg)](https://github.com/souslesens/souslesensVocables/actions/workflows/build-docker-images.yaml)

![sousLeSensVocables large](https://user-images.githubusercontent.com/1880078/130787939-adf887d3-0054-4aa7-9867-0fbcd5bfc7a2.png)

**SousLesensVocables is a set of tools developed to manage Thesaurus and Ontologies
resources through SKOS , OWL and RDF standards and graph visualisation approaches.**

It has functionalities to :

-   read : visualize, navigate and export SKOS or OWL resources
-   edit : create , modify, aggregate OWL resources

A key feature of SLSV is graph visualization and interaction performed using excellent
[visjs/vis-network](https://github.com/visjs/vis-network) open source solution

Annotate tool allows annotate textual corpus with several registered lexical resources
and identify missing terms

## Deploy a production instance

### Prerequisites

In production, souslesensVocable is deployed using `docker` and `docker-compose`. Install docker
following [this link](https://docs.docker.com/engine/install/).

Then, install `docker-compose` with your package manager

```bash
sudo apt install docker-compose
```

### Configure the deployment

Clone the souslesensVocables repository

```bash
git clone https://github.com/souslesens/souslesensVocables.git
cd souslesensVocables
```

Checkout the latest [release](https://github.com/souslesens/souslesensVocables/releases)

```bash
git checkout x.x.x  # replace with release number (e.g. 1.15.0)
```

Create a `.env` file from the template

```bash
cp env.template .env
```

Edit the `.env` file:

The `DATA_ROOT_DIR` is defined by default to `/tmp`, change it for data persistance.

| variable                       | description                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `TAG`                          | souslesensVocable release. Same as you checkout at the previous step            |
| `VOCABLES_LISTEN_PORT`         | Port of souslesensVocable that will be exposed outside                          |
| `VIRTUOSO_LISTEN_PORT`         | Port of virtuoso that will be exposed outside                                   |
| `JOWL_LISTEN_PORT`             | Port of [jowl](https://github.com/souslesens/jowl) that will be exposed outside |
| `JOWL_PATH`                    | Path of the [jowl](https://github.com/souslesens/jowl) repository               |
| `DATA_ROOT_DIR`                | Where the data will be written                                                  |
| `USER_PASSWORD`                | Password of the `admin` user automatically created at first start               |
| `SA_PASSWORD`                  | Password of the sql server                                                      |
| `DBA_PASSWORD`                 | Password of the virtuoso server                                                 |
| `FORMAL_ONTOLOGY_SOURCE_LABEL` |                                                                                 |

### Advanced configuration

#### SouslesensVocables

All entries from SouslesensVocables `mainConfig.json` can be overwritten with env variables.
For example `VOCABLES__SQLserver__user=toto` will be converted into `{"SQLserver": {"user": "toto"}}`.

#### Virtuoso

Refer to the [docker-virtuoso](https://github.com/askomics/docker-virtuoso#configuration)
documentation.

#### Elasticsearch

Refer to the
[Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html)
documentation.

#### SQLServer

Refer to the
[SQLServer](https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment?view=sql-server-ver16&pivots=cs1-bash)
documentation.

### Build docker image

We do not provide a docker image for SouslesensVocables. You have to build it yourself:

```bash
docker-compose build vocables
```

### Create the data directories

Elasticsearch and SqlServer needs directories with specific right. Use the following commands
to create directories usable by ElasticSearch and SqlServer.

```bash
bash scripts/init_directories.sh
```

### Launch the docker stack

```bash
docker-compose up -d
```

SouslesensVocables will be available at [localhost:3010](http://localhost:3010).

### Data loading

TODO:

### Upgrading souslesens

First, fetch the latest changes

```bash
git fetch
```

Then, checkout the desired [release](https://github.com/souslesens/souslesensVocables/releases)

```bash
git checkout x.x.x  # replace with release number (e.g. 1.16.0)
```

Change the `TAG` number in the `.env` file

Rebuild the image

```bash
docker-compose build vocables
```

Finally, restart the docker stack

```bash
docker-compose up -d
```

## Install locally (development instance)

### Prerequisites

In development, souslesensVocable needs a Virtuoso instance, an ElasticSearch instance and
a Sql and a Spacy server. We provide a `docker-compose.test.yaml` to deploy this dependencies.

SouslesensVocables is deployed locally using `node` and `npm`.

#### Docker

Install docker following [this link](https://docs.docker.com/engine/install/).

Then, install `docker-compose` with your package manager

```bash
sudo apt install docker-compose
```

#### Node

Install nodejs from the nodesource package repository (detailed instruction
[here](https://github.com/nodesource/distributions/blob/master/README.md#manual-installation)).

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

### Configure

Run the config script to create a default configuration:

```bash
node scripts/init_configs.js
```

Then, edit the `config/*.json` to your needs.

### Start docker dependencies

Start the servers with `docker-compose`

```bash
docker-compose -f docker-compose.dev.yaml up -d
```

Load some data into virtuoso

```bash
bash tests/load_data.sh
```

Create a user account in MariaDB (for database authentication)

```bash
bash scripts/create_user_in_db.sh dev <login> <password>
```

### Install souslesens

souslesensVocable is composed of a backend in node/express and a frontend in pure javascript
and typescript/react.

```bash
# Install the server
npm ci
# Install the front
cd mainapp
npm ci
# Build Webpack files
npm run build
# Go back to root
cd ..
```

### Run souslesens server

The following command will build and watch the react app and run and watch the node app.

```bash
npm run devserver
```

### Run migration scripts

Certain version need migration of data. Run the script for the following version:

#### Release 1.27

```bash
node scripts/sources_access_control_migration_treeview.js -c config -w
```

#### Release 1.30

```bash
node scripts/controller-migration.js -c config -w
```

#### Release 1.33

```bash
node scripts/remove_admin_profile_migration.js -c config -w
```

SouslesensVocables will be available at [localhost:3010](http://localhost:3010).

## Contribute to souslesensVocable

To contribute to souslesensVocable, fork the repo and submit Pull Requests.

### continuous integration

#### Style

We use [Prettier](https://prettier.io/) for Javascript code formatting. Please run
`npm run format` before each commit to format your code.

#### Tests

We provide a `docker-compose.test.yaml` and a `tests/load_data.sh` script to build a testing
environment.

```bash
docker-compose -f docker-compose.test.yaml -d
bash tests/load_data.sh
```

### Release

To create a new release:

```bash
bash release-new.sh
git push
git push --tags
```

GitHub releases and docker images are created on tags with GitHub Actions.

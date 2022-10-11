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
git clone git@github.com:souslesens/souslesensVocables.git
cd souslesensVocables
```

Create a `.env` file from the template

```bash
cp env.template .env
```

Edit the `.env` file:

|variable|description|
|---|---|
|`TAG`|souslesensVocable version. Choose the latest [here](https://github.com/souslesens/souslesensVocables/releases)|
|`VOCABLES_LISTEN_PORT`|Port of souslesensVocable that will be exposed outside|
|`VIRTUOSO_LISTEN_PORT`|Port of virtuoso that will be exposed outside|
|`DATA_ROOT_DIR`|Where the data will be written|
|`USER_PASSWORD`|Password of the `admin` user automaticaly created at firt start|
|`SA_PASSWORD`|Password of the sql server|


### Build docker image

We do not provide a docker image. You have to build it yourself:

```bash
docker-compose build vocables
```

### Create the data dir

Elasticsearch needs a directory with specific right. Use the following commands to create
a directory usable by ElasticSearch.

```bash
source .env
mkdir -p ${DATA_ROOT_DIR}/souslesens/elasticsearch/data
chmod -R  g+rwx ${DATA_ROOT_DIR}/souslesens/elasticsearch
sudo chown -R 0:0 ${DATA_ROOT_DIR}/souslesens/elasticsearch
```

Same for SqlServer

```bash
source .env
mkdir -p ${DATA_ROOT_DIR}/souslesens/sqlserver
chmod -R  g+rwx ${DATA_ROOT_DIR}/souslesens/sqlserver
sudo chown -R 10001:10001 ${DATA_ROOT_DIR}/souslesens/sqlserver
```


### Launch the docker stack

```bash
docker-compose up -d
```

SouslesensVocables will be available at [localhost:3010](http://localhost:3010).


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

### Install

souslesensVocable is composed of a backend in node/express and a frontend in typescript/react.

```bash
# Install the server
npm ci
# Install the front
cd mainapp
npm ci
# Go back to root
cd ..
```

### Configure

Run the config script to create a default configuration:

```bash
node scripts/init_config.js
```

Then, edit the `config/*.json` to your needs.

### Run

The following command will build and watch the react app and run and watch the node app.

```bash
npm run devserver
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
npm run patch|minor|major
git commit
git tag x.x.x
git push --tags
```


# Install a development instance

## Prerequisites

In development, souslesensVocable needs a Virtuoso instance, an ElasticSearch instance and
a Sql and a Spacy server. We provide a `docker-compose.dev.yaml` to deploy this dependencies.

SouslesensVocables is deployed locally using `node` and `npm`.

### Docker

Install docker following [this link](https://docs.docker.com/engine/install/).

### Node

Install nodejs from the nodesource package repository (detailed instruction
[here](https://github.com/nodesource/distributions/blob/master/README.md#manual-installation)).

## Install npm dependencies

```bash
npm ci
```

## Configure

Run the config script to create a default configuration:

```bash
node scripts/init_configs.js
```

## Start docker dependencies

Start the servers with `docker compose`

```bash
docker compose -f docker-compose.dev.yaml up -d
```

Load some data into virtuoso

```bash
bash tests/load_data.sh dev
```

## Run migration scripts

Certain version need migration of data. See `CHANGELOG.md` before upgrading.

To run migration scripts you need to use the command

```bash
npm run migrate
```

At project root

Under Windows need to use git bash to run this script

```bash
cd project-root
npm run migrate
```

## Run souslesens server (dev mode)

The following command will build and watch the react app and run and watch the node app.

```bash
npm run dev:fullstack
```

SouslesensVocables will be available at [localhost:3010](http://localhost:3010).

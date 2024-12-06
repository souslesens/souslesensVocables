# Deploy a production instance

## Prerequisites

In production, SousLeSens is deployed using [docker](https://docs.docker.com)
with the [compose](https://docs.docker.com/compose/install/linux/) plugin.

-   [install docker](https://docs.docker.com/get-started/get-docker/)
-   [install compose plugin](https://docs.docker.com/compose/install/linux/)

## Prepare the souslesensVocables git repository

Clone the git repository

```bash
git clone https://github.com/souslesens/souslesensVocables.git
cd souslesensVocables
```

Checkout the latest [release](https://github.com/souslesens/souslesensVocables/releases)

```bash
git checkout x.x.x  # replace with release number (e.g. 1.95.0)
```

## Prepare the sls-py-api git repository

Clone the git repository

```bash
git clone git@github.com:souslesens/sls-py-api.git
cd sls-py-api
```

Checkout the latest [tag](https://github.com/souslesens/sls-py-api/tags)

```bash
git checkout x.x.x  # replace with release number (e.g. 1.4.0)
```

## Prepare the jowl git repository

Clone the git repository

```bash
git clone https://github.com/souslesens/jowl.git
cd jowl
```

## Configure the deployment

Back to `souslesensVocables` directory, create a `.env` file from the template

```bash
cp env.template .env
```

Edit the `.env` file:

| variable                       | description                                                                              | default               |
| ------------------------------ | ---------------------------------------------------------------------------------------- | --------------------- |
| `DATA_ROOT_DIR`                | Where the data will be written                                                           | `/tmp`                |
| `VOCABLES_TAG`                 | souslesensVocable release. Same as you checkout at the previous step                     | `latest`              |
| `SLSPYAPI_TAG`                 | sls-py-api tag. Same as you checkout at the previous step                                | `latest`              |
| `JOWL_TAG`                     | jowl git branch. Set to `latest` since jowl don't have release or tag yet                | `latest`              |
| `SLSPYAPI_PATH`                | Path of the [sls-py-api](https://github.com/souslesens/sls-py-api) repository            |                       |
| `JOWL_PATH`                    | Path of the [jowl](https://github.com/souslesens/jowl) repository                        |                       |
| `VOCABLES_LISTEN_PORT`         | Port of souslesensVocable that will be exposed outside                                   | `3010`                |
| `VIRTUOSO_LISTEN_PORT`         | Port of virtuoso that will be exposed outside                                            | `8890`                |
| `ELASTICSEARCH_LISTEN_PORT`    | Port of elasticsearch that will be exposed outside                                       | `9200`                |
| `JOWL_LISTEN_PORT`             | Port of [jowl](https://github.com/souslesens/jowl) that will be exposed outside          | `8080`                |
| `SLSPYAPI_LISTEN_PORT`         | Port of [sls-api](https://github.com/souslesens/sls-py-api) that will be exposed outside |                       |
| `POSTGRES_LISTEN_PORT`         | Port of PostgresQL that will be exposed outside                                          | `8890`                |
| `USER_PASSWORD`                | Password of the `admin` user automatically created at first start                        | `admin`               |
| `FORMAL_ONTOLOGY_SOURCE_LABEL` |                                                                                          |                       |
| `SA_PASSWORD`                  | Password of the sql server                                                               | `Sup3rSecretP@ssword` |
| `DBA_PASSWORD`                 | Password of the virtuoso server                                                          | `dba`                 |
| `POSTGRES_PASSWORD`            | Password for the `postgres` admin account of PostgresQL                                  | `mysecretpassword`    |

## Build the container images

Build container images for `souslesensVocables`, `sls-py-api` and `jowl`.

```bash
docker compose build
```

### Create the data directories

Elasticsearch and SqlServer needs directories with specific right. Use the following commands
to create directories usable by ElasticSearch and SqlServer.

```bash
bash scripts/init_directories.sh
```

## Start the stack

```bash
docker compose up -d
```

SouslesensVocables will be available at port `:3101`

## Upgrade SousLeSens to a new version

First, read The [CHANGELOG.md](https://github.com/souslesens/souslesensVocables/releases) to know
what changes will you install.

Fetch the latest changes

```bash
git fetch
```

Then, checkout the desired [release](https://github.com/souslesens/souslesensVocables/releases)

```bash
git checkout x.x.x  # replace with release number (e.g. 1.95.0)
```

Change the `VOCABLES_TAG` number in the `.env` file

Rebuild the image

```bash
docker compose build vocables
```

Finally, restart the docker stack

```bash
docker compose up -d
```

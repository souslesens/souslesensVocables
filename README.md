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

## Documentation

Please visit [Technical Design Documents](http://souslesens.org/index.php/documentation) for details on the technical details of souslesensVocable.

Please watch the videos at [videos sections](http://souslesens.org/index.php/videos/) for getting started with souslesensVocable.

[SLSV Glossary](http://souslesens.org/index.php/slsv-glossary/) provides definitions of several terms used in souslesensVocable.

## Deploy a production instance

### Prerequisites

In production, souslesensVocable is deployed using `docker` with `docker-compose-plugin`. Install docker
following [this link](https://docs.docker.com/engine/install/).

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

| variable                       | description                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `TAG`                          | souslesensVocable release. Same as you checkout at the previous step                     |
| `VOCABLES_LISTEN_PORT`         | Port of souslesensVocable that will be exposed outside                                   |
| `VIRTUOSO_LISTEN_PORT`         | Port of virtuoso that will be exposed outside                                            |
| `JOWL_LISTEN_PORT`             | Port of [jowl](https://github.com/souslesens/jowl) that will be exposed outside          |
| `JOWL_PATH`                    | Path of the [jowl](https://github.com/souslesens/jowl) repository                        |
| `SLS_API_LISTEN_PORT`          | Port of [sls-api](https://github.com/souslesens/sls-py-api) that will be exposed outside |
| `SLS_API_PATH`                 | Path of the [sls-api](https://github.com/souslesens/sls-py-api) repository               |
| `DATA_ROOT_DIR`                | Where the data will be written                                                           |
| `USER_PASSWORD`                | Password of the `admin` user automatically created at first start                        |
| `SA_PASSWORD`                  | Password of the sql server                                                               |
| `DBA_PASSWORD`                 | Password of the virtuoso server                                                          |
| `FORMAL_ONTOLOGY_SOURCE_LABEL` |                                                                                          |

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
docker compose build vocables
```

### Create the data directories

Elasticsearch and SqlServer needs directories with specific right. Use the following commands
to create directories usable by ElasticSearch and SqlServer.

```bash
bash scripts/init_directories.sh
```

### Launch the docker stack

```bash
docker compose up -d
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
docker compose build vocables
```

Finally, restart the docker stack

```bash
docker compose up -d
```

## Install locally (development instance)

### Prerequisites

In development, souslesensVocable needs a Virtuoso instance, an ElasticSearch instance and
a Sql and a Spacy server. We provide a `docker-compose.dev.yaml` to deploy this dependencies.

SouslesensVocables is deployed locally using `node` and `npm`.

#### Docker

Install docker following [this link](https://docs.docker.com/engine/install/).

#### Node

Install nodejs from the nodesource package repository (detailed instruction
[here](https://github.com/nodesource/distributions/blob/master/README.md#manual-installation)).

### Install npm dependencies

```bash
npm ci
```

### Configure

Run the config script to create a default configuration:

```bash
node scripts/init_configs.js
```

### Start docker dependencies

Start the servers with `docker compose`

```bash
docker compose -f docker-compose.dev.yaml up -d
```

Load some data into virtuoso

```bash
bash tests/load_data.sh dev
```

Optionnaly create a user account in MariaDB (for database authentication)

```bash
bash scripts/create_user_in_db.sh dev <login> <password>
```

### Run migration scripts

Certain version need migration of data. See `CHANGELOG.md` before upgrading.

To run migration scripts you need to use the command

```bash
npm run migrate
```

At project root

Under Windows need to use git bash to run this script

```git bash
cd project-root
npm run migrate
```

### Run souslesens server (dev mode)

The following command will build and watch the react app and run and watch the node app.

```bash
npm run dev:fullstack
```

SouslesensVocables will be available at [localhost:3010](http://localhost:3010).

## Contribute to souslesensVocable

To contribute to souslesensVocable, fork the repo and submit Pull Requests.

### continuous integration

#### Style

We use [Prettier](https://prettier.io/) for Javascript code formatting. Please run
`npm run prettier:write` before each commit to format your code.

#### Tests

We provide a `docker-compose.test.yaml` and a `tests/load_data.sh` script to build a testing
environment.

```bash
docker compose -f docker-compose.test.yaml -d
bash tests/load_data.sh
```

### Release

To create a new release:

```bash
npm run release:minor  # or patch or major
```

Then, edit the generated `CHANGELOG.md` if necessary and tag the release with

```bash
npm run release:tag
```

And push commits and tag to GitHub

```bash
git push --tags
```

GitHub releases and docker images are created on tags with GitHub Actions.

### Plugins system

#### Create a plugin

In root create a plugins folder

`mkdir plugins`

Each directory is named after the plugin we want to add.

```
plugins
└── MyPluginName
    └── public
        └── js
            └── main.js
        └──html

```

The plugin's directory must contain a public directory with the source code within it.

main.js must export a single IIFE function or class instance.

```
class MyPlugin {
    onLoaded(){
        alert(`Welcome ${this.user}`)
    }

    setConfig(config) {
        this.user = config.user
    }
};
export default new MyPlugin();
```

Once it done, don't forget to add the plugin's name to `mainConfig.tools_available`.
If you still don't see the plugin in the jsTree, check that your user's profile allows to see this plugin.
The function onLoaded is loaded when you select the tool.

#### Plugin repositories

Plugins can be stored in an external Git repository and used by SLS, to allow versionning and simpler management.

The remote repository must contains, at least, one plugin in a dedicated directory:

```
external-plugins
└── .git
└── MyPluginName
    └── public
        └── js
            └── main.js
        └──html
```

To use external repositories, the best way is to add this repository from the ConfigEditor tool, in the “Plugins” section. The `admin` profile is mandatory to use this tool.

After the registration of the repository in SLS, this one can be edited to select which plugins must be activated by the instance.

The external repositories will be stored in the `plugins.available` directory.

#### Plugin configuration

If a plugin requires configuration, it can be added to the `config/pluginsConfig.json` file:

```
{
    "MyPlugin": {
        "user": "John Doe"
    }
}
```

This configuration will be provided to the plugin by calling the `setConfig` method.

Its possible to edit this configuration from the “Plugins” section in the ConfigEditor. The `admin` profile is mandatory to use this tool.

#### Plugin communication with other tools

Other tools can communicate with plugins. To configure a communication from a tool to a plugin,
use a `getToolRelations` function that must return an object like:

```javascript
self.getToolRelations = function () {
    return { KGquery: "queryToTagsCalendar" };
};
```

This mean that the `KGquery` tool will be able to communicate with the plugin using the
`queryToTagsCalendar` function (defined in souslesens).

#### Use SousLesens modules on plugin

SousLesens modules can be imported form plugins using `import`. For example:

```js
import common from "/vocables/modules/shared/common.js;
```

The following Github Repository contains all the plugins of SLS and give more informations about them :
https://github.com/souslesens/slsv-plugins/

### Authentication

The authentication system used by SLS can be set in the `mainConfig.json` file, by editing the `auth` option.

This option can used these values:

| Name     | Description                                                |
|----------|------------------------------------------------------------|
| auth0    | Provide the users from an application on auth0.com         |
| disabled | Disable the authentication and use the instance as `admin` |
| keycloak | Provide the users from a keycloak instance                 |
| local    | Provide the users from the `config/users/users.json` file  |

The `auth0` and `keycloak` options use the [passport](https://www.passportjs.org) JavaScript module. The users will be registered in the `users/users.json` file in the configuration directory.

#### auth0

This provider can be configured with the `auth0` section in the `mainConfig.json` file:

| Option       | Type   | Description                                                                                    |
|--------------|:------:|------------------------------------------------------------------------------------------------|
| domain       | string | Define the application domain URI                                                              |
| clientID     | string | The identifier of the application                                                              |
| clientSecret | string | The secret used to identify the application                                                    |
| scope        | string | The scope of the application, by default `openid email profile`                                |
| api          | object | This section contains a `clientID` and `clientSecret` which can be used to fetch the auth0 API |

The auth0 implementation in SLS will associate the `Roles` from the auth0 application with the `Profile` in the SLS configuration.

When an user logged in SLS, a request is sent to the auth0 API. This behavior needs the existance of a `Machine to Machine` application on auth0. If this application is not the main one, the associated `clientID` and `clientSecret` can be set with the `api` section in the `auth0` configuration.

#### keycloak

This provider can be configured with the `keycloak` section in the `mainConfig.json` file:

| Option        | Type    | Description                                                    |
|---------------|:-------:|----------------------------------------------------------------|
| authServerURL | string  | The URL of the KeyCloak server                                 |
| clientID      | string  | The identifier of the application                              |
| clientSecret  | string  | The secret used to identify the application                    |
| publicClient  | boolean | True if the KeyCloak instance `Access Type` is set to `public` |
| realm         | string  | The identifier of the KeyCloak instance realm                  |

#### local

This provider used the content of the `config/users/users.json` file to manage users.

An example of this file can be found in `config_templates/users/users.json.default`.

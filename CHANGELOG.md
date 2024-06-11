# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.73.0](https://github.com/souslesens/souslesensVocables/compare/1.72.1...1.73.0) (2024-06-05)


### Features

* **configEditor:** Do not allow to publish source in PRIVATE group ([2a69032](https://github.com/souslesens/souslesensVocables/commit/2a69032223546d0a21dda5aae671a1f82a5bd4b7))
* **ConfigEditor:** store database events in the main log ([c900052](https://github.com/souslesens/souslesensVocables/commit/c9000525bcf3de9a21b3bb9d47106d2d66c4821e))
* **ConfigEditor:** store profile events in the main log ([b2195d2](https://github.com/souslesens/souslesensVocables/commit/b2195d2de2475e5947409c97e9954de950446cee))
* **ConfigEditor:** store source events in the main log ([db113d5](https://github.com/souslesens/souslesensVocables/commit/db113d505621496ee0847f80783135cef2284533))
* **ConfigEditor:** store user events in the main log ([f7f179e](https://github.com/souslesens/souslesensVocables/commit/f7f179e4ffd5523ac2451c1b30d3740e599c6255))
* **GraphManagement:** write log events during upload and download process ([e7bab68](https://github.com/souslesens/souslesensVocables/commit/e7bab68ae2e7077a3db1ae0b8516c314b0bb357e))
* **logs:** add action to logs ([73fa031](https://github.com/souslesens/souslesensVocables/commit/73fa0312a66d27aa680bfa41e5480d3f83bafd06))
* **logs:** log tools with his source (if available) ([3025b71](https://github.com/souslesens/souslesensVocables/commit/3025b7108a556836d6709d2218b242d635d91586))
* **mainapp:** add a function to write event in the vocables.log ([b58ad96](https://github.com/souslesens/souslesensVocables/commit/b58ad96a151b9df8e11d13b5ed56fd551bb5f566))
* **migrations:** add a field to vocables log (action) ([0204031](https://github.com/souslesens/souslesensVocables/commit/02040310edc45b1a177f3a59d9937ce10a7cbdc8))
* **responsive:** remove useless logs ([7796e01](https://github.com/souslesens/souslesensVocables/commit/7796e015c27371b16b1e62a3c51e56570863eb78))

### [1.72.1](https://github.com/souslesens/souslesensVocables/compare/1.72.0...1.72.1) (2024-05-22)

## [1.72.0](https://github.com/souslesens/souslesensVocables/compare/1.71.0...1.72.0) (2024-05-21)


### Features

* **api:** add a route to retrieve the log from a period ([8db082c](https://github.com/souslesens/souslesensVocables/commit/8db082c6d1fb739c5a4acbbcfa0b547d69fe7843))
* **api:** logs: add a query parameter to get a log file ([cb2e590](https://github.com/souslesens/souslesensVocables/commit/cb2e5905e83ad4c82806e1094d1041f3afc9e1be))
* **ConfigEditor:** add the possibility to visualize logs period ([443bd57](https://github.com/souslesens/souslesensVocables/commit/443bd5753970654168e40ccafaf55fcbe7063976))
* **logger:** only keep 12 log files with winston ([6c92247](https://github.com/souslesens/souslesensVocables/commit/6c922470fba903c5a869e26b70ea8b7d0d661134))
* **logging:** rotate logs every month ([8e63158](https://github.com/souslesens/souslesensVocables/commit/8e631587247eec6a4ec7ac91050c056a851664e3))
* **migrations:** migrate log files ([9125f5d](https://github.com/souslesens/souslesensVocables/commit/9125f5d837af068114a46d7a8833189ee8bb3a83))

## [1.71.0](https://github.com/souslesens/souslesensVocables/compare/1.70.2...1.71.0) (2024-05-16)


### Features

* allow to configure tools served as plugins ([534e902](https://github.com/souslesens/souslesensVocables/commit/534e9024abb892deeb2e182c387923cea88202cd))
* **configEditor:** display graph size ([1b9bca0](https://github.com/souslesens/souslesensVocables/commit/1b9bca0aabb95c9069372d08dac0f40530c6c86a))
* **graphManagement:** display graph size ([a67628c](https://github.com/souslesens/souslesensVocables/commit/a67628c15ff87be3f5a6a3cd060e6dda4c65d00b))
* **graphManagement:** restore sorting table + add graph size sorting ([3c0bbba](https://github.com/souslesens/souslesensVocables/commit/3c0bbbaa0137c8e03a9a7ea3f7377407b34a11a0))
* **migrations:** create a empty pluginsConfig file if not exists ([f15323c](https://github.com/souslesens/souslesensVocables/commit/f15323cac400859b3a4fe8d1f442fd93a135339c))


### Bug Fixes

* **ConfigEditor:** add the missing identifier header in DatabasesTable ([b9300b5](https://github.com/souslesens/souslesensVocables/commit/b9300b53e723fbffd8bcb27f982948a0ddaf9f92))
* **ConfigEditor:** do not crash when select the Source tab again ([3200368](https://github.com/souslesens/souslesensVocables/commit/3200368ef44eb8964960703c1e25c6fc317b3045))
* **graphManagement:** restore searchbar ([0bb78d9](https://github.com/souslesens/souslesensVocables/commit/0bb78d95b335dedc34eca40e303cfd62247ca6c6))

### [1.70.2](https://github.com/souslesens/souslesensVocables/compare/1.70.1...1.70.2) (2024-05-02)


### Bug Fixes

* **api/health:** remove sqlserver from health check (externaly managed now) ([74dc868](https://github.com/souslesens/souslesensVocables/commit/74dc8681813a06b59472362d41b843dba79c9952))

### [1.70.1](https://github.com/souslesens/souslesensVocables/compare/1.70.0...1.70.1) (2024-05-02)


### Bug Fixes

* **graphManagement:** typo in infobox ([178e95c](https://github.com/souslesens/souslesensVocables/commit/178e95cfcaebbbc5feadf331317536a329641b1d))

## [1.70.0](https://github.com/souslesens/souslesensVocables/compare/1.69.0...1.70.0) (2024-04-30)


### Features

* **GraphManagement:** catch unexpected errors during upload/download ([cb5b8fd](https://github.com/souslesens/souslesensVocables/commit/cb5b8fd603891190c452c4138d032126c7fb66a1)), closes [#701](https://github.com/souslesens/souslesensVocables/issues/701)
* **graphManagement:** display message to warn user that upload/download can be long ([7743566](https://github.com/souslesens/souslesensVocables/commit/774356655e5bc24ab23a1b92a6537509ae2e389a))
* **GraphManagement:** don't allow closing upload/download dialog while processing ([a807c8a](https://github.com/souslesens/souslesensVocables/commit/a807c8a0ca53c71c5b3af93d07cf8fb2967d304d)), closes [#699](https://github.com/souslesens/souslesensVocables/issues/699)
* **GraphManagement:** set upload to 95% during last post ([9258bb9](https://github.com/souslesens/souslesensVocables/commit/9258bb9383b6cea00fa9ac000d0871c910ed5d71))
* **GraphManagement:** stop progressing to 100% inconditionally on download ([f6403fd](https://github.com/souslesens/souslesensVocables/commit/f6403fda08d24d7d36956f666fb10c54a3749135)), closes [#700](https://github.com/souslesens/souslesensVocables/issues/700)

## [1.69.0](https://github.com/souslesens/souslesensVocables/compare/1.68.1...1.69.0) (2024-04-30)

### [1.68.1](https://github.com/souslesens/souslesensVocables/compare/1.68.0...1.68.1) (2024-04-29)

## [1.68.0](https://github.com/souslesens/souslesensVocables/compare/1.67.0...1.68.0) (2024-04-29)

## [1.67.0](https://github.com/souslesens/souslesensVocables/compare/1.66.1...1.67.0) (2024-04-26)

### [1.66.1](https://github.com/souslesens/souslesensVocables/compare/1.66.0...1.66.1) (2024-04-25)

## [1.66.0](https://github.com/souslesens/souslesensVocables/compare/1.65.0...1.66.0) (2024-04-25)

## [1.65.0](https://github.com/souslesens/souslesensVocables/compare/1.64.0...1.65.0) (2024-04-24)

### Features

-   **ConfigEditor:** add missing sort column in database, profiles and users tables ([e60ee4b](https://github.com/souslesens/souslesensVocables/commit/e60ee4beddcc360d207eafd6703f425cf98554d9))
-   **configEditor:** set owner and published in source form ([ef1d820](https://github.com/souslesens/souslesensVocables/commit/ef1d820dca511cf46e041153f995461beeee2887))
-   **ConfigEditor:** show the database identifier in the table ([024165c](https://github.com/souslesens/souslesensVocables/commit/024165ca9d09b93fdb2d38766be71ffbbbb42588))
-   **mainapp:** migrate the GraphManagement component to MaterialUI ([6c59daa](https://github.com/souslesens/souslesensVocables/commit/6c59daa93e933141a1cb5dbbcf18326c541e3c6f))
-   **mainapp:** migrate the kg-upload-app component to MaterialUI ([50b0127](https://github.com/souslesens/souslesensVocables/commit/50b0127306c4f022dd0772170c02bac634c9cc07))
-   **mainapp:** migrate the UserManagement component to MaterialUI ([32c2ec0](https://github.com/souslesens/souslesensVocables/commit/32c2ec07fde91c1222919a801f413bab85082c0c))

### Bug Fixes

-   **configEditor:** fix group form ([f18840a](https://github.com/souslesens/souslesensVocables/commit/f18840aed68a6d5ffde744fe86673e88952017ae))
-   **model/users:** getUserAccounts: don't return tokens ([c886f72](https://github.com/souslesens/souslesensVocables/commit/c886f72a48c244f93ba938b18577b802611190b6))
-   remove a console.log ([33a6a29](https://github.com/souslesens/souslesensVocables/commit/33a6a29e38f41e214f1e17748f12eeb520f97047))
-   set owner=me and published=false if user is not admin ([c83f0cc](https://github.com/souslesens/souslesensVocables/commit/c83f0cc8a39de1b43900e12bd966decde2cfe784))

## [1.64.0](https://github.com/souslesens/souslesensVocables/compare/1.63.1...1.64.0) (2024-04-18)

### [1.63.1](https://github.com/souslesens/souslesensVocables/compare/1.63.0...1.63.1) (2024-04-17)

### Bug Fixes

-   add missing databases.json.default to config_templates ([bab4c66](https://github.com/souslesens/souslesensVocables/commit/bab4c66f61eecfa2c30811fc96e07bb9f6670d27))
-   **ConfigEditor:** fix default theme being selected instead of current theme in profile form ([a95c939](https://github.com/souslesens/souslesensVocables/commit/a95c9392bbea108b06d100109bfaf744fe55f0ff))
-   **migration:** use fast-glob instead of glob ([10b25d6](https://github.com/souslesens/souslesensVocables/commit/10b25d643f0ac2765107c83033dbb63a41fe5e4a))

## [1.63.0](https://github.com/souslesens/souslesensVocables/compare/1.62.1...1.63.0) (2024-04-16)

### Features

-   add the api routes and models for databases configuration ([acc24aa](https://github.com/souslesens/souslesensVocables/commit/acc24aa41db27ac70cc7acd32859ca81a6f1b3e9))
-   add the databases.json file to the config module ([412ade9](https://github.com/souslesens/souslesensVocables/commit/412ade9eec52c856fbce013f8eb2289cda3a4fd1))
-   **api:** add user databases route ([aee6943](https://github.com/souslesens/souslesensVocables/commit/aee694366089a268b337a9d6f99f9d28e62c012c))
-   **api:** implements database management with kgcreator ([6d1965d](https://github.com/souslesens/souslesensVocables/commit/6d1965d08dea6623d51fe57a8d94743d8c3309d7))
-   **api:** move database api to admin section and resrict usage to admin ([4a483a5](https://github.com/souslesens/souslesensVocables/commit/4a483a5d80d13324807cdca2e31c769d2b17131a))
-   **configEditor:** cleanup the sourcesTable component and show the source group ([e0d4104](https://github.com/souslesens/souslesensVocables/commit/e0d41047f3bef25ade894a0fbef4acb3ef7a1790))
-   **configEditor:** use the same interface for all the tabs ([2eba224](https://github.com/souslesens/souslesensVocables/commit/2eba2248a8457aaae709a5ef174fe6ed255cf5ad))
-   **database:** allow to try database connection from the configEditor ([06a9e5c](https://github.com/souslesens/souslesensVocables/commit/06a9e5cc1dc607c01a94fb6c756a53381ce79f40))
-   implements add and update database actions ([09ad09d](https://github.com/souslesens/souslesensVocables/commit/09ad09d4269f7785f7e39d66fc2476de9a86c314))
-   implements the databases tab in the configEditor ([09660e1](https://github.com/souslesens/souslesensVocables/commit/09660e1cf2c143e10e9bf238e538c924cf2a7814))
-   **kgcreator:** implement the new database system ([b2310bc](https://github.com/souslesens/souslesensVocables/commit/b2310bcb651cd529818352be6555f14a2aa1ac23))
-   **kg:** implements database management for KGBuilder ([cd2f329](https://github.com/souslesens/souslesensVocables/commit/cd2f3299d2bf7005f61a44134edc73561415f3a8))
-   **KG:** start to works on knex integration for the KGCreator tool ([196a0a5](https://github.com/souslesens/souslesensVocables/commit/196a0a50de551205041e84ada31cb916405fb2a4))
-   **mainapp:** add the PasswordField component to the configEditor ([c2fc82a](https://github.com/souslesens/souslesensVocables/commit/c2fc82a8e30d8d4a062f2b7cc50d885638140c24))
-   **migration:** migrate all config files ([e55eae8](https://github.com/souslesens/souslesensVocables/commit/e55eae895b24316a612ad5488bd1b77331e44b3f))
-   **migrations:** migrate databases ([038f780](https://github.com/souslesens/souslesensVocables/commit/038f78086682db41423e6449d6cb85525ba8395b))
-   **migrations:** migrate mappings files ([742f05d](https://github.com/souslesens/souslesensVocables/commit/742f05de42ae9f68a8d2192fb9bc419cf6031ec8))
-   **migrations:** migrate SQLServer from mainConfig.json to databases.json ([e291c95](https://github.com/souslesens/souslesensVocables/commit/e291c956e0300845a52e2dac595b5a12298a7b98))
-   **model/databases:** add query method and use it in api/v1/admin/databases/test ([fd93769](https://github.com/souslesens/souslesensVocables/commit/fd93769cf32cfc36d30ce016333c58c58d5ec8f9))
-   **model:** add an API route to retrieve a specific database ([63628f8](https://github.com/souslesens/souslesensVocables/commit/63628f882ce31ca7a3c0e0192e7090bd61705671))

### Bug Fixes

-   **api:** remove the useless \_type attribute from Database schema ([f44cfcf](https://github.com/souslesens/souslesensVocables/commit/f44cfcff245db936658793f28bf9e6b52105093c))
-   **UserManagement:** import after timeout ([00b0261](https://github.com/souslesens/souslesensVocables/commit/00b02610b59859247dd87c65f321c5ea5b4e5d4e))

### [1.62.1](https://github.com/souslesens/souslesensVocables/compare/1.60.1...1.62.1) (2024-04-03)

## Fixed

-   **user/model**: fix idAdmin method

## [1.62.0](https://github.com/souslesens/souslesensVocables/compare/1.61.0...1.62.0) (2024-04-03)

### Bug Fixes

-   **CHANGELOG:** fix duplicated release ([63cf72f](https://github.com/souslesens/souslesensVocables/commit/63cf72f78c2095fb5bd5a933ecd7692e4bfcfc1c))

## [1.61.0](https://github.com/souslesens/souslesensVocables/compare/1.60.0...1.61.0) (2024-03-29)

### Features

-   **ConfigEditor:** autocomplete group in the edit source form ([dc610d7](https://github.com/souslesens/souslesensVocables/commit/dc610d7d813c0782a420c4d0ac031225b05a8a55))
-   **configEditor:** sort sources by graphURI and Groups ([7e01253](https://github.com/souslesens/souslesensVocables/commit/7e012539972a0692e74f9474ee7dadaecb22e055))
-   **configEditor:** source is readOnly by default ([af79e14](https://github.com/souslesens/souslesensVocables/commit/af79e14ea4231bc426d1b485b5d0a116cc645612))
-   **graphManagement:** filter sources ([4cd1d51](https://github.com/souslesens/souslesensVocables/commit/4cd1d51c816f56485711b8c653587a238376b6da))
-   **graphManagement:** use mui table with sorting ([1027a84](https://github.com/souslesens/souslesensVocables/commit/1027a84959cc8f8e68e21fbd6179f380f406e85f))

### Bug Fixes

-   remove console.log ([54aee8e](https://github.com/souslesens/souslesensVocables/commit/54aee8e14bf7543da801a6ae488963aa9bf6cb64))

## Fixed

-   **user/model**: fix idAdmin method

## [1.60.0](https://github.com/souslesens/souslesensVocables/compare/1.59.0...1.60.0)

## [1.59.0](https://github.com/souslesens/souslesensVocables/compare/1.58.0...1.59.0)

## [1.58.1](https://github.com/souslesens/souslesensVocables/compare/1.57.0...1.58.1)

### Fixed

-   Rename KgqueryQueryTab.html to KGqueryQueryTab.html

## [1.58.0](https://github.com/souslesens/souslesensVocables/compare/1.57.0...1.58.0)

## [1.57.2](https://github.com/souslesens/souslesensVocables/compare/1.56.0...1.57.2)

### Fixed

-   /api/v1/databases is restrictLoggedUser

## [1.57.1](https://github.com/souslesens/souslesensVocables/compare/1.56.0...1.57.1)

### Fixed

-   /api/v1/users/theme return defaultTheme if no theme is found

## [1.57.0](https://github.com/souslesens/souslesensVocables/compare/1.56.0...1.57.0)

> [!IMPORTANT]
> Updating to 1.57 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```

## [1.56.0](https://github.com/souslesens/souslesensVocables/compare/1.55.0...1.56.0)

> [!IMPORTANT]
> Updating to 1.56 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```

### Changed

-   Theme: Theme is set on user's profile

## [1.55.1](https://github.com/souslesens/souslesensVocables/compare/1.54.0...1.55.1)

### Fixed

-   GraphManagement -> Graphmanagement and TimeLine -> Timeline

## [1.55.0](https://github.com/souslesens/souslesensVocables/compare/1.54.0...1.55.0)

## [1.54.0](https://github.com/souslesens/souslesensVocables/compare/1.53.0...1.54.0)

### Changed

-   Configure default theme in `mainConfig.json`
-   Show/Hide theme selector in `mainConfig.json`

> [!IMPORTANT]
> Updating to Unrelease require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```

## [1.53.0](https://github.com/souslesens/souslesensVocables/compare/1.52.0...1.53.0)

## [1.52.0](https://github.com/souslesens/souslesensVocables/compare/1.51.0...1.52.0)

## [1.51.0](https://github.com/souslesens/souslesensVocables/compare/1.50.0...1.51.0)

> [!IMPORTANT]
> Updating to Unrelease require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```

### Added

-   npm run migrate command to play migrations
-   Add allowSourceCreation and maxNumberCreatedSource to users.json entries
-   Add owner and published to sources.json entries

## [1.50.0](https://github.com/souslesens/souslesensVocables/compare/1.49.0...1.50.0) - 2023-12-22

### Added

-   Add a button to copy the token in the clipboard

### Changed

-   Sort the sources list in the GraphManagement tool

## [1.49.0](https://github.com/souslesens/souslesensVocables/compare/1.48.0...1.49.0) - 2023-12-19

### Added

-   Interface to manage token

### Changed

-   token are generated with ulid and hash of login to avoid collision

## [1.48.0](https://github.com/souslesens/souslesensVocables/compare/1.47.0...1.48.0) - 2023-12-18

### Changed

-   Use token to authenticate with API
-   Use Authorization barear intead of x-token

## [1.47.1](https://github.com/souslesens/souslesensVocables/compare/1.46.2...1.47.0) - 2023-12-12

## [1.47.0](https://github.com/souslesens/souslesensVocables/compare/1.46.2...1.47.0) - 2023-12-12

## [1.46.2](https://github.com/souslesens/souslesensVocables/compare/1.45.0...1.46.2) - 2023-12-05

### Fixed

-   Unit tests

## [1.46.1](https://github.com/souslesens/souslesensVocables/compare/1.45.0...1.46.1) - 2023-12-05

> [!IMPORTANT]
> Updating to Unrelease require a data migration. Execute the following script after upgrade.

```bash
node scripts/migrations/migration_1.45_users.js -f config/users/users.json -w
```

### Fixed

-   GraphManagement using `sls-api` use the user token

## [1.46.0](https://github.com/souslesens/souslesensVocables/compare/1.45.0...1.46.0) - 2023-12-05

### Added

-   GraphManagement tools: download and upload RDF graph
-   Add new entries in `mainConfig.json`:
    -   `souslesensUrlForVirtuoso`: Souslesens URL from virtuoso (optional, will use
        `souslesensUrl` if not defined)
    -   `slsApi`: `sls-api` info if an instance of `sls-api` is used.

Example:

```json
"souslesensUrlForVirtuoso" : "http://host.docker.internal:3010",
"slsApi": {
    "url": "http://localhost:8000"
}
```

## [1.45.0](https://github.com/souslesens/souslesensVocables/compare/1.44.0...1.45.0) - 2023-12-05

## [1.44.0](https://github.com/souslesens/souslesensVocables/compare/1.43.0...1.44.0) - 2023-11-27

> [!IMPORTANT]
> Updating to Unrelease require a data migration. Execute the following script after upgrade.

```bash
node scripts/migrations/migration_1.44_config.js -c config -w
```

### Changed

-   Remove `blender` field from `sources.json`
-   Remove `default_sparql_url` from `mainConfig.json`

## [1.43.1](https://github.com/souslesens/souslesensVocables/compare/1.42.0...1.43.1) - 2023-11-22

## [1.43.0](https://github.com/souslesens/souslesensVocables/compare/1.42.0...1.43.0) - 2023-11-20

### Fixed

-   Add trailing / to COPY instruction in Dockerfile
-   Disable name field when editing source/profile form
-   Source form: group cannot start with a /

### Changed

-   Replace groups in the Users table with profiles
-   Remove `blender` from profiles

### Added

-   help button on all fields of the source form

## [1.42.3](https://github.com/souslesens/souslesensVocables/compare/1.42.2...1.42.3) - 2023-10-11

### Fixed

-   KGcreator upload form is now displayed

## [1.42.2](https://github.com/souslesens/souslesensVocables/compare/1.42.1...1.42.2) - 2023-10-10

### Fixed

-   `npm ci` install both node app **and** mainapp.

## [1.42.1](https://github.com/souslesens/souslesensVocables/compare/1.42.0...1.42.1) - 2023-10-10

### Fixed

-   Remove unused `node-pty` from npm dependencies

## [1.42.0](https://github.com/souslesens/souslesensVocables/compare/1.41.0...1.42.0) - 2023-10-10

> [!IMPORTANT]
> This release change the `npm` command to start the application. See `package.json` and
> `README.md` to get the new commands

### Added

-   Add `ElasticSearch.skipSslVerify` option to mainConfig.json to disable ssl check when
    using an ElasticSearch instance with self-signed certificate
-   This `CHANGELOG.md`

### Changed

-   Rename `loginScheme` to `restrictLoggedUser`
-   Use vitejs to build mainapp
-   Reorder docker instruction to build image faster
-   Change `npm` commands

## [1.37.0](https://github.com/souslesens/souslesensVocables/compare/1.36.0...1.37.0)

> [!IMPORTANT]
> Updating to 1.37.0 require a data migration. Execute the following script after upgrade.

```bash
node scripts/migrations/migration_1.37_sources.js -c config -w
```

## [1.33.0](https://github.com/souslesens/souslesensVocables/compare/1.32.4...1.33.0)

> [!IMPORTANT]
> Updating to 1.33.0 require a data migration. Execute the following script after upgrade.

```bash
node scripts/migrations/remove_admin_profile_migration.js -c config -w
```

## [1.30.0](https://github.com/souslesens/souslesensVocables/compare/1.29.0...1.30.0)

> [!IMPORTANT]
> Updating to 1.30.0 require a data migration. Execute the following script after upgrade.

```bash
node scripts/migrations/controller-migration.js -c config -w
```

## [1.27.0](https://github.com/souslesens/souslesensVocables/compare/1.26.0...1.27.0)

> [!IMPORTANT]
> Updating to 1.27.0 require a data migration. Execute the following script after upgrade.

```bash
node scripts/migrations/sources_access_control_migration_treeview.js -c config -w
```

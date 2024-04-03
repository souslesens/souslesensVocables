# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.61.0](https://github.com/souslesens/souslesensVocables/compare/1.60.0...1.61.0) (2024-03-29)

### Features

-   **ConfigEditor:** autocomplete group in the edit source form ([dc610d7](https://github.com/souslesens/souslesensVocables/commit/dc610d7d813c0782a420c4d0ac031225b05a8a55))
-   **configEditor:** sort sources by graphURI and Groups ([7e01253](https://github.com/souslesens/souslesensVocables/commit/7e012539972a0692e74f9474ee7dadaecb22e055))
-   **configEditor:** source is readOnly by default ([af79e14](https://github.com/souslesens/souslesensVocables/commit/af79e14ea4231bc426d1b485b5d0a116cc645612))
-   **graphManagement:** filter sources ([4cd1d51](https://github.com/souslesens/souslesensVocables/commit/4cd1d51c816f56485711b8c653587a238376b6da))
-   **graphManagement:** use mui table with sorting ([1027a84](https://github.com/souslesens/souslesensVocables/commit/1027a84959cc8f8e68e21fbd6179f380f406e85f))

### Bug Fixes

-   remove console.log ([54aee8e](https://github.com/souslesens/souslesensVocables/commit/54aee8e14bf7543da801a6ae488963aa9bf6cb64))

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

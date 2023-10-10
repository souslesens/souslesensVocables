# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [Unrelease](https://github.com/souslesens/souslesensVocables/compare/1.41.0...master)

### Added

-   Add `ElasticSearch.skipSslVerify` option to mainConfig.json to disable ssl check when
    using an ElasticSearch instance with self-signed certificate
-   This `CHANGELOG.md`

### Changed

-   Rename `loginScheme` to `restrictLoggedUser`
-   Use vitejs to build mainapp
-   Reorder docker instruction to build image faster

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

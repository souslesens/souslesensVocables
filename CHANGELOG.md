# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.94.0](https://github.com/souslesens/souslesensVocables/compare/1.93.1...1.94.0) (2024-11-27)

> [!IMPORTANT]
> Updating to 1.94.0 require a manual operation to upgrade to virtuoso 7.2.14. Execute the following
> script **before** upgrade.

```bash
docker compose exec virtuoso sh
# on the virtuoso container
isql-v
# on the isql console
exec('checkpoint');
# back on the virtuoso container
rm virtuoso.trx
# back on host
docker compose up -d
```

### Features

* **api/jowl:** activate jowlServer when the enabled flag is true ([b0c791b](https://github.com/souslesens/souslesensVocables/commit/b0c791be979a1dc2bd58445f0398148919a925bb))
* **mainapp:** activate slsApi when the enabled flag is true ([8a28581](https://github.com/souslesens/souslesensVocables/commit/8a28581879e88375aa3ebf56edec790444f94e8f))


### Various changes

* **compose:** upgrade virtuoso version to 7.2.14 ([218f9709](https://github.com/souslesens/souslesensVocables/commit/218f9709215c5efbe0e0f945ab18d0ef52026939))


### [1.93.1](https://github.com/souslesens/souslesensVocables/compare/1.93.0...1.93.1) (2024-11-25)


### Bug Fixes

* **package:** restore node-graphviz in package.json ([28fed65](https://github.com/souslesens/souslesensVocables/commit/28fed65c8fab69dfaaf9312fd59a7e9e52f8906e))

## [1.93.0](https://github.com/souslesens/souslesensVocables/compare/1.92.0...1.93.0) (2024-11-25)


### Features

* **model/config:** improve the readibility of the validation errors report ([e51b4f2](https://github.com/souslesens/souslesensVocables/commit/e51b4f29efc988ee64966c85d669c44c926aeab7))


### Bug Fixes

* **model/config:** do not retrieve empty values for the root category ([255bb08](https://github.com/souslesens/souslesensVocables/commit/255bb084c565e1b81226c102ed8375068d9a1e27))

## [1.92.0](https://github.com/souslesens/souslesensVocables/compare/1.91.2...1.92.0) (2024-11-20)


### Features

* Add graph download button in lineage ([6e70270](https://github.com/souslesens/souslesensVocables/commit/6e70270c371bf2a2539c5bfac014182808a1ebb8))
* **mainapp:** catch sls-api errors ([2a90e2f](https://github.com/souslesens/souslesensVocables/commit/2a90e2f3ff4bb1e52785dc6ae953f1bf43b6b3f3))

### [1.91.2](https://github.com/souslesens/souslesensVocables/compare/1.91.1...1.91.2) (2024-11-18)

### [1.91.1](https://github.com/souslesens/souslesensVocables/compare/1.91.0...1.91.1) (2024-11-18)


### Bug Fixes

* **public:** use an empty list for the selector when the config is missing ([7884c3d](https://github.com/souslesens/souslesensVocables/commit/7884c3dfee40ec1efc7dbd75829c0e2bc521863c))

## [1.91.0](https://github.com/souslesens/souslesensVocables/compare/1.90.0...1.91.0) (2024-11-18)


### Features

* **express:** use zod to validate the mainConfig.json at startup ([31f98d1](https://github.com/souslesens/souslesensVocables/commit/31f98d121923686839f4ee4f0cb73d0ad79b23b0))
* **mainapp:** update ElasticSearch indexes when uploading a graph ([5ebd876](https://github.com/souslesens/souslesensVocables/commit/5ebd8763ce3c580a777f0815bb427678fec2e90e))
* optional entries in mainconfig ([b9566f5](https://github.com/souslesens/souslesensVocables/commit/b9566f52e846bc7b7fb32ba7e6e8733374aa94ae))
* **public/vocables:** sort tools selector from the tools_available field ([37f7494](https://github.com/souslesens/souslesensVocables/commit/37f749430456c38fa6854fb52bbf31d14f536286))
* strict mainconfig validation ([db19adf](https://github.com/souslesens/souslesensVocables/commit/db19adf63e38dd6030c23c7439cbaad9809240ea))


### Bug Fixes

* **configEditor:** SourcesDialog: prefix must be uniq ([99cab17](https://github.com/souslesens/souslesensVocables/commit/99cab170faf1e988ed608c8fb2f01be7e2a71163))
* **mainapp:** ensure to checkout the plugin repository with an empty version ([f6e7b0b](https://github.com/souslesens/souslesensVocables/commit/f6e7b0b821eea47b19d697a51693b5110047d572))
* **mainapp:** show the reason of the error when a plugin cannot be fetched ([2a6c0da](https://github.com/souslesens/souslesensVocables/commit/2a6c0daf4776f7e6a9f94d176b60382686dffde6))

## [1.90.0](https://github.com/souslesens/souslesensVocables/compare/1.89.0...1.90.0) (2024-10-22)


### Features

* **mainapp:** reload the sources in the window.Config constant ([5876ba0](https://github.com/souslesens/souslesensVocables/commit/5876ba0ae97298c98e99724cef2bd8f0ba830f28))

## [1.89.0](https://github.com/souslesens/souslesensVocables/compare/1.88.0...1.89.0) (2024-10-18)

## [1.88.0](https://github.com/souslesens/souslesensVocables/compare/1.87.0...1.88.0) (2024-10-16)

> [!IMPORTANT]
> Updating to 1.88.0 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```


### Features

* **mainapp:** add prefix field on SourcesDialog ([e12c334](https://github.com/souslesens/souslesensVocables/commit/e12c334916c3250900c6e557a2f57e411062e37e))
* **mainapp:** add the Lineage Predicates accordion to Source form dialog ([9261836](https://github.com/souslesens/souslesensVocables/commit/926183658cb85a6c7f35a99c277ecad2bb039e09))
* **migrations:** add prefix field in sources.json ([e8950a1](https://github.com/souslesens/souslesensVocables/commit/e8950a1de9240dbf83ddd88e0aa4dd34b722ef7e))


### Bug Fixes

* **mainapp:** add the missing imports field in the Source form dialog ([5d89cb8](https://github.com/souslesens/souslesensVocables/commit/5d89cb84e121cebfbe4398ccf132b69114fc17c1))
* **mainapp:** fix group validation ([33f8134](https://github.com/souslesens/souslesensVocables/commit/33f8134c214c6ddba8adc4eb8a1447392ead777f))
* **mainapp:** handle predicates correctly ([7859f0b](https://github.com/souslesens/souslesensVocables/commit/7859f0bbd0cc9f15bea963a5c4d1aa9a4ec71b71))
* **mainapp:** set error string to helperText ([c741a88](https://github.com/souslesens/souslesensVocables/commit/c741a88014de3b7d4e223f009386ff607bd41f3c))

## [1.87.0](https://github.com/souslesens/souslesensVocables/compare/1.86.3...1.87.0) (2024-10-11)


### Features

* **lineage:** add edit source dialog ([7940f8b](https://github.com/souslesens/souslesensVocables/commit/7940f8b1a42e0e761661937550f5d108cffac36a))
* **lineage:** check if source is owned by user to show the edit source btn ([3d6b53d](https://github.com/souslesens/souslesensVocables/commit/3d6b53dc4c4f67e5e6fa72524eb53198050c1a04))
* **mainapp:** move the UserSources delete dialog to a dedicated component ([d9dd873](https://github.com/souslesens/souslesensVocables/commit/d9dd8732a7c9a6593f892e3186c6b9ae02c4498a))
* **mainapp:** rewrite the form to edit Source in the ConfigEditor ([1ca4a35](https://github.com/souslesens/souslesensVocables/commit/1ca4a35e8c2e19b1794d9d81368590bd14c9cb47))
* **public:** use upload graph modal in onto creator ([898e893](https://github.com/souslesens/souslesensVocables/commit/898e8934ecaefadde80e0b3246e721040e7174f0))

### [1.86.3](https://github.com/souslesens/souslesensVocables/compare/1.86.2...1.86.3) (2024-10-01)


### Bug Fixes

* **api:** add missing parameters in elasticsearch search query ([ee798bc](https://github.com/souslesens/souslesensVocables/commit/ee798bc4eddbce22347057d563ff4344b6e86b94))

### [1.86.2](https://github.com/souslesens/souslesensVocables/compare/1.86.1...1.86.2) (2024-10-01)


### Features

* **api:** add route to perfom a batched search query on elasticsearch ([53d6f44](https://github.com/souslesens/souslesensVocables/commit/53d6f44ba1ae5491262bab97817489449dfcf30a))
* **vocables:** use elastic/search api to search terms on multiple sources ([1449b00](https://github.com/souslesens/souslesensVocables/commit/1449b00cc7a758f85f82b95bca3539a972bca111))


### [1.86.1](https://github.com/souslesens/souslesensVocables/compare/1.86.0...1.86.1) (2024-09-30)


### Bug Fixes

* **graphManagement:** preventDefault when submit upload/download form ([76e0e06](https://github.com/souslesens/souslesensVocables/commit/76e0e06b158bf66cdbb729922d649d2d7901eb1c))

## [1.86.0](https://github.com/souslesens/souslesensVocables/compare/1.85.0...1.86.0) (2024-09-27)

> [!IMPORTANT]
> Updating to 1.86.0 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```


### Features

* **ConfigEditor:** add AllowedTools in profiles table ([3c8ea46](https://github.com/souslesens/souslesensVocables/commit/3c8ea463c50994c8ab9f27414bb3f7969c80d5ce))

## [1.85.0](https://github.com/souslesens/souslesensVocables/compare/1.84.0...1.85.0) (2024-09-23)


### Features

* **api:** add api/sources for user ([7b9d068](https://github.com/souslesens/souslesensVocables/commit/7b9d068818e3c6451b2d8352f89b0e78ffd2d06a))
* **mainapp:** allow downloading graph management as csv ([060b2d0](https://github.com/souslesens/souslesensVocables/commit/060b2d0118d65523ba2f7e42e2a57b3319e069a6))


### Bug Fixes

* **api/config:** don't get all config even if user is admin ([95af912](https://github.com/souslesens/souslesensVocables/commit/95af9123fd9c024f6f5d0f3b4f63a2028a36fc12))
* **userManagement:** use user routes for fetching sources ([cba02fd](https://github.com/souslesens/souslesensVocables/commit/cba02fd59f2c73b2996bf3e80f67634e119b0110))

## [1.84.1](https://github.com/souslesens/souslesensVocables/compare/1.84.0...1.84.1) (2024-09-30)


### Bug Fixes

* **graphManagement:** preventDefault when submit upload/download form ([333509a](https://github.com/souslesens/souslesensVocables/commit/333509a13c56eb5ebe1381056b9bc47f92dff87f))

## [1.84.0](https://github.com/souslesens/souslesensVocables/compare/1.83.0...1.84.0) (2024-09-20)


### Bug Fixes

* **mainapp:** do not raise a require error when editing a profile ([4b9ebe4](https://github.com/souslesens/souslesensVocables/commit/4b9ebe4c298254eec2501bdd642db26ad022bef5)), closes [#885](https://github.com/souslesens/souslesensVocables/issues/885)

## [1.83.0](https://github.com/souslesens/souslesensVocables/compare/1.82.1...1.83.0) (2024-09-17)


### Features

* **mainapp:** add snackbar messages with the token renewal in UserManagement ([7c63fa2](https://github.com/souslesens/souslesensVocables/commit/7c63fa2656f062e77b4f1468165ef39653b0fc0a))
* **mainapp:** allow downloading individual db/source ([4e0fdd6](https://github.com/souslesens/souslesensVocables/commit/4e0fdd6e68dc0380d461a3f2060039d7ae4481de))
* **mainapp:** make json downloads prettier ([73ef151](https://github.com/souslesens/souslesensVocables/commit/73ef151bcce60863d96b8e34b4035d3ed227983f))
* **mainapp:** move UserManagement in the main dialog ([c336b18](https://github.com/souslesens/souslesensVocables/commit/c336b187eb2d3f2a6e200e7323ffd7e3714a2b15))
* **mainapp:** revamp the UserManagement to allow sources edition ([1162940](https://github.com/souslesens/souslesensVocables/commit/1162940a41ef8506095430dac7a202695863369b))
* **model:** load default graph on start ([7f0c947](https://github.com/souslesens/souslesensVocables/commit/7f0c947822fa1e9f773e635338fa2e9cc5e715c0))


### Bug Fixes

* **api:** the token renewal needs to fetch the login identifier from the body ([c3d00a1](https://github.com/souslesens/souslesensVocables/commit/c3d00a1e2e75652a4e519dff5daccd88d8de5f0d))
* **app:** check config.auth before isAuthenticated ([345eab6](https://github.com/souslesens/souslesensVocables/commit/345eab6bb987e70883014f4c5e9e05aba8090cf3))
* **mainapp:** use the repository object when updating Plugin Repository ([a9a8721](https://github.com/souslesens/souslesensVocables/commit/a9a8721fdbc166b2d69270a27a21efb11530976c))

### [1.82.1](https://github.com/souslesens/souslesensVocables/compare/1.82.0...1.82.1) (2024-09-03)


### Bug Fixes

* plugins route are create dynamically ([740003e](https://github.com/souslesens/souslesensVocables/commit/740003ee108f0bb6d0612233ca0a01032c4bb3b1))
* req.isAuthenticated is a function and it must be called ([df46ed2](https://github.com/souslesens/souslesensVocables/commit/df46ed255ad9e57a4288240c19519f518371f71d))

## [1.82.0](https://github.com/souslesens/souslesensVocables/compare/1.81.1...1.82.0) (2024-09-03)


### Features

* **auth:** implements Auth0 authentication strategy with passport ([98005e7](https://github.com/souslesens/souslesensVocables/commit/98005e70e79fa327c31e34b09ce1dfb72f0ab885))
* **auth:** implements auth0 roles retrieving from API ([cfb1770](https://github.com/souslesens/souslesensVocables/commit/cfb1770aa53354178034bac078e422ab80a98445))
* **mainapp:** add json download for sources and databases ([9f9ec2c](https://github.com/souslesens/souslesensVocables/commit/9f9ec2c1561a8efbc620af2f0afcfc7b67845f11))
* **mainapp:** replace filter autocomplete by input ([e6596a4](https://github.com/souslesens/souslesensVocables/commit/e6596a4289ac72775b6536f944a5131c8f8193b5))
* **packages:** install the module passport-auth0 ([a76ee05](https://github.com/souslesens/souslesensVocables/commit/a76ee05dc64f849388ba891310f09f69b2f84722))

### [1.81.1](https://github.com/souslesens/souslesensVocables/compare/1.81.0...1.81.1) (2024-08-27)

> [!IMPORTANT]
> Updating to 1.81.1 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```


### Bug Fixes

* **Dockerfile:** install git ([83364fd](https://github.com/souslesens/souslesensVocables/commit/83364fdd5fc7acd7dccd2630e38ba4e8f978c745))
* **migrations:** create missing plugins.json file if missing ([367c3e8](https://github.com/souslesens/souslesensVocables/commit/367c3e8059288b2d35cb66e8a783e4480995afe0))

## [1.81.0](https://github.com/souslesens/souslesensVocables/compare/1.80.1...1.81.0) (2024-08-26)


### Features

* **api:** add the routes to manage repositories of plugins ([cadde8d](https://github.com/souslesens/souslesensVocables/commit/cadde8d3c700cbfec9d4b83d17d02dbf111e4382))
* **api:** rename the admin endpoint /plugins to /plugins/config ([9e08934](https://github.com/souslesens/souslesensVocables/commit/9e08934d772a96bc3b33c1b7a94bdf979b6a537c))
* **mainapp:** allow to sort and filter the repositories table ([75c095b](https://github.com/souslesens/souslesensVocables/commit/75c095b32b860add26f7e7f660bff99809a8b2f5))
* **mainapp:** implements the plugins repositories management interface ([f3a93f2](https://github.com/souslesens/souslesensVocables/commit/f3a93f2ba3623d6c2520457246f1ce7fe5c16966))
* **mainapp:** implements the repositories API with Plugin module ([e575fd2](https://github.com/souslesens/souslesensVocables/commit/e575fd24e934116bba1bfda1ad6e7a5381c32a88))


### Bug Fixes

* **api:** always fetch repositories ([9416c8e](https://github.com/souslesens/souslesensVocables/commit/9416c8e0e261033b77f3faa1dea1f11ed50be4e2))
* **api:** don't create symlink for multiple plugins repo ([88ed68d](https://github.com/souslesens/souslesensVocables/commit/88ed68dda3d9e7d7d79f58e339609d4db9610f70))
* **mainapp:** add the name property on the PasswordField component ([cd212f6](https://github.com/souslesens/souslesensVocables/commit/cd212f6afa0a09b3483e9a00d41a0803d0a4dbe8))
* **model:** fetch, not pull plugins repo ([97e296e](https://github.com/souslesens/souslesensVocables/commit/97e296e1a4c1199b36df7bcdf1ba9b98fe294895))
* **test:** change tools number ([f2fefae](https://github.com/souslesens/souslesensVocables/commit/f2fefae8ff7e96d3af80a06b1d5bca84c38529a9))

### [1.80.1](https://github.com/souslesens/souslesensVocables/compare/1.80.0...1.80.1) (2024-08-01)


### Bug Fixes

* **ConfigEditor:** Missing Mui module usage with the SourcesTable component ([cf66f00](https://github.com/souslesens/souslesensVocables/commit/cf66f00d3f3338c2d938d6be621575166d70ba1d))
* **ConfigEditor:** Missins Mui module usage with CircularProgress ([7e15474](https://github.com/souslesens/souslesensVocables/commit/7e154742a9e6afe9980bb69f8bb3c48d24899aae))
* **ConfigEditor:** the logs API will now return a message with 500 error ([44b5113](https://github.com/souslesens/souslesensVocables/commit/44b51134814536462631dd968db665155b7e2d12))
* **model/profiles:** load the config before setting the theme ([ddc01df](https://github.com/souslesens/souslesensVocables/commit/ddc01df20a31d593f9bafb1e3e5f11f129d70a35))

## [1.80.0](https://github.com/souslesens/souslesensVocables/compare/1.79.0...1.80.0) (2024-07-24)


### Bug Fixes

* **model/databases:** use one connection when batchSelect ([4ebb4e4](https://github.com/souslesens/souslesensVocables/commit/4ebb4e4ea2133387fa16a79ad366b791f741b379))
* **model/tools:** only retrieve plugins directory when using git repo ([ca629d9](https://github.com/souslesens/souslesensVocables/commit/ca629d90e99f260ca7f40c88e3cec9e424dba6ab))

## [1.79.0](https://github.com/souslesens/souslesensVocables/compare/1.78.2...1.79.0) (2024-07-19)


### Features

* **ConfigEditor:** add an API entry to save the plugins configuration ([b7100f1](https://github.com/souslesens/souslesensVocables/commit/b7100f1bd04353e3830e33e23ae02d36611cd4a6))
* **configEditor:** add the plugin tab ([e3734c8](https://github.com/souslesens/souslesensVocables/commit/e3734c8fbc1ae3b6306f4433f003252d46009424))
* **ConfigEditor:** implements the PluginsForm ([39cfc15](https://github.com/souslesens/souslesensVocables/commit/39cfc156650435eadece41dcc954823d72fe37fa))
* **model/config:** add readMainConfig function and use it ([856b4b5](https://github.com/souslesens/souslesensVocables/commit/856b4b5a31f31df5c6fe974556662bb86ef3f804))
* **model/tools:** convert the option during writeConfig ([b7e189f](https://github.com/souslesens/souslesensVocables/commit/b7e189f1c341dc65e4a1a0c6401d26b5dada2841))
* **model/utils:** add convertType function to cast string in JS types ([ce3ccc9](https://github.com/souslesens/souslesensVocables/commit/ce3ccc90fa4df3eaa0f6a796294cb00ff4f56e0b))


### Bug Fixes

* **model/tools:** add the config property to all the plugins ([dd3047a](https://github.com/souslesens/souslesensVocables/commit/dd3047ab233093f2b527a16795a09c340e219a8e))
* **tests:** configure jest to use CONFIG_PATH environment variable ([d8456aa](https://github.com/souslesens/souslesensVocables/commit/d8456aa14968c552d326fb5b5f6b8f27e39db4b2))

### [1.78.2](https://github.com/souslesens/souslesensVocables/compare/1.78.1...1.78.2) (2024-07-11)


### Bug Fixes

* **KGquery:** Graph is a KG feature, not a tool ([14515c0](https://github.com/souslesens/souslesensVocables/commit/14515c0a6badf6c1b1a7633c1e519cf70dbc3c6e))
* **model/databases:** fix fonction name ([66779d4](https://github.com/souslesens/souslesensVocables/commit/66779d4229254f04cff4e173cb75835f6129d190))

### [1.78.1](https://github.com/souslesens/souslesensVocables/compare/1.78.0...1.78.1) (2024-07-09)


### Bug Fixes

* **model/databases:** use one connection when batchSelect ([ce492ec](https://github.com/souslesens/souslesensVocables/commit/ce492ec564c7d1332a3aecb004e0216514846630))

## [1.78.0](https://github.com/souslesens/souslesensVocables/compare/1.77.1...1.78.0) (2024-07-04)


### Features

* add mainConfig.js model and allow editing settings ([2f1e01a](https://github.com/souslesens/souslesensVocables/commit/2f1e01a0786ceb2037407d2b398814f102bea377))
* center save button of Settings form ([617a74f](https://github.com/souslesens/souslesensVocables/commit/617a74f62aa8078112113fe93f21389a7164d804))
* **ConfigEditor:** add a settings tab to configure basic mainConfig options ([cc9905a](https://github.com/souslesens/souslesensVocables/commit/cc9905a6c899063732878580e299326a75350801))
* extract tool logic into model/tools.js ([a585c3d](https://github.com/souslesens/souslesensVocables/commit/a585c3d2ab9bcf417dc78156ddc9fece5e743eb1))
* **mainapp:** add a Tool.ts file to connect to admin/all-tools endpoint ([f8615e7](https://github.com/souslesens/souslesensVocables/commit/f8615e744cbaff664dcaa36fd1a3fb82b1405633))
* make all known tools retrievable on admin/all-tools route ([9f4998a](https://github.com/souslesens/souslesensVocables/commit/9f4998a5b4f2fa2ee12f2779924809cb3e3e8e9b))
* manage tools server side ([6f5be84](https://github.com/souslesens/souslesensVocables/commit/6f5be84b407de34c835755348d2ef7e7d7b785e6))
* remove dividers ([4feaa9f](https://github.com/souslesens/souslesensVocables/commit/4feaa9fbcda655179a49bf3c98f75c74525333a5))
* show feedback when saving settings ([e0667af](https://github.com/souslesens/souslesensVocables/commit/e0667afcbd86757aa88f8c8d0d4f9a0f6dbe1ed5))
* use checkboxes to render settings Select options ([5b5c287](https://github.com/souslesens/souslesensVocables/commit/5b5c287f9e7d04b8e58c2cd870426efdb000ebe2))


### Bug Fixes

* add missing theme property to Profile type declaration ([9d05bee](https://github.com/souslesens/souslesensVocables/commit/9d05bee5e0638e8adb936f0932b5bc85ac916d6b))
* correct specification of Profile zod schema ([39d22f0](https://github.com/souslesens/souslesensVocables/commit/39d22f090f2a7f012b71f306442c54f6b7dc4d2f))
* pass models to model constructors and update tests ([17466a7](https://github.com/souslesens/souslesensVocables/commit/17466a7886bd6d37277ad2c8f4cc827a20af2e09))

### [1.77.1](https://github.com/souslesens/souslesensVocables/compare/1.77.0...1.77.1) (2024-07-04)


### Bug Fixes

* **api:** allow user to get rdf graphs (only allowed graphs) ([a52db6a](https://github.com/souslesens/souslesensVocables/commit/a52db6a5f65bba7d1c0f91177aa45e5ec2d38ba9))

## [1.77.0](https://github.com/souslesens/souslesensVocables/compare/1.76.0...1.77.0) (2024-07-03)


### Features

* **KGquery:** Add a generic configuration to define links between tools ([62573d1](https://github.com/souslesens/souslesensVocables/commit/62573d1111a42c51a97c912066ffcdf9bac4eeda)), closes [#777](https://github.com/souslesens/souslesensVocables/issues/777)
* **tools:** toTools is defined plugin side ([a709430](https://github.com/souslesens/souslesensVocables/commit/a709430986392f41a091db28b6cc83ae69c3bb81))

## [1.76.0](https://github.com/souslesens/souslesensVocables/compare/1.75.2...1.76.0) (2024-07-01)


### Bug Fixes

* **logs:** don't zip old logs ([f5aa6a7](https://github.com/souslesens/souslesensVocables/commit/f5aa6a75b02657f0bce113e5f2254436f835aff1))

### [1.75.2](https://github.com/souslesens/souslesensVocables/compare/1.75.1...1.75.2) (2024-06-27)


### Features

* **KGbuilder:** batch select data in database ([63c9120](https://github.com/souslesens/souslesensVocables/commit/63c912077daf1a9206a631cd944feabe5b8c3e9a))

### [1.75.1](https://github.com/souslesens/souslesensVocables/compare/1.75.0...1.75.1) (2024-06-19)

## [1.75.0](https://github.com/souslesens/souslesensVocables/compare/1.74.2...1.75.0) (2024-06-19)

### [1.74.2](https://github.com/souslesens/souslesensVocables/compare/1.74.1...1.74.2) (2024-06-12)

### [1.74.1](https://github.com/souslesens/souslesensVocables/compare/1.74.0...1.74.1) (2024-06-12)

## [1.74.0](https://github.com/souslesens/souslesensVocables/compare/1.73.0...1.74.0) (2024-06-12)


### Features

* **ConfigEditor:** move all the promises in the same block ([fe46d7e](https://github.com/souslesens/souslesensVocables/commit/fe46d7e90c278e9cdc954376c08bc88127d25e9c))
* **ConfigEditor:** store the tab index in the URL for futher usage ([db9b8c4](https://github.com/souslesens/souslesensVocables/commit/db9b8c441e43fdcd83650046f81d29054efa9ff6))
* **graphManagement:** set chunk size to 10Mo ([1dac8f8](https://github.com/souslesens/souslesensVocables/commit/1dac8f88e92030c3fb4652855c233e06be44f519))
* **UI:** set or replace tool params when a tool is selected ([45154b9](https://github.com/souslesens/souslesensVocables/commit/45154b98df0f1b6ba80cd659bf53e82db8829da0))


### Bug Fixes

* prevent infinite rendering by moving state update outside of render flow ([8bb95d2](https://github.com/souslesens/souslesensVocables/commit/8bb95d22a154c8655629ce352524ba37d8aa66eb))

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

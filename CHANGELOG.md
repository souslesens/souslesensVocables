# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.11.0](https://github.com/souslesens/souslesensVocables/compare/2.10.0...2.11.0) (2025-06-25)

## [2.10.0](https://github.com/souslesens/souslesensVocables/compare/2.9.0...2.10.0) (2025-06-17)


### Features

* **api/users:** /profiles return all profiles if user is admin ([ef78756](https://github.com/souslesens/souslesensVocables/commit/ef78756ae3dcce9e3f58645d2055cb3d8188e279))
* **api/users:** /users return all users if user is admin ([213f9d3](https://github.com/souslesens/souslesensVocables/commit/213f9d3014cbd295f5b988340dd54df1483c388a))


### Bug Fixes

* **model/user:** isAdmin always return true if auth is disabled ([2895ea5](https://github.com/souslesens/souslesensVocables/commit/2895ea56b52d43c780b6f50f12d64fc292997215))

## [2.9.0](https://github.com/souslesens/souslesensVocables/compare/2.8.0...2.9.0) (2025-06-10)


### Features

* add sparql exec route ([eb900ec](https://github.com/souslesens/souslesensVocables/commit/eb900ec6c0ac261664dae228176fc44218091d9d)), closes [#1173](https://github.com/souslesens/souslesensVocables/issues/1173)

## [2.8.0](https://github.com/souslesens/souslesensVocables/compare/2.7.0...2.8.0) (2025-06-06)

> [!IMPORTANT]
> Updating to 2.8.0 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```


### Features

* add links to profiles from the users table ([3691421](https://github.com/souslesens/souslesensVocables/commit/369142122b2d5f2546a046d37c2a51e9304cd18f)), closes [#1263](https://github.com/souslesens/souslesensVocables/issues/1263)
* add modification date to UserData ([3f59a93](https://github.com/souslesens/souslesensVocables/commit/3f59a9361b7dff8714ba4b020bf7827b42602d8f)), closes [#1205](https://github.com/souslesens/souslesensVocables/issues/1205)
* add readwrite to userData ([b81a646](https://github.com/souslesens/souslesensVocables/commit/b81a6462ec6146316755c0a2216d29f3c5616f3b))
* **configEditor:** add group:xxx function on searchbar ([e72b30b](https://github.com/souslesens/souslesensVocables/commit/e72b30b191922443c626386234437b86e987b663))
* **ConfigEditor:** select to help filtering groups ([d04afa6](https://github.com/souslesens/souslesensVocables/commit/d04afa669e1f64a67a176c6f14c19e82dad62825))


### Bug Fixes

* **api/userData:** fix GET/PUT/DELETE permissions on userData routes ([591ba72](https://github.com/souslesens/souslesensVocables/commit/591ba723ef30df9e7e7d58a5bf05acebb76a39a2))
* **api/userData:** fix getting data where data_content is into a file ([0c9f231](https://github.com/souslesens/souslesensVocables/commit/0c9f23128de0f89d6218b8c3b0a00489f5f7292b))
* Avoid getting a userdata belonging to someone else ([83b813e](https://github.com/souslesens/souslesensVocables/commit/83b813e33685bbe451b4453fa69c296fceb64f62))
* **ConfigEditor:** Filters by groups ([57e19ab](https://github.com/souslesens/souslesensVocables/commit/57e19abb67efa9aeaee5739bc69524fafbbf4ca1))
* **openApi:** userDataContent can be any json ([480d322](https://github.com/souslesens/souslesensVocables/commit/480d322fe91091a4fcd42e18f56b46b682e50081))
* owner can access and modify his data ([644cfff](https://github.com/souslesens/souslesensVocables/commit/644cfffbc40f5d420d937e4e5740b23d1f66d4db))
* round graph size values ([8a93ef4](https://github.com/souslesens/souslesensVocables/commit/8a93ef48aa4d76b3b6275bb28a169f0b3f4ae7d1)), closes [#1336](https://github.com/souslesens/souslesensVocables/issues/1336)

## [2.7.0](https://github.com/souslesens/souslesensVocables/compare/2.6.0...2.7.0) (2025-05-26)


### Bug Fixes

* do not block loading sources if a source is invalid ([a7aa51c](https://github.com/souslesens/souslesensVocables/commit/a7aa51c3317af91573ff4af15e56ecd6220692ed))

## [2.6.0](https://github.com/souslesens/souslesensVocables/compare/2.5.1...2.6.0) (2025-05-22)

### [2.5.1](https://github.com/souslesens/souslesensVocables/compare/2.5.0...2.5.1) (2025-05-21)


### Bug Fixes

* **api/userData:** parse user.id as int ([e3d3438](https://github.com/souslesens/souslesensVocables/commit/e3d3438237d6f28d8e88ef248e33791b618e56aa))

## [2.5.0](https://github.com/souslesens/souslesensVocables/compare/2.4.2...2.5.0) (2025-05-15)

### [2.4.2](https://github.com/souslesens/souslesensVocables/compare/2.4.1...2.4.2) (2025-03-31)

### [2.4.1](https://github.com/souslesens/souslesensVocables/compare/2.4.0...2.4.1) (2025-03-28)


### Bug Fixes

* fix mappingModeler load for no source ,icons size and import export JSON for mappingModeler

## [2.4.0](https://github.com/souslesens/souslesensVocables/compare/2.3.0...2.4.0) (2025-03-28)


### Bug Fixes

* **authentication:** create use account if not exists when first login with keycloak ([3338e3e](https://github.com/souslesens/souslesensVocables/commit/3338e3e8b9f02bb3fed410497b91c4714fd5edf5))
* return the data_content with userData ([2a54da4](https://github.com/souslesens/souslesensVocables/commit/2a54da4fffcf9d4238079119b08268135f7c71d8))

## [2.3.0](https://github.com/souslesens/souslesensVocables/compare/2.2.1...2.3.0) (2025-03-24)

> [!IMPORTANT]
> Updating to 2.3.0 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```


### Features

* add a base URI to sources ([5ad0428](https://github.com/souslesens/souslesensVocables/commit/5ad0428e9c79909314258a54360ecbbf98d89760)), closes [#1104](https://github.com/souslesens/souslesensVocables/issues/1104)
* add a cancel button to graph upload ([4afa84b](https://github.com/souslesens/souslesensVocables/commit/4afa84bb21aad17393a2d870b0cb44479af00716))
* add a create source with upload graph button ([33c7e1f](https://github.com/souslesens/souslesensVocables/commit/33c7e1fb3a0a78cf2a3af86f391aa132499781a1)), closes [#1172](https://github.com/souslesens/souslesensVocables/issues/1172)
* add a new architecture schema ([456f840](https://github.com/souslesens/souslesensVocables/commit/456f840793ae7c9a2370571cdab01c5e1df502bc))
* add a procedure to convert docx to markdown ([c926775](https://github.com/souslesens/souslesensVocables/commit/c92677545dc00516f4bd076a37bc79612de02ab0))
* add data_tool and data_source on usersData ([921e81c](https://github.com/souslesens/souslesensVocables/commit/921e81cf57899696aa611926926c28be4b65d858))
* add details to installation procedure ([a1bbbf8](https://github.com/souslesens/souslesensVocables/commit/a1bbbf8c3f3cf6baf971c934ed212f5421f3b0bb))
* add filters on userData ([7171524](https://github.com/souslesens/souslesensVocables/commit/7171524be8e8a4236eeff57142995ed2d8bf3679))
* add icons for profile.ishared ([15dfac6](https://github.com/souslesens/souslesensVocables/commit/15dfac654c91ad3efa602d94fb2709703c4eb81d))
* add JSDoc to documentation ([93f0558](https://github.com/souslesens/souslesensVocables/commit/93f05589e25bdc1349569fd08a83820e3d3c889f))
* Add KGBuilder tutorial ([bf36739](https://github.com/souslesens/souslesensVocables/commit/bf367397e7cd6b81dbd112f9c7108c78c41cc115))
* add new tools tests ([0438e15](https://github.com/souslesens/souslesensVocables/commit/0438e155c4fe076ee9b356f72e2ad6b7a065dfd9))
* add shared_users boolean on profiles ([96c4056](https://github.com/souslesens/souslesensVocables/commit/96c4056a82ff209bd5cecc7da9e9ad3f909e4fba)), closes [#1080](https://github.com/souslesens/souslesensVocables/issues/1080)
* add source creation message ([dd74161](https://github.com/souslesens/souslesensVocables/commit/dd74161b7e3c0686879f953050d40cf02f0dad3a)), closes [#1165](https://github.com/souslesens/souslesensVocables/issues/1165)
* add source creation modal at source upload ([bdcac48](https://github.com/souslesens/souslesensVocables/commit/bdcac48ea0cbd99263d4582b6ac1b4da26a8f68a))
* add the possibility to upload graph add source creation ([aad4f7e](https://github.com/souslesens/souslesensVocables/commit/aad4f7ee58c73d25398e61029f1421126c63e29a)), closes [#1076](https://github.com/souslesens/souslesensVocables/issues/1076)
* add tools tests ([d7a31f4](https://github.com/souslesens/souslesensVocables/commit/d7a31f49dd24e0a0486d0c8ddd7422e164eebe80))
* **api:** adapt the /log routes to not use the symlink ([bb209b8](https://github.com/souslesens/souslesensVocables/commit/bb209b8009d094085252ab8964da13b0f4369dbc))
* **api:** add the description for each register API tags ([b0be329](https://github.com/souslesens/souslesensVocables/commit/b0be32964aa7c3c84565defc37164bb9d2921602))
* **api:** prevent passing an empty password ([23cbde1](https://github.com/souslesens/souslesensVocables/commit/23cbde1c69508701b77668806385321b491fa78c))
* **api:** returns userData identifier when the insert was successul ([4eec8dc](https://github.com/souslesens/souslesensVocables/commit/4eec8dc15c22c2ff9e1157be3766b2f2a5e5067a))
* better toc ([ab351dc](https://github.com/souslesens/souslesensVocables/commit/ab351dcbabdd9fcd6484b13b4aaa016cf9d79995))
* **bin:** adapt the logger with the new logs section in mainConfig ([35caeec](https://github.com/souslesens/souslesensVocables/commit/35caeec7aa04c77781e3f0b8199e14beb8ba0e19))
* check that baseUri end with / or # ([c3f18ff](https://github.com/souslesens/souslesensVocables/commit/c3f18ffe3616376d411eb6c4a9de0595692f0612))
* **config:** add the userData section in mainConfig ([de9e88b](https://github.com/souslesens/souslesensVocables/commit/de9e88b8308dc451cfed8c97766983996d9c0fa3))
* **config:** replace the logDir option with a logs object ([f5a2dde](https://github.com/souslesens/souslesensVocables/commit/f5a2dde2e42b1521fb00677fa848c2233df19d78))
* filter on data_group for usersData api ([37a9434](https://github.com/souslesens/souslesensVocables/commit/37a9434f1774216fdededbe1ea3b8f0013a1ed98)), closes [#1187](https://github.com/souslesens/souslesensVocables/issues/1187)
* filter on data_type for usersData api ([4f64149](https://github.com/souslesens/souslesensVocables/commit/4f64149d93e36351870423d92331a4930e499b11)), closes [#1195](https://github.com/souslesens/souslesensVocables/issues/1195)
* **mainapp:** ConfigEditor: graphUri and baseUri are URLs ([933533f](https://github.com/souslesens/souslesensVocables/commit/933533fcff16e0b8aeb5088e55f143b44edbdb1c))
* **mainapp:** improve user form password label ([61f0cb3](https://github.com/souslesens/souslesensVocables/commit/61f0cb366f51d12c1071470e54de48b5de8f5f72))
* **mainapp:** make login and password required in user form ([080932d](https://github.com/souslesens/souslesensVocables/commit/080932d5687d7f8113135eb985e4c92651983827))
* **model:** remove the data_content field from the view user_data_list ([acef57b](https://github.com/souslesens/souslesensVocables/commit/acef57ba4516bb0750e297789c57ef69e77a798c))
* take isShared in account in api/users route ([d2dd552](https://github.com/souslesens/souslesensVocables/commit/d2dd552ff9f4f30794179a01a267eddf10c6ff35)), closes [#1080](https://github.com/souslesens/souslesensVocables/issues/1080)
* upgrade libs ([1c4aace](https://github.com/souslesens/souslesensVocables/commit/1c4aacecc27a10c5a86a74ef5b512649caa220c6))
* upgrade lint libs ([8b45661](https://github.com/souslesens/souslesensVocables/commit/8b4566115acb1aaff87c04d1e989489e4daecc35))
* upgrade some js libs ([f00143a](https://github.com/souslesens/souslesensVocables/commit/f00143a7ceda99dadda265042310efb4a4409f98))
* upgrade to node 22 ([c4effb5](https://github.com/souslesens/souslesensVocables/commit/c4effb5690c6837c8eac571fb7abfe5f8baa99fc))
* upgrade vite ([1bf1059](https://github.com/souslesens/souslesensVocables/commit/1bf1059fec678d5081b880078901ee7c360ab47f))
* upload a graph from URL ([051a39b](https://github.com/souslesens/souslesensVocables/commit/051a39bb5fbe1ad4b5a16c7aa17087b78547ebe7)), closes [#1077](https://github.com/souslesens/souslesensVocables/issues/1077)
* **userData:** allow to store the data_content on the file system ([e524ff8](https://github.com/souslesens/souslesensVocables/commit/e524ff8d9ce8d499f0feda4390d91bee1c9a4e58))
* **userData:** do not allow content over the maximum size with database ([7295b2d](https://github.com/souslesens/souslesensVocables/commit/7295b2d8ed9ab86a02e5f17691e90d837b79c422))


### Bug Fixes

* adapt title for user creation ([6919be8](https://github.com/souslesens/souslesensVocables/commit/6919be848b1b0a56596181d8b9ff7848aceda651))
* add misssing useMemo deps ([d9cf647](https://github.com/souslesens/souslesensVocables/commit/d9cf6477f39d8ca737e27c35859cc0ffc4f51905))
* **api:** add the missing tags for /triples2rdf and /users/{id} routes ([98e4c47](https://github.com/souslesens/souslesensVocables/commit/98e4c47255407895c0a208917f935c79902dc49f))
* better handling git message ([bd49572](https://github.com/souslesens/souslesensVocables/commit/bd49572ecff274d4c28b2228b29977a54bb977a3))
* complete api doc for userData ([fa8d769](https://github.com/souslesens/souslesensVocables/commit/fa8d76983666dbd12a2bf52bcfeb55fb473742f8))
* correct some eslint errors ([5476d97](https://github.com/souslesens/souslesensVocables/commit/5476d97e7737ac877cf3ce9d27a8b8932f416d59))
* do not make special case on admin on non-admin routes ([9f3f144](https://github.com/souslesens/souslesensVocables/commit/9f3f144c38366aca67613c1360f911c54072f7ff))
* don't let users delete other people's data ([2488a77](https://github.com/souslesens/souslesensVocables/commit/2488a77ffa822bdc78d67cc871bdaa449bae0965))
* fixed some errors in api and model ([685ee25](https://github.com/souslesens/souslesensVocables/commit/685ee25d68989fee3e51d7e0e1aee246868892c5))
* fixed some errors in bin ([0f6e704](https://github.com/souslesens/souslesensVocables/commit/0f6e70461c3912259ff322ce194a8b5d0c477d63))
* **jsdoc:** exclude lineage_whiteboard.js (broken jsdocs) ([8fd013a](https://github.com/souslesens/souslesensVocables/commit/8fd013aa7dde3fd483c74e771387d468971a682a))
* **mainapp:** close icon for close button in UploadGraphModal ([f087db8](https://github.com/souslesens/souslesensVocables/commit/f087db80c941bb6d529f881ed22b0356925c2bf2))
* **mainapp:** do not send blank password on edit ([6fc74ea](https://github.com/souslesens/souslesensVocables/commit/6fc74ea3df6092e118c0890378206dfe5dbc1376))
* **mainapp:** use the Alert widget with the ProfilesTable component ([5669948](https://github.com/souslesens/souslesensVocables/commit/5669948c21f3daa87042e861f9351769bd637bf4))
* move tutorials section to user documentation ([0707fea](https://github.com/souslesens/souslesensVocables/commit/0707fea4da3e90477ac25fcca34b0c7dc379a98b))
* open graph in new tab ([395a65c](https://github.com/souslesens/souslesensVocables/commit/395a65c2d33bd75313b0772d2b877700eaa78c33))
* remove dead code ([27d0ee4](https://github.com/souslesens/souslesensVocables/commit/27d0ee46e71b45c19f287d7c4cb9c5add3807356))
* remove duplicate dependencies ([8ea587b](https://github.com/souslesens/souslesensVocables/commit/8ea587baa76f135493d2e399855a400493e6e1b7))
* remove loop unsuported by sqlite ([b46a5c6](https://github.com/souslesens/souslesensVocables/commit/b46a5c6234bf6ddc89b592ad3f621f11dd36eacb))
* remove trailing whitespaces ([2d66e99](https://github.com/souslesens/souslesensVocables/commit/2d66e99adde3ed529ec560021258db6bdbb821a8))
* remove unused file ([9f89b84](https://github.com/souslesens/souslesensVocables/commit/9f89b8483978a5fe02a4ddc41d5feb391c9f1e0a))
* remove unused packages ([816da90](https://github.com/souslesens/souslesensVocables/commit/816da90bf1745eca4d68c58a44dc3e9fe11bde11))
* remove useless defaultValue ([ed6d75c](https://github.com/souslesens/souslesensVocables/commit/ed6d75c6f73da732ba18c504b6db8223c998c980))
* rename autocomplete to autoComplete ([9d6ca96](https://github.com/souslesens/souslesensVocables/commit/9d6ca96e8f0e76de7e7502a7504f59eec02fd529))
* rename GraphManagement-logo path ([731696f](https://github.com/souslesens/souslesensVocables/commit/731696fb1cc2419505caa622ac4585e8f7ef32ac))
* rename incorect paths ([15afad6](https://github.com/souslesens/souslesensVocables/commit/15afad6ce8205d7c37e071e11a15e7b6f231a3dc))
* rename uri by url ([6105935](https://github.com/souslesens/souslesensVocables/commit/6105935f09945278c271ffe63acfce8013050662))
* rename variable ([ed1aa0a](https://github.com/souslesens/souslesensVocables/commit/ed1aa0a63855efece00d1a5c6f8cae3b9ddd9161))
* replace vertical option that doesnt exist ([fdd2013](https://github.com/souslesens/souslesensVocables/commit/fdd2013493590fa19a5fcd08d336a87e992f5123))
* run eslint ([d781eca](https://github.com/souslesens/souslesensVocables/commit/d781ecad664742cc2e9a8c756011181ec9dca72d))
* run prettier in bin directory ([ac68aa6](https://github.com/souslesens/souslesensVocables/commit/ac68aa6c043ce91b81e6e7ed21eda903ca3477b1))
* **sentry:** update sentry init ([facfedb](https://github.com/souslesens/souslesensVocables/commit/facfedbc735b6f85fca329b4ec60590b616e7284))
* sort documentation ([2d9a118](https://github.com/souslesens/souslesensVocables/commit/2d9a11824ae575651050627c214858e3c116e481))
* uris can be empty ([2aeb4d7](https://github.com/souslesens/souslesensVocables/commit/2aeb4d7bd23ec4e854450282cbcb017b68fa66d2))
* use a compatible page size ([07ae624](https://github.com/souslesens/souslesensVocables/commit/07ae6240a5a3f3d6f00d1a92fe9d1cff05af5190))
* use edit icon for profiles ([3042da3](https://github.com/souslesens/souslesensVocables/commit/3042da3237e8f01debe664da1f968357d9e92557))
* use edit icon for users ([47e2596](https://github.com/souslesens/souslesensVocables/commit/47e2596329085a84059d8ecddca949a0ef40c032))
* use hasOwn instead of repositoryInfo.hasOwnProperty ([a3f9331](https://github.com/souslesens/souslesensVocables/commit/a3f9331a892515808ef2edbfa67bd326af22c5f9))
* user in request ([4d03b30](https://github.com/souslesens/souslesensVocables/commit/4d03b30c240352de31326a219618aa4390932e9d))

### [2.2.1](https://github.com/souslesens/souslesensVocables/compare/2.2.0...2.2.1) (2025-02-12)


### Bug Fixes

* avoid cyclical imports ([6950981](https://github.com/souslesens/souslesensVocables/commit/69509815b81ea90c3f241b86259484bb509d8eaa))

## [2.2.0](https://github.com/souslesens/souslesensVocables/compare/2.1.0...2.2.0) (2025-02-11)


### Features

* remove data in UserData when a profile is deleted ([815e4cc](https://github.com/souslesens/souslesensVocables/commit/815e4cc14e741686dcdf271a49a56a6a1a2d0fad)), closes [#1072](https://github.com/souslesens/souslesensVocables/issues/1072)
* remove data in UserData when a user is deleted ([68cce76](https://github.com/souslesens/souslesensVocables/commit/68cce76863f1f122d175a502d5b959c026924f58)), closes [#1072](https://github.com/souslesens/souslesensVocables/issues/1072)

## [2.1.0](https://github.com/souslesens/souslesensVocables/compare/2.0.0...2.1.0) (2025-02-07)

> [!IMPORTANT]
> Updating to 2.1.0 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```


### Features

* add jest-coverage-comment github action ([e5fe272](https://github.com/souslesens/souslesensVocables/commit/e5fe2720b0239efa3796e8ae9a0a8d65394f4793))
* add source tests ([492d5ec](https://github.com/souslesens/souslesensVocables/commit/492d5ecc346c6a4a5ba928bd86149fb5a466b871))
* add tests for userData ([ec5cb7b](https://github.com/souslesens/souslesensVocables/commit/ec5cb7bb6064d00116a18e5fc985cb8ae6141d62))
* add tests for userData model ([946ab88](https://github.com/souslesens/souslesensVocables/commit/946ab887bde4209c9daf910e2146c12535942ed9))
* **database:** add the userdata schema into database ([a6b3e18](https://github.com/souslesens/souslesensVocables/commit/a6b3e18f583b59f88b5c7a478cf4c83361885eda))
* **database:** migrate profiles entries into database ([622e09d](https://github.com/souslesens/souslesensVocables/commit/622e09d7acf4533b276046370ecbcb8cb937d5d3))
* **database:** migrate users entries into database ([94571ce](https://github.com/souslesens/souslesensVocables/commit/94571cee590c0da51173cc5899b63941652543a9))
* remove non existing users and profiles from userData at insert and update ([828c64a](https://github.com/souslesens/souslesensVocables/commit/828c64aa165ab39cee30d4fe35e4ea4d5ad6fb42)), closes [#1073](https://github.com/souslesens/souslesensVocables/issues/1073)


### Bug Fixes

* authentication with keycloak ([8cf5851](https://github.com/souslesens/souslesensVocables/commit/8cf5851524fcf8ac2a83930c2d231d082addd0d4))
* indent userData test file properly ([01e513b](https://github.com/souslesens/souslesensVocables/commit/01e513bf43cc6d4a71e095ce5df2ad09bd05412d))
* **mainapp:** always manage the value of the groups field in the sources editor ([eaf555d](https://github.com/souslesens/souslesensVocables/commit/eaf555d5a01cb03e906e2fbdfb85247dea614c8b))
* **migrations:** bcrypt password only if user is local/json ([8f58ba5](https://github.com/souslesens/souslesensVocables/commit/8f58ba5adfed40fa2988f5f6d5bac2bbf8ea6865))
* remove useless file ([72ac8cc](https://github.com/souslesens/souslesensVocables/commit/72ac8cc4a3d6537f5cc3b02e768f5cc141f44ca9))
* use select for db deletion ([b016f0b](https://github.com/souslesens/souslesensVocables/commit/b016f0b462a427bad2ba20fceee665b5c8ff9f24))

## [2.0.0](https://github.com/souslesens/souslesensVocables/compare/1.100.2...2.0.0) (2025-01-30)

> [!IMPORTANT]
> Updating to 2.0.0 require manual migrations. See
> [documentation](https://souslesens.github.io/souslesensVocables/migrations/migrate-to-v2.html)
> for details.


### Features

* add a button to upload source ([3243287](https://github.com/souslesens/souslesensVocables/commit/324328744da1dadf1196df10102e6380a3605dab)), closes [#1075](https://github.com/souslesens/souslesensVocables/issues/1075)
* add filter to source control access ([4516616](https://github.com/souslesens/souslesensVocables/commit/4516616c83f0efd7d8e89195ae803c7b97c2a10b))
* **api/userData:** owned_by is set server side ([fb5acbb](https://github.com/souslesens/souslesensVocables/commit/fb5acbbdfa3063a11e68ec2fce4d2ef7bc52133f))
* **api/userData:** user can PUT only thier own sources ([47219d2](https://github.com/souslesens/souslesensVocables/commit/47219d2fe06f503f4ad75fce5dd578a350b6f9c1))
* **api/user:** Move profiles to admin section ([11c8fec](https://github.com/souslesens/souslesensVocables/commit/11c8fecfbaebe367610b4030ab220e8d2c1f1718))
* **api/user:** Move user api to admin section ([c8f0bd7](https://github.com/souslesens/souslesensVocables/commit/c8f0bd77ac9105c620cf71ee8b01aafa9678bb68))
* **database:** add the userdata schema into database ([926b4a1](https://github.com/souslesens/souslesensVocables/commit/926b4a135761626376974a5f1a9f67626e8e5a8e))
* **database:** migrate profiles entries into database ([aa5c53e](https://github.com/souslesens/souslesensVocables/commit/aa5c53eb4f5a765e148bbb20871b5bf7a848ff6f))
* **database:** migrate users entries into database ([8f8a1e4](https://github.com/souslesens/souslesensVocables/commit/8f8a1e4c0f2ded2267dba283e6b3b3d2761c4404))
* upgrade dev dependencies ([e8d5541](https://github.com/souslesens/souslesensVocables/commit/e8d5541c8d3ec977044cf10cbfd5a9c94f32bfff))
* upgrade some js libs ([fd0bae8](https://github.com/souslesens/souslesensVocables/commit/fd0bae8db0e5cd9a6521e65d88648f10df964f03))


### Bug Fixes

* **api/userData:** GET route is open for users ([991b55a](https://github.com/souslesens/souslesensVocables/commit/991b55aa99c1f29172bb2324337f5f30d3b158ff))
* **api/userData:** POST request don't need the id (autogenerated) ([c497992](https://github.com/souslesens/souslesensVocables/commit/c4979922e62050b9917e2e3d7037e75508079e2c))
* authentication with keycloak ([f79ab96](https://github.com/souslesens/souslesensVocables/commit/f79ab96872d4fbabd3b93cb0010867c1bacf363b))
* make userData request works with several groups for a user ([811f007](https://github.com/souslesens/souslesensVocables/commit/811f0074fc15d70497a27443376b569c93a099c3))
* **migrations:** bcrypt password only if user is local/json ([841a40b](https://github.com/souslesens/souslesensVocables/commit/841a40bb4a39cdd43462a4735394e2fadde2341d))
* **model/profiles:** fix config variable ([e020284](https://github.com/souslesens/souslesensVocables/commit/e0202841b6eda6aad1df418fc59a3e1651538f7c))
* **model/source:** replace missing profileModel._read with profileModel.getAllProfiles ([df5bff7](https://github.com/souslesens/souslesensVocables/commit/df5bff7082b4da94d44cd92c404a67db4170d640))
* **model/userData:** data_content can be anything ([b7b7ec1](https://github.com/souslesens/souslesensVocables/commit/b7b7ec1cda6cc801c23673365fe411d4e89bb699))
* **model/userData:** taking permission into account in the UserData request ([e2d50f1](https://github.com/souslesens/souslesensVocables/commit/e2d50f1658c65fc26524bf62abb225f80a9a95a5)), closes [#1071](https://github.com/souslesens/souslesensVocables/issues/1071)
* **model/users:** return first user when checking isAdmin ([f6d7d5d](https://github.com/souslesens/souslesensVocables/commit/f6d7d5de27946c2c939ac29a9ea66d84a5284263))
* remove useless uitests [cypress] ([c0af01d](https://github.com/souslesens/souslesensVocables/commit/c0af01d7edcc0c6a9923467ad8a2027fbad229f2))
* use snackbar for import info ([797a05b](https://github.com/souslesens/souslesensVocables/commit/797a05be7ad7bf98b274c7acf463376e1313d4b8))

### [1.100.2](https://github.com/souslesens/souslesensVocables/compare/1.100.1...1.100.2) (2025-01-15)

### [1.100.1](https://github.com/souslesens/souslesensVocables/compare/1.100.0...1.100.1) (2025-01-14)


### Bug Fixes

* tripleFactory mappingModeler ([c24d609](https://github.com/souslesens/souslesensVocables/commit/c24d6096caac17acc6f31890a8acdd56b71e3638))

## [1.100.0](https://github.com/souslesens/souslesensVocables/compare/1.99.0...1.100.0) (2025-01-13)

> [!IMPORTANT]
> Updating to 1.100.0 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```


### Various Changes

* **postgresql:** prepare v2 migration by adding database config to mainConfig.json ([b4ba32c2](https://github.com/souslesens/souslesensVocables/commit/b4ba32c283e57ba6e225295c2faf0e70fc76329a))

## [1.99.0](https://github.com/souslesens/souslesensVocables/compare/1.98.2...1.99.0) (2025-01-06)


### Bug Fixes

* **mainapp:** avoid to raise a ZodError when starting the application ([155c314](https://github.com/souslesens/souslesensVocables/commit/155c3140cb31f69ff99aa13c2e7880f13f46ea34))
* **mainapp:** typing ([4848622](https://github.com/souslesens/souslesensVocables/commit/4848622465726ad552a70c129ab1569263ce51eb))

### [1.98.2](https://github.com/souslesens/souslesensVocables/compare/1.98.1...1.98.2) (2024-12-20)

### [1.98.1](https://github.com/souslesens/souslesensVocables/compare/1.98.0...1.98.1) (2024-12-20)

## [1.98.0](https://github.com/souslesens/souslesensVocables/compare/1.97.0...1.98.0) (2024-12-20)


### Features

* **api:** GET and POST metadata ([7139090](https://github.com/souslesens/souslesensVocables/commit/713909009988bb0308a7abcbb756b27c4adb1c8e))
* **mainapp/graphManagement:** disable metadata editing for read only sources ([ba37ba7](https://github.com/souslesens/souslesensVocables/commit/ba37ba752eaa6d012d8932e7ff2ba1d82a923b77))
* **mainapp/graphManagement:** display metadata modal ([98b4cdf](https://github.com/souslesens/souslesensVocables/commit/98b4cdf8522a7dc92acc018fb45802b7b4d3adbb))

## [1.97.0](https://github.com/souslesens/souslesensVocables/compare/1.96.0...1.97.0) (2024-12-20)


### Features

* **graphManagement:** standard searchbar ([d6f29c2](https://github.com/souslesens/souslesensVocables/commit/d6f29c2c9956666c51480c43af16a797a05278dc))


### Bug Fixes

* **docs:** build doc on master branch only ([35765bc](https://github.com/souslesens/souslesensVocables/commit/35765bc5246e92eed30eef672db648e7c00c6566))
* **mainapp/configeditor:** do not validate own source prefix in edit mode ([d5b1781](https://github.com/souslesens/souslesensVocables/commit/d5b1781509a55fe98e82679b3dde527bb03a8698))
* **mainapp/plugin:** do not show the error snack when fetching was successful ([9cb0cc8](https://github.com/souslesens/souslesensVocables/commit/9cb0cc8e85a88af6d6021dc9ed9056db1aab1001))
* **mainapp:** correctly select the group in edit mode with the Source editor ([fb9047f](https://github.com/souslesens/souslesensVocables/commit/fb9047fa952bcfefa6d55147730b9f55b803fd56))
* **mainapp:** disable autocomplete on searchbars ([47870ac](https://github.com/souslesens/souslesensVocables/commit/47870ac196eeb3965b4e62bd4a1b6ef827336a03))

## [1.96.0](https://github.com/souslesens/souslesensVocables/compare/1.95.0...1.96.0) (2024-12-11)

> [!IMPORTANT]
> Updating to 1.96.0 require a data migration. Execute the following script after upgrade.

```bash
npm run migrate
```


### Bug Fixes

* **graphManagement:** copy paste file durring upload instead of rename ([391206f](https://github.com/souslesens/souslesensVocables/commit/391206f61c8594a9c76d9ab96c866b94956c6380))
* **graphManagement:** default is ok when downloading ([d23ada4](https://github.com/souslesens/souslesensVocables/commit/d23ada4a6f3d35eab838fcf54b38636e7501efd1))

## [1.95.0](https://github.com/souslesens/souslesensVocables/compare/1.94.0...1.95.0) (2024-11-28)

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

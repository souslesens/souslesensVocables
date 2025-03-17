# Contribute to souslesensVocables

To contribute to souslesensVocable, fork the repo and submit Pull Requests.

## continuous integration

### Style

We use [Prettier](https://prettier.io/) for Javascript code formatting. Please run
`npm run prettier:write` before each commit to format your code.

### Tests

We provide a `docker-compose.test.yaml` and a `tests/load_data.sh` script to build a testing
environment.

```bash
docker compose -f docker-compose.test.yaml -d
bash tests/load_data.sh
```

## Release

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

## Plugins system

### Create a plugin

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

### Plugin repositories

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

### Plugin configuration

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

### Plugin communication with other tools

Other tools can communicate with plugins. To configure a communication from a tool to a plugin,
use a `getToolRelations` function that must return an object like:

```javascript
self.getToolRelations = function () {
    return { KGquery: "queryToTagsCalendar" };
};
```

This mean that the `KGquery` tool will be able to communicate with the plugin using the
`queryToTagsCalendar` function (defined in souslesens).

### Use SousLesens modules on plugin

SousLesens modules can be imported form plugins using `import`. For example:

```js
import common from "/vocables/modules/shared/common.js";
```

The following Github Repository contains all the plugins of SLS and give more informations about them :
https://github.com/souslesens/slsv-plugins/

## Authentication

The authentication system used by SLS can be set in the `mainConfig.json` file, by editing the `auth` option.

This option can used these values:

| Name     | Description                                                |
| -------- | ---------------------------------------------------------- |
| auth0    | Provide the users from an application on auth0.com         |
| disabled | Disable the authentication and use the instance as `admin` |
| keycloak | Provide the users from a keycloak instance                 |
| local    | Provide the users from the `config/users/users.json` file  |

The `auth0` and `keycloak` options use the [passport](https://www.passportjs.org) JavaScript module. The users will be registered in the `users/users.json` file in the configuration directory.

### auth0

This provider can be configured with the `auth0` section in the `mainConfig.json` file:

| Option       |  Type  | Description                                                                                    |
| ------------ | :----: | ---------------------------------------------------------------------------------------------- |
| domain       | string | Define the application domain URI                                                              |
| clientID     | string | The identifier of the application                                                              |
| clientSecret | string | The secret used to identify the application                                                    |
| scope        | string | The scope of the application, by default `openid email profile`                                |
| api          | object | This section contains a `clientID` and `clientSecret` which can be used to fetch the auth0 API |

The auth0 implementation in SLS will associate the `Roles` from the auth0 application with the `Profile` in the SLS configuration.

When an user logged in SLS, a request is sent to the auth0 API. This behavior needs the existance of a `Machine to Machine` application on auth0. If this application is not the main one, the associated `clientID` and `clientSecret` can be set with the `api` section in the `auth0` configuration.

### keycloak

This provider can be configured with the `keycloak` section in the `mainConfig.json` file:

| Option        |  Type   | Description                                                    |
| ------------- | :-----: | -------------------------------------------------------------- |
| authServerURL | string  | The URL of the KeyCloak server                                 |
| clientID      | string  | The identifier of the application                              |
| clientSecret  | string  | The secret used to identify the application                    |
| publicClient  | boolean | True if the KeyCloak instance `Access Type` is set to `public` |
| realm         | string  | The identifier of the KeyCloak instance realm                  |

### local

This provider used the content of the `config/users/users.json` file to manage users.

An example of this file can be found in `config_templates/users/users.json.default`.

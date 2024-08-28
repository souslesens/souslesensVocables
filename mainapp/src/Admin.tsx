import * as React from "react";
import * as Mui from "@mui/material";

import { SRD, RD, loading, failure, success } from "srd";

import { Config, getConfig } from "./Config";
import { Database, getDatabases } from "./Database";
import { Log, getLogs, getLogFiles } from "./Log";
import { getEnabledPlugins, PluginOptionType, readConfig, readRepositories, RepositoryType } from "./Plugins";
import { Profile, getProfiles } from "./Profile";
import { ServerSource, getSources, getIndices, getGraphs, getMe } from "./Source";
import { User, getUsers, newUser } from "./User";
import { identity } from "./Utils";

import { ConfigForm } from "./Component/ConfigForm";
import { DatabasesTable } from "./Component/DatabasesTable";
import { LogsTable } from "./Component/LogsTable";
import { PluginsForm } from "./Component/PluginsForm";
import { ProfilesTable } from "./Component/ProfilesTable";
import { SourcesTable } from "./Component/SourcesTable";
import { UsersTable } from "./Component/UsersTable";

type Model = {
    users: RD<string, User[]>;
    profiles: RD<string, Profile[]>;
    sources: RD<string, ServerSource[]>;
    indices: RD<string, string[]>;
    graphs: RD<string, string[]>;
    me: RD<string>;
    databases: RD<Database[]>;
    logfiles: RD<string, string | boolean>[];
    logs: RD<string, Log[]>;
    config: RD<string, Config>;
    isModalOpen: boolean;
    currentEditionTab: EditionTab;
    dialog: object | null;
    pluginsConfig: RD<string, PluginOptionType[]>;
    pluginsenabled: RD<string[]>;
    repositories: RD<string, RepositoryType[]>;
};

type EditionTab = "settings" | "users" | "profiles" | "sources" | "databases" | "plugins" | "logs";

type UpadtedFieldPayload = { id: string; fieldName: string; newValue: string };

const initialModel: Model = {
    users: loading(),
    profiles: loading(),
    sources: loading(),
    indices: loading(),
    graphs: loading(),
    me: loading(),
    databases: loading(),
    logs: loading(),
    config: loading(),
    isModalOpen: false,
    currentEditionTab: "sources",
    dialog: null,
    pluginsConfig: loading(),
    pluginsEnabled: loading(),
    repositories: loading(),
};

const ModelContext = React.createContext<{ model: Model; updateModel: React.Dispatch<Msg> } | null>(null);

function useModel() {
    const modelContext = React.useContext(ModelContext);
    if (modelContext === null) {
        throw new Error("I can't initialize model and updateModel for some reason");
    }
    return modelContext;
}

type Msg =
    | { type: "PluginRepositoriesDialogModal"; payload: {} }
    | { type: "ServerRespondedWithUsers"; payload: RD<string, User[]> }
    | { type: "ServerRespondedWithProfiles"; payload: RD<string, Profile[]> }
    | { type: "ServerRespondedWithSources"; payload: RD<string, ServerSource[]> }
    | { type: "ServerRespondedWithIndices"; payload: RD<string, string[]> }
    | { type: "ServerRespondedWithGraphs"; payload: RD<string, string[]> }
    | { type: "ServerRespondedWithMe"; payload: RD<string> }
    | { type: "ServerRespondedWithConfig"; payload: RD<string, Config> }
    | { type: "ServerRespondedWithDatabases"; payload: RD<Database[]> }
    | { type: "ServerRespondedWithLogs"; payload: RD<string, Log[]> }
    | { type: "ServerRespondedWithLogFiles"; payload: RD<string, string | boolean>[] }
    | { type: "ServerRespondedWithPluginsConfig"; payload: RD<string, PluginOptionType[]> }
    | { type: "ServerRespondedWithPluginsEnabled"; payload: RD<string[]> }
    | { type: "ServerRespondedWithRepositories"; payload: RD<string, RepositoryType[]> }
    | { type: "UserUpdatedField"; payload: UpadtedFieldPayload }
    | { type: "UserClickedSaveChanges"; payload: {} }
    | { type: "UserChangedModalState"; payload: boolean }
    | { type: "UserClickedAddUser"; payload: string }
    | { type: "UserClickedNewTab"; payload: number };

function update(model: Model, msg: Msg): Model {
    const unwrappedUsers: User[] = SRD.unwrap([], identity, model.users);
    switch (msg.type) {
        case "PluginRepositoriesDialogModal":
            return { ...model, dialog: msg.payload };

        case "ServerRespondedWithUsers":
            return { ...model, users: msg.payload };

        case "ServerRespondedWithProfiles":
            return { ...model, profiles: msg.payload };

        case "ServerRespondedWithIndices":
            return { ...model, indices: msg.payload };

        case "ServerRespondedWithGraphs":
            return { ...model, graphs: msg.payload };

        case "ServerRespondedWithMe":
            return { ...model, me: msg.payload };

        case "ServerRespondedWithSources":
            return { ...model, sources: msg.payload };

        case "ServerRespondedWithConfig":
            return { ...model, config: msg.payload };

        case "ServerRespondedWithDatabases":
            return { ...model, databases: msg.payload };

        case "ServerRespondedWithLogs":
            return { ...model, logs: msg.payload };

        case "ServerRespondedWithLogFiles":
            return { ...model, logfiles: msg.payload };

        case "ServerRespondedWithPluginsConfig":
            return { ...model, pluginsConfig: msg.payload };

        case "ServerRespondedWithPluginsEnabled":
            return { ...model, pluginsEnabled: msg.payload };

        case "ServerRespondedWithRepositories":
            return { ...model, repositories: msg.payload };

        case "UserClickedSaveChanges":
            return { ...model, isModalOpen: false };

        case "UserClickedAddUser":
            return { ...model, users: SRD.of([...unwrappedUsers, newUser(msg.payload)]) };

        case "UserUpdatedField": {
            const fieldToUpdate = msg.payload.fieldName;
            const updatedUsers = unwrappedUsers.map((u) => (u.id === msg.payload.id ? { ...u, [fieldToUpdate]: msg.payload.newValue } : u));
            return { ...model, users: SRD.of(updatedUsers) };
        }

        case "UserClickedNewTab":
            const params = new URLSearchParams(document.location.search);
            params.set("tab", msg.payload);
            // Insert or replace the tab key in the URL
            window.history.replaceState(null, "", `?${params.toString()}`);

            return { ...model, currentEditionTab: msg.payload };

        default:
            return model;
    }
}

const Admin = () => {
    const [model, updateModel] = React.useReducer(update, initialModel);

    React.useEffect(() => {
        const params = new URLSearchParams(document.location.search);
        if (params.has("tab")) {
            model.currentEditionTab = params.get("tab");
        }
    }, []);

    React.useEffect(() => {
        Promise.all([getMe(), getSources(), getIndices(), getGraphs(), getProfiles(), getUsers(), getConfig(), getDatabases(), getLogFiles(), readConfig(), getEnabledPlugins(), readRepositories()])
            .then(([me, sources, indices, graphs, profiles, users, config, databases, logs, pluginsConfig, pluginsEnabled, repositories]) => {
                updateModel({ type: "ServerRespondedWithMe", payload: success(me) });
                updateModel({ type: "ServerRespondedWithSources", payload: success(sources) });
                updateModel({ type: "ServerRespondedWithIndices", payload: success(indices) });
                updateModel({ type: "ServerRespondedWithGraphs", payload: success(graphs) });
                updateModel({ type: "ServerRespondedWithProfiles", payload: success(profiles) });
                updateModel({ type: "ServerRespondedWithUsers", payload: success(users) });
                updateModel({ type: "ServerRespondedWithConfig", payload: success(config) });
                updateModel({ type: "ServerRespondedWithDatabases", payload: success(databases) });
                updateModel({ type: "ServerRespondedWithLogFiles", payload: success(logs) });
                updateModel({ type: "ServerRespondedWithPluginsConfig", payload: success(pluginsConfig) });
                updateModel({ type: "ServerRespondedWithPluginsEnabled", payload: success(pluginsEnabled) });
                updateModel({ type: "ServerRespondedWithRepositories", payload: success(repositories) });
            })
            .catch((error) => {
                updateModel({ type: "ServerRespondedWithMe", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithSources", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithIndices", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithGraphs", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithProfiles", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithUsers", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithConfig", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithDatabases", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithLogFiles", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithPluginsConfig", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithPluginsEnabled", payload: failure(error.message) });
                updateModel({ type: "ServerRespondedWithRepositories", payload: failure(error.message) });
            });
    }, []);

    return (
        <ModelContext.Provider value={{ model, updateModel }}>
            <Mui.Box sx={{ bgcolor: "Background.paper", borderBottom: 1, borderColor: "divider" }}>
                <Mui.Tabs
                    onChange={(event: React.SyntheticEvent, newValue: string) => updateModel({ type: "UserClickedNewTab", payload: newValue })}
                    value={model.currentEditionTab}
                    centered
                >
                    <Mui.Tab label="Settings" value="settings" />
                    <Mui.Tab label="Users" value="users" />
                    <Mui.Tab label="Profiles" value="profiles" />
                    <Mui.Tab label="Sources" value="sources" />
                    <Mui.Tab label="Databases" value="databases" />
                    <Mui.Tab label="Plugins" value="plugins" />
                    <Mui.Tab label="Logs" value="logs" />
                </Mui.Tabs>
            </Mui.Box>
            <Dispatcher model={model} />
        </ModelContext.Provider>
    );
};

const Dispatcher = (props: { model: Model }) => {
    switch (props.model.currentEditionTab) {
        case "settings":
            return <ConfigForm />;
        case "users":
            return <UsersTable />;
        case "profiles":
            return <ProfilesTable />;
        case "sources":
            return <SourcesTable />;
        case "databases":
            return <DatabasesTable />;
        case "plugins":
            return <PluginsForm />;
        case "logs":
            return <LogsTable />;
        default:
            return <div>Problem</div>;
    }
};

export default Admin;

export { Msg, useModel };

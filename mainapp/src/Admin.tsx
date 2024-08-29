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
    logFiles: RD<string, string | boolean>[];
    logs: RD<string, Log[]>;
    config: RD<string, Config>;
    isModalOpen: boolean;
    currentEditionTab: EditionTab;
    dialog: object | null;
    pluginsConfig: RD<string, PluginOptionType[]>;
    pluginsEnabled: RD<string[]>;
    repositories: RD<string, RepositoryType[]>;
};

type Msg =
    | { type: "config"; payload: RD<string, Config> }
    | { type: "currentEditionTab"; payload: number }
    | { type: "databases"; payload: RD<Database[]> }
    | { type: "dialog"; payload: {} }
    | { type: "graphs"; payload: RD<string, string[]> }
    | { type: "indices"; payload: RD<string, string[]> }
    | { type: "logFiles"; payload: RD<string, string | boolean>[] }
    | { type: "logs"; payload: RD<string, Log[]> }
    | { type: "me"; payload: RD<string> }
    | { type: "pluginsConfig"; payload: RD<string, PluginOptionType[]> }
    | { type: "pluginsEnabled"; payload: RD<string[]> }
    | { type: "profiles"; payload: RD<string, Profile[]> }
    | { type: "repositories"; payload: RD<string, RepositoryType[]> }
    | { type: "sources"; payload: RD<string, ServerSource[]> }
    | { type: "users"; payload: RD<string, User[]> };

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
    logFiles: loading(),
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

function update(model: Model, msg: Msg): Model {
    const unwrappedUsers: User[] = SRD.unwrap([], identity, model.users);

    if (msg.type === "currentEditionTab") {
        const params = new URLSearchParams(document.location.search);
        params.set("tab", msg.payload);
        // Insert or replace the tab key in the URL
        window.history.replaceState(null, "", `?${params.toString()}`);
    }

    return { ...model, [msg.type]: msg.payload };
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
                updateModel({ type: "me", payload: success(me) });
                updateModel({ type: "sources", payload: success(sources) });
                updateModel({ type: "indices", payload: success(indices) });
                updateModel({ type: "graphs", payload: success(graphs) });
                updateModel({ type: "profiles", payload: success(profiles) });
                updateModel({ type: "users", payload: success(users) });
                updateModel({ type: "config", payload: success(config) });
                updateModel({ type: "databases", payload: success(databases) });
                updateModel({ type: "logFiles", payload: success(logs) });
                updateModel({ type: "pluginsConfig", payload: success(pluginsConfig) });
                updateModel({ type: "pluginsEnabled", payload: success(pluginsEnabled) });
                updateModel({ type: "repositories", payload: success(repositories) });
            })
            .catch((error) => {
                updateModel({ type: "me", payload: failure(error.message) });
                updateModel({ type: "sources", payload: failure(error.message) });
                updateModel({ type: "indices", payload: failure(error.message) });
                updateModel({ type: "graphs", payload: failure(error.message) });
                updateModel({ type: "profiles", payload: failure(error.message) });
                updateModel({ type: "users", payload: failure(error.message) });
                updateModel({ type: "config", payload: failure(error.message) });
                updateModel({ type: "databases", payload: failure(error.message) });
                updateModel({ type: "logFiles", payload: failure(error.message) });
                updateModel({ type: "pluginsConfig", payload: failure(error.message) });
                updateModel({ type: "pluginsEnabled", payload: failure(error.message) });
                updateModel({ type: "repositories", payload: failure(error.message) });
            });
    }, []);

    return (
        <ModelContext.Provider value={{ model, updateModel }}>
            <Mui.Box sx={{ bgcolor: "Background.paper", borderBottom: 1, borderColor: "divider" }}>
                <Mui.Tabs onChange={(event: React.SyntheticEvent, newValue: string) => updateModel({ type: "currentEditionTab", payload: newValue })} value={model.currentEditionTab} centered>
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

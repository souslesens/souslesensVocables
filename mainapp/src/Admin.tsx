import { createContext, Dispatch, useContext, useReducer, useEffect } from "react";
import { Box, Tabs, Tab } from "@mui/material";

import { RD, loading, failure, success } from "srd";

import { ConfigType, getConfig } from "./Config";
import { Database, getDatabases } from "./Database";
import { Log, LogFiles, getLogFiles } from "./Log";
import { getEnabledPlugins, PluginOptionType, readConfig, readRepositories, RepositoryType } from "./Plugins";
import { Profile, getProfiles } from "./Profile";
import { ServerSource, getSources, getIndices, getGraphs, getMe, GraphInfo } from "./Source";
import { User, getUsers } from "./User";

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
    graphs: RD<string, GraphInfo[]>;
    me: RD<string, string>;
    databases: RD<string, Database[]>;
    logFiles: RD<string, LogFiles>;
    logs: RD<string, Log[]>;
    config: RD<string, ConfigType>;
    isModalOpen: boolean;
    currentEditionTab: EditionTab;
    pluginsConfig: RD<string, Record<string, PluginOptionType>>;
    pluginsEnabled: RD<string, Array<{ name: string }>>;
    repositories: RD<string, Record<string, RepositoryType>>;
};

export type Msg =
    | { type: "config"; payload: RD<string, ConfigType> }
    | { type: "currentEditionTab"; payload: EditionTab }
    | { type: "databases"; payload: RD<string, Database[]> }
    | { type: "graphs"; payload: RD<string, GraphInfo[]> }
    | { type: "indices"; payload: RD<string, string[]> }
    | { type: "logFiles"; payload: RD<string, LogFiles> }
    | { type: "logs"; payload: RD<string, Log[]> }
    | { type: "me"; payload: RD<string, string> }
    | { type: "pluginsConfig"; payload: RD<string, Record<string, PluginOptionType>> }
    | { type: "pluginsEnabled"; payload: RD<string, Array<{ name: string }>> }
    | { type: "profiles"; payload: RD<string, Profile[]> }
    | { type: "repositories"; payload: RD<string, Record<string, RepositoryType>> }
    | { type: "sources"; payload: RD<string, ServerSource[]> }
    | { type: "users"; payload: RD<string, User[]> };

type EditionTab = "settings" | "users" | "profiles" | "sources" | "databases" | "plugins" | "logs";

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
    pluginsConfig: loading(),
    pluginsEnabled: loading(),
    repositories: loading(),
};

const ModelContext = createContext<{ model: Model; updateModel: Dispatch<Msg> } | null>(null);

export function useModel() {
    const modelContext = useContext(ModelContext);
    if (modelContext === null) {
        throw new Error("I can't initialize model and updateModel for some reason");
    }
    return modelContext;
}

function update(model: Model, msg: Msg): Model {
    if (msg.type === "currentEditionTab") {
        const params = new URLSearchParams(document.location.search);
        params.set("tab", msg.payload.toString());
        // Insert or replace the tab key in the URL
        window.history.replaceState(null, "", `?${params.toString()}`);
    }

    return { ...model, [msg.type]: msg.payload };
}

const Admin = () => {
    const [model, updateModel] = useReducer(update, initialModel);

    useEffect(() => {
        const params = new URLSearchParams(document.location.search);
        if (params.has("tab")) {
            const p = params.get("tab") as EditionTab | null;
            model.currentEditionTab = p ?? "settings";
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
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
            .catch((error: { message: string }) => {
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
            <Box sx={{ bgcolor: "Background.paper", borderBottom: 1, borderColor: "divider" }}>
                <Tabs onChange={(_event, newValue: string) => updateModel({ type: "currentEditionTab", payload: newValue as EditionTab })} value={model.currentEditionTab} centered>
                    <Tab label="Settings" value="settings" />
                    <Tab label="Users" value="users" />
                    <Tab label="Profiles" value="profiles" />
                    <Tab label="Sources" value="sources" />
                    <Tab label="Databases" value="databases" />
                    <Tab label="Plugins" value="plugins" />
                    <Tab label="Logs" value="logs" />
                </Tabs>
            </Box>
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

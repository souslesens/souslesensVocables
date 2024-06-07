import * as React from "react";
import { Tabs, Tab } from "@mui/material";
import { SRD, RD, loading, failure, success } from "srd";
import { User, getUsers, newUser } from "./User";
import { getProfiles } from "./Profile";
import Box from "@mui/material/Box";
import { identity } from "./Utils";
import { ProfilesTable } from "./Component/ProfilesTable";
import { Profile } from "./Profile";
import { SourcesTable } from "./Component/SourcesTable";
import { UsersTable } from "./Component/UsersTable";
import { LogsTable } from "./Component/LogsTable";
import { DatabasesTable } from "./Component/DatabasesTable";
import { ServerSource, getSources, getIndices, getGraphs, getMe } from "./Source";
import { Config, getConfig } from "./Config";
import { Database, getDatabases } from "./Database";
import { Log, getLogs, getLogFiles } from "./Log";

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
};

type EditionTab = "UsersEdition" | "ProfilesEdition" | "SourcesEdition" | "DatabaseManagement" | "Logs";

const editionTabToNumber = (editionTab: EditionTab) => {
    switch (editionTab) {
        case "UsersEdition":
            return 0;
        case "ProfilesEdition":
            return 1;
        case "SourcesEdition":
            return 2;
        case "DatabaseManagement":
            return 3;
        case "Logs":
            return 4;
        default:
            0;
    }
};

const editionTabToString = (editionTab: number): EditionTab => {
    switch (editionTab) {
        case 0:
            return "UsersEdition";
        case 1:
            return "ProfilesEdition";
        case 2:
            return "SourcesEdition";
        case 3:
            return "DatabaseManagement";
        case 4:
            return "Logs";
        default:
            return "UsersEdition";
    }
};

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
    currentEditionTab: "SourcesEdition",
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
    | { type: "UserUpdatedField"; payload: UpadtedFieldPayload }
    | { type: "UserClickedSaveChanges"; payload: {} }
    | { type: "UserChangedModalState"; payload: boolean }
    | { type: "UserClickedAddUser"; payload: string }
    | { type: "UserClickedNewTab"; payload: number };

function update(model: Model, msg: Msg): Model {
    const unwrappedUsers: User[] = SRD.unwrap([], identity, model.users);
    switch (msg.type) {
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

            return { ...model, currentEditionTab: editionTabToString(msg.payload) };

        default:
            return model;
    }
}

const Admin = () => {
    const [model, updateModel] = React.useReducer(update, initialModel);

    React.useEffect(() => {
        const params = new URLSearchParams(document.location.search);
        if (params.has("tab")) {
            const tabIndex = parseInt(params.get("tab"));
            model.currentEditionTab = editionTabToString(tabIndex);
        }
    }, []);

    React.useEffect(() => {
        Promise.all([getMe(), getSources(), getIndices(), getGraphs(), getProfiles(), getUsers(), getConfig(), getDatabases(), getLogFiles()])
            .then(([me, sources, indices, graphs, profiles, users, config, databases, logs]) => {
                updateModel({ type: "ServerRespondedWithMe", payload: success(me) });
                updateModel({ type: "ServerRespondedWithSources", payload: success(sources) });
                updateModel({ type: "ServerRespondedWithIndices", payload: success(indices) });
                updateModel({ type: "ServerRespondedWithGraphs", payload: success(graphs) });
                updateModel({ type: "ServerRespondedWithProfiles", payload: success(profiles) });
                updateModel({ type: "ServerRespondedWithUsers", payload: success(users) });
                updateModel({ type: "ServerRespondedWithConfig", payload: success(config) });
                updateModel({ type: "ServerRespondedWithDatabases", payload: success(databases) });
                updateModel({ type: "ServerRespondedWithLogFiles", payload: success(logs) });
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
            });
    }, []);

    return (
        <ModelContext.Provider value={{ model, updateModel }}>
            <Box sx={{ width: "95%", bgcolor: "Background.paper" }}>
                <Tabs
                    onChange={(event: React.SyntheticEvent, newValue: number) => updateModel({ type: "UserClickedNewTab", payload: newValue })}
                    value={editionTabToNumber(model.currentEditionTab)}
                    centered
                >
                    <Tab label="Users" />
                    <Tab label="Profiles" />
                    <Tab label="Sources" />
                    <Tab label="Databases" />
                    <Tab label="Logs" />
                </Tabs>
            </Box>
            <Dispatcher model={model} />
        </ModelContext.Provider>
    );
};

const Dispatcher = (props: { model: Model }) => {
    switch (props.model.currentEditionTab) {
        case "UsersEdition":
            return <UsersTable />;
        case "ProfilesEdition":
            return <ProfilesTable />;
        case "SourcesEdition":
            return <SourcesTable />;
        case "DatabaseManagement":
            return <DatabasesTable />;
        case "Logs":
            return <LogsTable />;
        default:
            return <div>Problem</div>;
    }
};

export default Admin;

export { Msg, useModel };

import { useReducer, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { RD, loading, failure, success } from "srd";

import { ModelContext, Msg, EditionTab } from "../Admin";
import { LogsTable } from "./LogsTable";
import { LogFiles, getLogFiles } from "../Log";

type Model = {
    users: RD<string, never[]>;
    profiles: RD<string, never[]>;
    sources: RD<string, never[]>;
    indices: RD<string, never[]>;
    graphs: RD<string, never[]>;
    me: RD<string, never>;
    databases: RD<string, never[]>;
    logFiles: RD<string, LogFiles>;
    logs: RD<string, never[]>;
    config: RD<string, never>;
    isModalOpen: boolean;
    currentEditionTab: EditionTab;
    pluginsConfig: RD<string, never>;
    pluginsEnabled: RD<string, never[]>;
    repositories: RD<string, never>;
    profilesInitialFilter: string;
};

const initialModel: Model = {
    users: loading(),
    profiles: loading(),
    sources: loading(),
    indices: loading(),
    graphs: loading(),
    me: loading(),
    databases: loading(),
    logFiles: loading(),
    logs: loading(),
    config: loading(),
    isModalOpen: false,
    currentEditionTab: "logs",
    pluginsConfig: loading(),
    pluginsEnabled: loading(),
    repositories: loading(),
    profilesInitialFilter: "",
};

function update(model: Model, msg: Msg): Model {
    if (msg.type === "currentEditionTab") {
        return { ...model, currentEditionTab: msg.payload.tab, profilesInitialFilter: msg.payload.initialFilter };
    }

    return { ...model, [msg.type]: msg.payload };
}

function LogsTableModalWrapper() {
    const [model, updateModel] = useReducer(update, initialModel);

    useEffect(() => {
        getLogFiles()
            .then((data) => {
                updateModel({ type: "logFiles", payload: success(data) });
            })
            .catch((error: { message: string }) => {
                updateModel({ type: "logFiles", payload: failure(error.message) });
            });
    }, []);

    return (
        <ModelContext.Provider value={{ model, updateModel }}>
            <LogsTable />
        </ModelContext.Provider>
    );
}

export const LogsTableModal = () => {
    return <LogsTableModalWrapper />;
};

declare global {
    interface Window {
        LogsTableModal: {
            createApp: () => void;
        };
    }
}

window.LogsTableModal = {
    createApp: () => {
        const container = document.getElementById("mount-logs-table-here");

        const root = createRoot(container!);
        root.render(<LogsTableModal />);
        return root;
    },
};

import { useReducer, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { RD, loading, failure, success } from "srd";

import { ModelContext } from "../Admin";
import { LogsTable } from "./LogsTable";
import { LogFiles, getLogFiles } from "../Log";

type Model = {
    logFiles: RD<string, LogFiles>;
};

type Msg = { type: "logFiles"; payload: RD<string, LogFiles> };

const initialModel: Model = {
    logFiles: loading(),
};

function update(model: Model, msg: Msg): Model {
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

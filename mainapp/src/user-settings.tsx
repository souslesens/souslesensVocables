import { createRoot } from "react-dom/client";
import { useEffect, useState, SyntheticEvent } from "react";

import { Alert, Snackbar, Stack, Tab, Tabs } from "@mui/material";

import { UserInfo } from "./Component/UserInfo";
import { UserSources } from "./Component/UserSources";
import UsersDataManagement from "./users-data-management";

declare global {
    interface Window {
        UserSettings: {
            createApp: () => void;
        };
    }
}

enum Sections {
    Settings = "settings",
    Sources = "sources",
    UsersData = "usersData",
}

export type Severity = "error" | "info" | "success" | "warning";

export type SnackInfo = {
    isOpen: boolean;
    message: string;
    severity: Severity;
};

interface DispatcherProps {
    handleSnackbar: (msg: string, severity?: Severity) => void;
    selectedTab: Sections.Settings | Sections.Sources | Sections.UsersData;
}

const Dispatcher = ({ handleSnackbar, selectedTab }: DispatcherProps) => {
    switch (selectedTab) {
        case Sections.Settings:
            return <UserInfo handleSnackbar={handleSnackbar} />;
        case Sections.Sources:
            return <UserSources handleSnackbar={handleSnackbar} />;
        case Sections.UsersData:
            return <UsersDataManagement />;
    }
};

export const initialSnackInfo: SnackInfo = { isOpen: false, message: "", severity: "success" };

export default function UserSettings() {
    const [selectedTab, setSelectedTab] = useState<Sections>(Sections.Sources);
    const [snackInfo, setSnackInfo] = useState<SnackInfo>(initialSnackInfo);

    useEffect(() => {
        const params = new URLSearchParams(document.location.search);
        const tabParam = params.get("tab");
        if (tabParam && Object.values(Sections).includes(tabParam as Sections)) {
            setSelectedTab(tabParam as Sections);
        }
    }, []);

    const handleSnackbar = (message: string, severity: Severity = "success") => {
        setSnackInfo({ isOpen: true, message: message, severity: severity });
    };

    const onSnackbarClose = (_event: SyntheticEvent | Event, reason?: string) => {
        if (reason !== "clickaway") {
            setSnackInfo({ ...snackInfo, isOpen: false });
        }
    };

    return (
        <Stack>
            <Snackbar autoHideDuration={2000} open={snackInfo.isOpen} onClose={onSnackbarClose}>
                <Alert onClose={onSnackbarClose} severity={snackInfo.severity} sx={{ width: "100%" }}>
                    {snackInfo.message}
                </Alert>
            </Snackbar>
            <Tabs
                centered
                onChange={(_event, newValue: Sections) => {
                    setSelectedTab(newValue);
                    const params = new URLSearchParams(document.location.search);
                    params.set("tab", newValue);
                    window.history.replaceState(null, "", `?${params.toString()}`);
                }}
                sx={{ bgcolor: "Background.paper", borderBottom: 1, borderColor: "divider" }}
                value={selectedTab}
            >
                <Tab label="API token" value={Sections.Settings} />
                <Tab label="Sources" value={Sections.Sources} />
                <Tab label="Users Data" value={Sections.UsersData} />
            </Tabs>
            <Dispatcher handleSnackbar={handleSnackbar} selectedTab={selectedTab} />
        </Stack>
    );
}

window.UserSettings.createApp = function createApp() {
    const container = document.getElementById("mount-user-settings-here");

    const root = createRoot(container!);
    root.render(<UserSettings />);
    return root.unmount.bind(root);
};

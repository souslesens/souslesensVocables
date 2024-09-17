import { createRoot } from "react-dom/client";
import { useEffect, useState, SyntheticEvent } from "react";

import { Alert, Snackbar, Stack, Tab, Tabs } from "@mui/material";

import { UserProfile } from "./Component/UserProfile";
import { UserSources } from "./Component/UserSources";

declare global {
    interface Window {
        UserManagement: {
            createApp: () => void;
        };
    }
}

enum Sections {
    Profile = "profile",
    Sources = "sources",
}

export type Severity = "error" | "info" | "success" | "warning";

type SnackInfo = {
    isOpen: boolean;
    message: string;
    severity: Severity;
};

interface DispatcherProps {
    handleSnackbar: (msg: string, severity?: Severity) => void;
    selectedTab: string;
}

const Dispatcher = ({ handleSnackbar, selectedTab }: DispatcherProps) => {
    switch (selectedTab) {
        case Sections.Profile:
            return <UserProfile handleSnackbar={handleSnackbar} />;
        case Sections.Sources:
            return <UserSources handleSnackbar={handleSnackbar} />;
    }
};

const initialSnackInfo: SnackInfo = { isOpen: false, message: "", severity: "success" };

export default function UserManagement() {
    const [selectedTab, setSelectedTab] = useState<Sections>(Sections.Sources);
    const [snackInfo, setSnackInfo] = useState<SnackInfo>(initialSnackInfo);

    useEffect(() => {
        const params = new URLSearchParams(document.location.search);
        const tab = params.get("tab") as Sections;
        if (tab) {
            setSelectedTab(tab);
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
                <Tab label="Profile" value={Sections.Profile} />
                <Tab label="Sources" value={Sections.Sources} />
            </Tabs>
            <Dispatcher handleSnackbar={handleSnackbar} selectedTab={selectedTab} />
        </Stack>
    );
}

window.UserManagement.createApp = function createApp() {
    const container = document.getElementById("mount-user-management-here");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const root = createRoot(container!);
    root.render(<UserManagement />);
    return root.unmount.bind(root);
};

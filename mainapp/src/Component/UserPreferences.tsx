import { useEffect } from "react";

import { Paper, Stack } from "@mui/material";

declare global {
    interface Window {
        UserPreferences: {
            showPreferencesTree: (treeDivId: string, parametersDivId: string) => void;
        };
    }
}

/** The tree is a jstree drawn by the vocables module UserPreferences, React only hosts its two divs. */
export function UserPreferences() {
    useEffect(() => {
        window.UserPreferences.showPreferencesTree("userPreferences_treeDiv", "userPreferences_parametersDiv");
    }, []);

    return (
        <Stack direction="row" spacing={2} sx={{ m: 4 }}>
            <Paper sx={{ p: 2, minWidth: 300 }}>
                <div id="userPreferences_treeDiv"></div>
            </Paper>
            <Paper sx={{ p: 2, flexGrow: 1 }}>
                <div id="userPreferences_parametersDiv"></div>
            </Paper>
        </Stack>
    );
}

import { createRoot } from "react-dom/client";
import { useState, useEffect, MouseEvent } from "react";

import { Button, IconButton, InputAdornment, OutlinedInput, FormControl, Stack, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

import { fetchMe } from "./Utils";

declare global {
    interface Window {
        UserManagement: {
            createApp: () => void;
        };
    }
};

export default function UserManagement() {
    const [currentUserToken, setCurrentUserToken] = useState<string>("");
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        const fetchUser = async () => {
            const response = await fetchMe();
            setCurrentUserToken(response.user.token);
        };
        void fetchUser();
    }, []);

    const postToken = async () => {
        const response = await fetch("/api/v1/users/token", { method: "post" });
        const json = (await response.json()) as { token: string };
        return json.token;
    };

    const handleUpdateToken = async (_event: MouseEvent<HTMLButtonElement>) => {
        setCurrentUserToken(await postToken());
    };

    const handleCopyToken = async () => {
        setCopied(true);
        void navigator.clipboard.writeText(currentUserToken);
        await new Promise((r) => setTimeout(r, 2000));
        setCopied(false);
    };

    return (
        <Stack spacing={{ xs: 2 }} sx={{ mx: 12, my: 4 }}>
            <Typography variant="h4">Manage API key</Typography>
            <Stack direction="row" spacing={{ xs: 1 }} sx={{ m: 4 }} useFlexGap>
                <FormControl variant="outlined">
                    <OutlinedInput
                        id="outlined-adornment-token"
                        endAdornment={
                            <InputAdornment position="end">
                                <IconButton aria-label="Copy token in the clipboard" edge="end" onClick={handleCopyToken} sx={{ p: 2 }}>
                                    {copied ? <CheckIcon /> : <ContentCopyIcon />}
                                </IconButton>
                            </InputAdornment>
                        }
                        sx={{ width: 600 }}
                        value={currentUserToken}
                    />
                </FormControl>
                <Button aria-label="Renew" onClick={handleUpdateToken} sx={{ p: 2 }} variant="contained">
                    Renew
                </Button>
            </Stack>
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

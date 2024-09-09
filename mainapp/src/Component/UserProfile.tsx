import { useState, useEffect, MouseEvent } from "react";

import { Button, IconButton, InputAdornment, InputLabel, OutlinedInput, FormControl, Stack } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

import { fetchMe } from "../Utils";

type User = {
    login: string;
    token: string;
};

const UserProfile = (props: { handleSnackbar: void }) => {
    const { handleSnackbar } = props;

    const [currentUser, setCurrentUser] = useState<User>({ login: "", token: "" });
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            const response = await fetchMe();
            setCurrentUser({ login: response.user.login, token: response.user.token });
        })();
    }, []);

    const handleUpdateToken = async (_event: MouseEvent<HTMLButtonElement>) => {
        const response = await fetch("/api/v1/users/token", {
            body: JSON.stringify({ login: currentUser.login }),
            headers: { "Content-Type": "application/json" },
            method: "post",
        });
        const json = await response.json();

        if (response.status === 200) {
            setCurrentUser({ ...currentUser, token: json.token });
            handleSnackbar("The token have been renewed successfully");
        } else {
            handleSnackbar("An error occurs during renewal", "error");
        }
    };

    const handleCopyToken = async () => {
        setCopied(true);
        navigator.clipboard.writeText(currentUser.token);
        handleSnackbar("The token have been copied in the clipboard");
        await new Promise((r) => setTimeout(r, 2000));
        setCopied(false);
    };

    return (
        <Stack spacing={{ xs: 2 }} sx={{ m: 4 }}>
            <Stack direction="row" spacing={{ xs: 1 }} sx={{ m: 4 }} useFlexGap>
                <FormControl sx={{ flex: 1 }} variant="outlined">
                    <InputLabel htmlFor="outlined-adornment-token">API Key</InputLabel>
                    <OutlinedInput
                        endAdornment={
                            <InputAdornment position="end">
                                <IconButton aria-label="Copy token in the clipboard" edge="end" onClick={handleCopyToken} sx={{ p: 2 }}>
                                    {copied ? <CheckIcon /> : <ContentCopyIcon />}
                                </IconButton>
                            </InputAdornment>
                        }
                        id="outlined-adornment-token"
                        label="API Key"
                        value={currentUser.token}
                    />
                </FormControl>
                <Button aria-label="Renew" onClick={handleUpdateToken} variant="contained">
                    Renew
                </Button>
            </Stack>
        </Stack>
    );
};

export { UserProfile };

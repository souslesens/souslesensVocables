import { useState, useEffect, MouseEvent } from "react";

import { Button, IconButton, InputAdornment, InputLabel, OutlinedInput, FormControl, Stack } from "@mui/material";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { Severity } from "../user-settings";
import { fetchMe } from "../Utils";

type User = {
    login: string;
    token: string;
};

interface UserInfoProps {
    handleSnackbar: (msg: string, severity?: Severity) => void;
}

const UserInfo = ({ handleSnackbar }: UserInfoProps) => {
    const [currentUser, setCurrentUser] = useState<User>({ login: "", token: "" });
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        fetchMe()
            .then((response) => setCurrentUser({ login: response.user.login, token: response.user.token }))
            .catch((error) => console.error(error));
    }, []);

    const handleUpdateToken = async (_event: MouseEvent<HTMLButtonElement>) => {
        const response = await fetch("/api/v1/users/token", {
            body: JSON.stringify({ login: currentUser.login }),
            headers: { "Content-Type": "application/json" },
            method: "post",
        });
        const json = (await response.json()) as { status: number; token: string };

        if (response.status === 200) {
            setCurrentUser({ ...currentUser, token: json.token });
            handleSnackbar("The token have been renewed successfully");
        } else {
            handleSnackbar("An error occurs during renewal", "error");
        }
    };

    const handleCopyToken = async () => {
        setCopied(true);
        await navigator.clipboard.writeText(currentUser.token);
        handleSnackbar("The token have been copied in the clipboard");
        await new Promise((r) => setTimeout(r, 2000));
        setCopied(false);
    };

    return (
        <Stack spacing={{ xs: 2 }} sx={{ m: 4 }}>
            <Stack direction="column" spacing={{ xs: 1 }} sx={{ m: 4 }} useFlexGap>
                <Typography variant="body1" gutterBottom>
                    SousLeSens provide API routes with OpenAPI standards. A Swagger interface is available at <Link href="/api/v1">/api/v1</Link>. Most routes are intended to be used by SousLeSens
                    application, but some can be used outside SousLeSens.
                </Typography>

                <Typography variant="body1" gutterBottom>
                    Use the following token to authenticate (Bearer auth) and use the routes.
                </Typography>

                <Typography variant="body1" gutterBottom>
                    A more detailed documentation can be found at{" "}
                    <Link href="https://souslesens.github.io/souslesensVocables/api/index.html">https://souslesens.github.io/souslesensVocables/api/index.html</Link>.
                </Typography>
            </Stack>
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

export { UserInfo };

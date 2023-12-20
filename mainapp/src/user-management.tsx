import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";

import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

import { fetchMe } from "./Utils";

export default function UserManagenent() {
    const [currentUserToken, setCurrentUserToken] = useState<string>("");
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            const response = await fetchMe();
            setCurrentUserToken(response.user.token);
        })();
    }, []);

    const postToken = async () => {
        const response = await fetch("/api/v1/users/token", { method: "post" });
        const json = await response.json();
        return json.token;
    };

    const handleUpdateToken = async (_event: React.MouseEvent<HTMLButtonElement>) => {
        setCurrentUserToken(await postToken());
    };

    const handleCopyToken = async () => {
        setCopied(true);
        navigator.clipboard.writeText(currentUserToken);
        await new Promise((r) => setTimeout(r, 2000));
        setCopied(false);
    };

    return (
        <Stack className="p-3">
            <h4>Manage API key</h4>
            <InputGroup className="w-50">
                <Form.Control value={currentUserToken} placeholder="" aria-label="API key" aria-describedby="basic-addon" />
                <Button onClick={handleCopyToken} variant={copied ? "outline-success" : "outline-primary"} id="button-addon">
                    {copied ? <CheckIcon /> : <ContentCopyIcon />}
                </Button>
                <Button onClick={handleUpdateToken} variant="primary" id="button-addon">
                    Renew
                </Button>
            </InputGroup>
        </Stack>
    );
}

const container = document.getElementById("mount-user-management-here");
const root = createRoot(container!);
root.render(<UserManagenent />);

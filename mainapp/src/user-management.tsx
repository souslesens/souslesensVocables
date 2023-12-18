import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";

import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";

import { fetchMe } from "./Utils";

export default function UserManagenent() {
    const [currentUserToken, setCurrentUserToken] = useState<string>("");

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

    return (
        <Stack className="p-3">
            <h4>Manage API key</h4>
            <InputGroup className="w-50">
                <Form.Control value={currentUserToken} placeholder="" aria-label="API key" aria-describedby="basic-addon" />
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

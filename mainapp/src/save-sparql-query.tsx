import { createRoot } from "react-dom/client";
import { useEffect, useState, useRef, SyntheticEvent } from "react";

import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Alert, Snackbar, TextField } from "@mui/material";

import Yasgui from "@triply/yasgui";

declare global {
    interface Window {
        SPARQL_endpoint: {
            createSaveQueryApp: (sparqlServerUrl: string) => void;
        };
    }
}

type Props = {
    sparqlServerUrl: string;
};

export default function SaveSparqlQueryFormApp({ sparqlServerUrl }: Props) {
    const [open, setOpen] = useState(false);
    const [queryName, setQueryName] = useState("");
    const [queryComment, setQueryComment] = useState("");
    const [snackOpen, setSnackOpen] = useState(false);
    const [snackMessage, setSnackMessage] = useState("");
    const [snackError, setSnackError] = useState(false);

    const yasguiRef = useRef<Yasgui | null>(null);

    const toggleOpen = () => {
        setOpen(!open);
    };

    useEffect(() => {
        const htmlElem = document.getElementById("yasgui");
        if (htmlElem !== null) {
            const yasguiInstance = new Yasgui(htmlElem, {
                ...Yasgui.defaults,
                requestConfig: {
                    endpoint: `/api/v1/yasguiQuery?url=${sparqlServerUrl}&method=POST&t=${new Date().getTime()}`,
                },
                copyEndpointOnNewTab: false,
            });
            yasguiRef.current = yasguiInstance;
        }
    }, [sparqlServerUrl]);

    const handleSave = async () => {
        if (!yasguiRef.current) {
            return;
        }

        const query = yasguiRef.current?.getTab()?.getQuery() || "";

        if (!query || query.trim() === "") {
            return;
        }

        const payload = {
            data_type: "sparqlQuery",
            data_label: queryName,
            data_comment: queryComment,
            data_tool: "SPARQL",
            data_source: "",
            data_content: {
                sparqlQuery: query,
            },
            is_shared: false,
            shared_profiles: [],
            shared_users: [],
            readwrite: false,
        };

        try {
            const response = await fetch("/api/v1/users/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const result = (await response.json()) as { id: string | number };
                setSnackMessage(`Requête "${queryName}" sauvegardée avec succès ! (ID: ${result.id})`);
                setSnackError(false);
                setSnackOpen(true);
                setOpen(false);
                setQueryName("");
                setQueryComment("");
            } else {
                const errorData = (await response.json()) as { message: string };
                setSnackMessage(`Erreur: ${errorData.message}`);
                setSnackError(true);
                setSnackOpen(true);
            }
        } catch (error) {
            setSnackMessage(`Erreur de connexion: ${error instanceof Error ? error.message : String(error)}`);
            setSnackError(true);
            setSnackOpen(true);
        }
    };

    const handleSnackbarClose = (_event: SyntheticEvent | Event, reason?: string) => {
        if (reason === "clickaway") {
            return;
        }
        setSnackOpen(false);
        setSnackError(false);
    };

    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 400,
        bgcolor: "background.paper",
        borderRadius: "5px",
        boxShadow: 24,
        pt: 2,
        px: 4,
        pb: 3,
    };

    return (
        <>
            <Button variant="outlined" onClick={toggleOpen}>
                Save Query
            </Button>
            <div id="yasgui"></div>
            <Modal open={open} onClose={toggleOpen}>
                <Box
                    sx={{
                        ...style,
                        width: 500,
                    }}
                >
                    <Typography id="save-query-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
                        Save SPARQL Query
                    </Typography>

                    <TextField label="Query Name" value={queryName} onChange={(e) => setQueryName(e.target.value)} fullWidth margin="normal" required />

                    <TextField label="Description (optional)" value={queryComment} onChange={(e) => setQueryComment(e.target.value)} fullWidth multiline rows={3} margin="normal" />

                    <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                        <Button onClick={toggleOpen} variant="outlined">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} variant="contained" disabled={!queryName.trim() || !yasguiRef.current?.getTab()?.getQuery()?.trim()}>
                            Save
                        </Button>
                    </Box>
                </Box>
            </Modal>
            <Snackbar autoHideDuration={3000} open={snackOpen} onClose={handleSnackbarClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                <Alert onClose={handleSnackbarClose} severity={snackError ? "error" : "success"} sx={{ width: "100%" }}>
                    {snackMessage}
                </Alert>
            </Snackbar>
        </>
    );
}

window.SPARQL_endpoint.createSaveQueryApp = function createApp(sparqlServerUrl: string) {
    const container = document.getElementById("mount-save-sparql-query-app-here");
    const root = createRoot(container!);
    root.render(<SaveSparqlQueryFormApp sparqlServerUrl={sparqlServerUrl} />);
    return root.unmount.bind(root);
};

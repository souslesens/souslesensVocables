import { Done, Close, Cancel, Folder } from "@mui/icons-material";
import { Dialog, DialogTitle, DialogContent, Stack, Alert, LinearProgress, Typography, DialogActions, Button, Checkbox, FormControl, FormControlLabel } from "@mui/material";
import { VisuallyHiddenInput, fetchMe } from "../Utils";
import { ChangeEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { writeLog } from "../Log";
import { createRoot } from "react-dom/client";

declare global {
    interface Window {
        SearchUtil: {
            generateElasticIndex: (sourceName: string, options: Record<string, number>, callback: () => void) => void;
        };
        UI: {
            message: (text: string, status: boolean) => void;
        };
    }
}

interface UploadGraphModalProps {
    onClose: () => void;
    open: boolean;
    sourceName: string;
    indexAfterSuccess: boolean;
}

export function UploadGraphModal({ onClose, open, sourceName, indexAfterSuccess = false }: UploadGraphModalProps) {
    const [currentUser, setCurrentUser] = useState<{ login: string; token: string } | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [uploadfile, setUploadFile] = useState<File[]>([]);
    const [replaceGraph, setReplaceGraph] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState("");
    const cancelCurrentOperation = useRef(false);
    const [slsApiBaseUrl, setSlsApiBaseUrl] = useState<string>("");

    useEffect(() => {
        void fetchConfig();
        const fetchAll = async () => {
            const response = await fetchMe();
            setCurrentUser(response.user);
        };
        void fetchAll();
    }, []);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setUploadFile(filesList);
    };

    const fetchConfig = async () => {
        const response = await fetch("/api/v1/config");
        const json = (await response.json()) as { slsApi: { url: string } };
        const slsApi = json.slsApi;
        if (slsApi !== undefined) {
            if (slsApi.url) {
                // force presence of trailing /
                setSlsApiBaseUrl(json.slsApi.url.replace(/\/$/, "").concat("/"));
                return;
            }
        }
        setSlsApiBaseUrl("/");
    };

    const uploadSource = async (e: MouseEvent) => {
        e.preventDefault();
        if (!currentUser) {
            console.error("No user");
            setErrorMessage("No user");
            return;
        }

        if (!sourceName) {
            console.error("No current source");
            setErrorMessage("No current source");
            return;
        }

        await writeLog(currentUser.login, "GraphManagement", "upload", sourceName);

        try {
            // init progress bar
            setTransferPercent(0);
            cancelCurrentOperation.current = false;

            // get file
            const file = uploadfile[0];

            // get file size and chunk size
            const chunkSize = 10_000_000; // 10Mb
            const fileSize = file.size;

            // init values
            let chunkId = "";

            // iterate over file and send chunks to server
            for (let start = 0; start < fileSize; start += chunkSize) {
                // set percent for progress bar
                const percent = (start * 100) / fileSize;
                setTransferPercent(Math.min(95, Math.round(percent)));

                // slice file
                const end = start + chunkSize;
                const chunk = new File([file.slice(start, end)], file.name, { type: file.type });

                // last ?
                const lastChunk = start + chunkSize >= fileSize ? true : false;

                // build formData
                const formData = new FormData();
                Object.entries({
                    source: sourceName,
                    last: lastChunk,
                    identifier: chunkId,
                    clean: false,
                    replace: replaceGraph,
                    data: chunk,
                }).forEach(([key, value]) => {
                    formData.append(key, typeof value === "boolean" ? String(value) : value);
                });
                // if cancel button is pressed, remove uploaded file and return
                if (cancelCurrentOperation.current) {
                    formData.set("clean", String(true));
                    await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { Authorization: `Bearer ${currentUser.token}` }, body: formData });
                    return;
                }

                // POST data
                const res = await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { Authorization: `Bearer ${currentUser.token}` }, body: formData });
                if (res.status != 200) {
                    const message = (await res.json()) as { error?: string; detail?: string };
                    console.error(message);
                    setErrorMessage(message.error ?? message.detail ?? "Internal server error");
                    return;
                } else {
                    const json = (await res.json()) as { identifier: string };

                    // Set values for next iteration
                    chunkId = json.identifier;
                }
            }
            setTransferPercent(100);

            if (indexAfterSuccess) {
                try {
                    window.SearchUtil.generateElasticIndex(sourceName, { indexProperties: 1, indexNamedIndividuals: 1 }, () => {
                        window.UI.message(`${sourceName} was updated successfully`, true);
                    });
                } catch (error) {
                    console.error(error);
                    window.UI.message(`An error occurs during ${sourceName} update`, true);
                }
            }
        } catch (error) {
            console.error(error);
            setErrorMessage((error as Error).message);
        }
    };

    const handleCancelOperation = () => {
        cancelCurrentOperation.current = true;
        setTransferPercent(0);
        setUploadFile([]);
        setErrorMessage("");
        onClose();
    };

    return (
        <Dialog fullWidth={true} maxWidth="md" onClose={onClose} open={open} PaperProps={{ component: "form" }}>
            <DialogTitle id="contained-modal-title-vcenter">Uploading {sourceName}</DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
                <Stack spacing={2} useFlexGap>
                    {errorMessage ? (
                        <Alert variant="filled" severity="error">
                            {errorMessage}
                        </Alert>
                    ) : null}
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Stack spacing={1} direction="row" useFlexGap>
                            <Button color="info" component="label" disabled={transferPercent > 0} fullWidth role={undefined} startIcon={<Folder />} tabIndex={-1} variant="outlined">
                                {uploadfile.length === 1 ? uploadfile[0].name : "Select a file to upload…"}
                                <VisuallyHiddenInput id="formUploadGraph" onChange={handleFileChange} type="file" />
                            </Button>
                        </Stack>
                        <FormControl fullWidth>
                            <FormControlLabel
                                id={`upload-switch-${sourceName}`}
                                control={
                                    <Checkbox
                                        checked={replaceGraph}
                                        disabled={transferPercent > 0}
                                        onChange={(event) => {
                                            setReplaceGraph(event.currentTarget.checked);
                                        }}
                                    />
                                }
                                label="Delete before upload"
                            />
                        </FormControl>
                    </Stack>
                    {transferPercent > 0 && !errorMessage ? (
                        <Stack alignItems="center" direction="row" spacing={2} useFlexGap>
                            <LinearProgress id={`progress-${sourceName}`} sx={{ flex: 1 }} value={transferPercent} variant="determinate" />
                            <Typography variant="body2">{transferPercent === 100 ? (!errorMessage ? "Completed" : "") : `${transferPercent}%`}</Typography>
                        </Stack>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Stack direction="row" gap={1}>
                    <Alert sx={{ padding: "0px 16px" }} severity="info">
                        {`Upload can take a long time and remain blocked at 95% for several minutes`}
                    </Alert>
                </Stack>
                <Stack direction="row" gap={1}>
                    {transferPercent === 0 ? (
                        <Button color="primary" disabled={uploadfile.length < 1} onClick={uploadSource} startIcon={<Done />} type="submit" variant="contained">
                            Submit
                        </Button>
                    ) : (
                        <Button
                            color={errorMessage || transferPercent === 100 ? "primary" : "error"}
                            onClick={handleCancelOperation}
                            startIcon={errorMessage || transferPercent === 100 ? <Close /> : <Cancel />}
                            variant="outlined"
                        >
                            {errorMessage || transferPercent === 100 ? "Close" : "Cancel"}
                        </Button>
                    )}
                </Stack>
            </DialogActions>
        </Dialog>
    );
}

declare global {
    interface Window {
        UploadGraphModal: {
            createApp: (props: Omit<UploadGraphModalProps, "open">) => void;
        };
    }
}

window.UploadGraphModal = {
    createApp: (props: Omit<UploadGraphModalProps, "open">) => {
        const container = document.getElementById("mount-edit-upload-graph-modal-here");
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const root = createRoot(container!);
        root.render(<UploadGraphModal open={true} {...props} />);
        return root;
    },
};

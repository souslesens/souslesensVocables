import { Done, Close, Cancel, Folder } from "@mui/icons-material";
import { Dialog, DialogTitle, DialogContent, Stack, Alert, LinearProgress, Typography, DialogActions, Button, Checkbox, FormControl, FormControlLabel, TextField, FormLabel } from "@mui/material";
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
    apiUrl: string;
    onClose: () => void;
    open: boolean;
    sourceName: string;
    indexAfterSuccess: boolean;
}

export function UploadGraphModal({ apiUrl, onClose, open, sourceName, indexAfterSuccess = false }: UploadGraphModalProps) {
    const [currentUser, setCurrentUser] = useState<{ login: string; token: string } | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [transferState, setTransferState] = useState<"init" | "deleting" | "uploading" | "processing" | "done">("init");
    const [uploadfile, setUploadFile] = useState<File[]>([]);
    const [replaceGraph, setReplaceGraph] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState("");
    const cancelCurrentOperation = useRef(false);
    const [graphUrl, setGraphUrl] = useState<string>("");

    useEffect(() => {
        const fetchAll = async () => {
            const response = await fetchMe();
            setCurrentUser(response.user);
        };
        void fetchAll();
    }, []);

    const handleGraphUrl = (event: ChangeEvent<HTMLInputElement>) => {
        setGraphUrl(event.currentTarget.value);
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setUploadFile(filesList);
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

        if (replaceGraph) {
            try {
                setTransferState("deleting");
                await deleteGraph(currentUser.token);
            } catch (error) {
                console.error(error);
                setErrorMessage((error as Error).message);
                setTransferState("init");
                return;
            }
        }

        if (graphUrl !== "") {
            await uploadGraphByUrl(currentUser.token);
        } else {
            await uploadGraphByFile(currentUser.token);
        }

        if (indexAfterSuccess) {
            try {
                window.SearchUtil.generateElasticIndex(sourceName, { indexProperties: 1, indexNamedIndividuals: 1 }, () => {
                    fetch(`/api/v1/ontologyModels?source=${sourceName}`, { method: "DELETE" })
                        .then((_success) => {
                            delete window.Config.ontologiesVocabularyModels[sourceName];
                            window.UI.message(`${sourceName} was updated successfully`, true);
                        })
                        .catch((error) => {
                            alert(error);
                        });
                });
            } catch (error) {
                console.error(error);
                window.UI.message(`An error occurs during ${sourceName} update`, true);
            }
        }
    };

    const deleteGraph = async (userToken: string) => {
        const response = await fetch(`${apiUrl}api/v1/rdf/graph?source=${sourceName}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${userToken}` },
        });
        if (!response.ok) {
            let errorMessage: string | undefined;
            try {
                const json = (await response.json()) as { error?: string; detail?: string };
                errorMessage = json.error ?? json.detail;
            } catch {
                // ignore JSON parse errors
            }
            const message = errorMessage ?? response.statusText ?? "Failed to delete graph";
            throw new Error(message);
        }
    };

    const uploadGraphByUrl = async (userToken: string) => {
        const formData = new FormData();
        formData.append("url", graphUrl);
        formData.append("source", sourceName);
        // POST data
        const res = await fetch("/api/v1/rdf/graphUrl", { method: "post", headers: { Authorization: `Bearer ${userToken}` }, body: formData });
        if (res.status != 200) {
            const message = (await res.json()) as { error?: string; detail?: string };
            console.error(message);
            setErrorMessage(message.error ?? message.detail ?? "Internal server error");
            return;
        }
        setTransferPercent(100);
    };

    const uploadGraphByFile = async (userToken: string) => {
        try {
            // init progress bar
            setTransferPercent(0);
            setTransferState("uploading");
            cancelCurrentOperation.current = false;

            // get file
            const file = uploadfile[0];

            // Streaming implementation: read the file line‑by‑line and
            // send a chunk every 10,000 lines
            const LINES_PER_CHUNK = 10_000;
            const decoder = new TextDecoder();
            const linesBuffer: string[] = [];
            let leftover = "";
            let bytesRead = 0;
            let chunkId = "";

            async function sendChunk(lines: string[], isLast: boolean) {
                // Ensure each chunk ends with a newline character.
                const chunkContent = lines.length ? lines.join("\n") + "\n" : "";
                const chunkFile = new File([chunkContent], file.name, { type: file.type });

                if (isLast) setTransferState("processing");

                const formData = new FormData();
                Object.entries({
                    source: sourceName,
                    last: isLast,
                    identifier: chunkId,
                    clean: false,
                    data: chunkFile,
                }).forEach(([k, v]) => {
                    formData.append(k, typeof v === "boolean" ? String(v) : v);
                });

                // Handle cancellation before sending the chunk
                if (cancelCurrentOperation.current) {
                    formData.set("clean", "true");
                    await fetch(`${apiUrl}api/v1/rdf/graph`, {
                        method: "post",
                        headers: { Authorization: `Bearer ${userToken}` },
                        body: formData,
                    });
                    setTransferState("init");
                    return false;
                }

                const res = await fetch(`${apiUrl}api/v1/rdf/graph`, {
                    method: "post",
                    headers: { Authorization: `Bearer ${userToken}` },
                    body: formData,
                });

                if (res.status !== 200) {
                    const msg = (await res.json()) as { error?: string; detail?: string };
                    console.error(msg);
                    setErrorMessage(msg.error ?? msg.detail ?? "Internal server error");
                    setTransferState("init");
                    throw new Error("Upload failed");
                }

                const json = (await res.json()) as { identifier: string };
                chunkId = json.identifier; // store identifier for the next chunk
                return true;
            }

            // Stream the file – supported in modern browsers
            const reader = file.stream().getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const uint8 = value; // Uint8Array
                const text = decoder.decode(uint8, { stream: true });
                bytesRead += uint8.byteLength;

                const combined = leftover + text;
                const parts = combined.split("\n");
                leftover = parts.pop() as string;

                linesBuffer.push(...parts);

                // While we have enough lines for a full chunk, send it
                while (linesBuffer.length >= LINES_PER_CHUNK) {
                    const chunkLines = linesBuffer.splice(0, LINES_PER_CHUNK);
                    const continueUpload = await sendChunk(chunkLines, false);
                    if (!continueUpload) {
                        reader.releaseLock();
                        return;
                    }
                }

                const percent = Math.round((bytesRead * 100) / file.size);
                setTransferPercent(percent);

                if (cancelCurrentOperation.current) {
                    break;
                }
            }

            if (!cancelCurrentOperation.current) {
                if (leftover) linesBuffer.push(leftover);
                if (linesBuffer.length > 0) {
                    await sendChunk(linesBuffer, true);
                } else {
                    await sendChunk([], true);
                }
                setTransferPercent(100);
                setTransferState("done");
            }
        } catch (error) {
            console.error(error);
            setErrorMessage((error as Error).message);
            setTransferState("init");
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
                        <FormLabel>Or upload from URL</FormLabel>
                        <Stack spacing={1} direction="row" useFlexGap>
                            <TextField fullWidth id="graphUrl" label="Graph URL" name="graphUrl" onChange={handleGraphUrl} />
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
                    {transferState !== "init" && !errorMessage ? (
                        <Stack alignItems="center" direction="row" spacing={2} useFlexGap>
                            <LinearProgress
                                id={`progress-${sourceName}`}
                                sx={{ flex: 1 }}
                                value={transferState === "deleting" || transferState === "processing" ? undefined : transferPercent}
                                variant={transferState === "deleting" || transferState === "processing" ? "indeterminate" : "determinate"}
                            />
                            <Typography variant="body2">
                                {transferState === "deleting"
                                    ? "Deleting"
                                    : transferState === "processing"
                                      ? "Processing"
                                      : transferPercent === 100
                                        ? !errorMessage
                                            ? "Completed"
                                            : ""
                                        : `${transferPercent}%`}
                            </Typography>
                        </Stack>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Stack direction="row" gap={1}>
                    <Alert sx={{ padding: "0px 16px" }} severity="info">
                        {`Upload can take a long time and remain blocked at processing step for several minutes`}
                    </Alert>
                </Stack>
                <Stack direction="row" gap={1}>
                    {transferPercent === 0 ? (
                        <>
                            <Button color="primary" disabled={uploadfile.length < 1 && graphUrl === ""} onClick={uploadSource} startIcon={<Done />} type="submit" variant="contained">
                                Submit
                            </Button>
                            <Button color="error" onClick={onClose} startIcon={<Close />} variant="outlined">
                                Cancel
                            </Button>
                        </>
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

        const root = createRoot(container!);
        root.render(<UploadGraphModal open={true} {...props} />);
        return root;
    },
};

import { Done, Close, Cancel } from "@mui/icons-material";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
    Alert,
    LinearProgress,
    Typography,
    DialogActions,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
} from "@mui/material";
import { fetchMe } from "../Utils";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { writeLog } from "../Log";
import { createRoot } from "react-dom/client";

interface DownloadGraphModalProps {
    apiUrl: string;
    onClose: () => void;
    open: boolean;
    sourceName: string;
}

type ApiServerResponseOk = {
    filesize: number;
    data: BlobPart;
    next_offset: number;
    identifier: string;
};

type ApiServerResponseError = {
    detail: string;
};

type ApiServerResponse = ApiServerResponseError | ApiServerResponseOk;

export function DownloadGraphModal({ apiUrl, onClose, open, sourceName }: DownloadGraphModalProps) {
    const [currentUser, setCurrentUser] = useState<{ login: string; token: string } | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const cancelCurrentOperation = useRef(false);
    const [currentDownloadFormat, setCurrentDownloadFormat] = useState("nt");
    const [skipNamedIndividuals, setSkipNamedIndividuals] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            const response = await fetchMe();
            setCurrentUser(response.user);
        };
        void fetchAll();
    }, []);

    const handleCancelOperation = () => {
        cancelCurrentOperation.current = true;
        setTransferPercent(0);
        setErrorMessage("");
        onClose();
    };

    const fetchSourceInfo = async (sourceName: string) => {
        const response = await fetch(`/api/v1/rdf/graph/info?source=${sourceName}`);
        const json = (await response.json()) as { graphSize: number; pageSize: number };
        return json;
    };

    const fetchGraphPartUsingPythonApi = async (name: string, offset: number, format = "nt", identifier = "", skipNamedIndividuals = false) => {
        const response = await fetch(`${apiUrl}api/v1/rdf/graph?source=${name}&offset=${offset}&format=${format}&identifier=${identifier}&skipNamedIndividuals=${String(skipNamedIndividuals)}`, {
            headers: { Authorization: `Bearer ${currentUser?.token ?? ""}` },
        });
        const json = (await response.json()) as ApiServerResponse;
        if (response.status !== 200) {
            return { status: response.status, message: (json as ApiServerResponseError).detail ?? "Internal serveur error" };
        }
        return { status: response.status, message: json as ApiServerResponseOk };
    };

    const downloadSourceUsingPythonApi = async (name: string) => {
        let offset = 0;
        let identifier = "";
        const blobParts: BlobPart[] = [];
        setTransferPercent(1);
        while (offset !== null) {
            if (cancelCurrentOperation.current) {
                cancelCurrentOperation.current = false;
                return { blobParts: [], message: "ok" };
            }
            const response = await fetchGraphPartUsingPythonApi(name, offset, currentDownloadFormat, identifier, skipNamedIndividuals);
            const status = response.status;
            if (status >= 400) {
                const errorMessage = response.message as string;
                return { blobParts: null, message: errorMessage };
            }
            const message = response.message as ApiServerResponseOk;
            // percent
            const percent = Math.min(100, (offset * 100) / message.filesize);
            setTransferPercent(percent);

            blobParts.push(message.data);
            offset = message.next_offset;
            identifier = message.identifier;
        }
        setTransferPercent(100);
        return { blobParts: blobParts, message: "ok" };
    };

    const fetchGraphPart = async (name: string, limit: number, offset: number) => {
        const response = await fetch(`/api/v1/rdf/graph/?source=${name}&limit=${limit}&offset=${offset}`);
        return await response.text();
    };

    const recursDownloadSource = async (name: string, offset: number, graphSize: number, pageSize: number, blobParts: BlobPart[]) => {
        // percent
        const percent = Math.min(Math.round((offset * 100) / graphSize), 100);
        setTransferPercent(percent);

        if (cancelCurrentOperation.current) {
            cancelCurrentOperation.current = false;
            return [];
        }

        if (offset < graphSize) {
            const data = await fetchGraphPart(name, pageSize, offset);
            blobParts.push(data);
            blobParts = await recursDownloadSource(name, offset + pageSize, graphSize, pageSize, blobParts);
        }
        return blobParts;
    };

    const downloadSource = async (e: MouseEvent) => {
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

        try {
            await writeLog(currentUser.login, "GraphManagement", "download", sourceName);

            setTransferPercent(0);
            cancelCurrentOperation.current = false;

            let blobParts: BlobPart[] | null;
            let message = "ok";
            if (apiUrl === "/") {
                const graphInfo = await fetchSourceInfo(sourceName);
                const graphSize = graphInfo.graphSize;
                const pageSize = graphInfo.pageSize;

                blobParts = await recursDownloadSource(sourceName, 0, graphSize, pageSize, []);
            } else {
                const result = await downloadSourceUsingPythonApi(sourceName);
                blobParts = result.blobParts;
                message = result.message;
            }

            if (message != "ok") {
                setErrorMessage(message);
                return;
            }

            if (!blobParts || blobParts.length == 0) {
                setErrorMessage("Receive empty data from the API");
                return;
            }

            // create a blob and a link to dwl data, autoclick to autodownload
            const blob = new Blob(blobParts, { type: "text/plain" });
            const link = document.createElement("a");
            link.download = `${sourceName}.${currentDownloadFormat}`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error(error);
            setErrorMessage((error as Error).message);
        }
    };

    return (
        <Dialog fullWidth={true} maxWidth="md" onClose={onClose} open={open} PaperProps={{ component: "form" }}>
            <DialogTitle id="contained-modal-title-vcenter">Downloading {sourceName}</DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
                <Stack spacing={2} useFlexGap>
                    {errorMessage ? (
                        <Alert variant="filled" severity="error">
                            {errorMessage}
                        </Alert>
                    ) : null}
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel id="select-format-label">File format</InputLabel>
                            <Select
                                disabled={transferPercent > 0}
                                id={`select-format-${sourceName}`}
                                label="File format"
                                labelId="select-format-label"
                                onChange={(event) => setCurrentDownloadFormat(event.target.value)}
                                value={currentDownloadFormat}
                            >
                                <MenuItem disabled={transferPercent > 0} value={"nt"}>
                                    N-triples
                                </MenuItem>
                                <MenuItem disabled={transferPercent > 0 || apiUrl === "/"} value={"xml"}>
                                    RDF/XML
                                </MenuItem>
                                <MenuItem disabled={transferPercent > 0 || apiUrl === "/"} value={"ttl"}>
                                    Turtle
                                </MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <FormControlLabel
                                id={`download-switch-${sourceName}`}
                                control={
                                    <Checkbox
                                        checked={skipNamedIndividuals}
                                        disabled={transferPercent > 0 || apiUrl === "/"}
                                        onChange={(event) => {
                                            setSkipNamedIndividuals(event.currentTarget.checked);
                                        }}
                                    />
                                }
                                label="Ignore the namedIndividuals in this download"
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
                        {`Download can take a long time and remain blocked at 1% for several minutes`}
                    </Alert>
                </Stack>
                <Stack direction="row" gap={1}>
                    {transferPercent === 0 ? (
                        <Button color="primary" disabled={currentDownloadFormat === null} onClick={downloadSource} startIcon={<Done />} type="submit" variant="contained">
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
        DownloadGraphModal: {
            createApp: (props: Omit<DownloadGraphModalProps, "open">) => void;
        };
    }
}

window.DownloadGraphModal = {
    createApp: (props: Omit<DownloadGraphModalProps, "open">) => {
        const container = document.getElementById("mount-download-graph-modal-here");

        const root = createRoot(container!);
        root.render(<DownloadGraphModal open={true} {...props} />);
        return root;
    },
};

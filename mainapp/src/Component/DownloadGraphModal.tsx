import { Done, Close, Cancel } from "@mui/icons-material";
import { getConfig } from "../Config";
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
import { fetchMe, roundMinMax, humanizeSize } from "../Utils";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { writeLog } from "../Log";
import { createRoot } from "react-dom/client";

interface DownloadGraphModalProps {
    apiUrl: string;
    onClose: () => void;
    open: boolean;
    sourceName: string;
}

type ApiServerV2ResponseOk = {
    data: BlobPart;
    next_offset: number;
    graph_size: number;
};

type ApiServerResponseError = {
    detail: string;
};

type SourceInfo = {
    graphUri: string | undefined;
    graphSize: number | undefined;
};

type ApiServerV2Response = ApiServerResponseError | ApiServerV2ResponseOk;

export function DownloadGraphModal({ apiUrl, onClose, open, sourceName }: DownloadGraphModalProps) {
    const [currentUser, setCurrentUser] = useState<{ login: string; token: string } | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [transferState, setTransferState] = useState<"init" | "downloading" | "processing" | "done">("init");
    const [errorMessage, setErrorMessage] = useState("");
    const cancelCurrentOperation = useRef(false);
    const [currentDownloadFormat, setCurrentDownloadFormat] = useState("nt");
    const [skipNamedIndividuals, setSkipNamedIndividuals] = useState(false);
    const [includeImports, setIncludeImports] = useState(false);
    const [sourceInfo, setSourceInfo] = useState<SourceInfo>({ graphUri: undefined, graphSize: undefined });
    const [sparqlDownloadLimit, setSparqlDownloadLimit] = useState<number>(0);

    useEffect(() => {
        const fetchAll = async () => {
            const response = await fetchMe();
            setCurrentUser(response.user);

            const config = await getConfig();
            setSparqlDownloadLimit(config.sparqlDownloadLimit);

            const info = await fetchSourceInfo(sourceName, false);
            setSourceInfo({ graphUri: info.graph, graphSize: info.graphSize });
        };
        void fetchAll();
    }, [sourceName]);

    const handleCancelOperation = () => {
        cancelCurrentOperation.current = true;
        setTransferPercent(0);
        setTransferState("init");
        setErrorMessage("");
        onClose();
    };

    const fetchSourceInfo = async (sourceName: string, withImports: boolean) => {
        const response = await fetch(`/api/v1/rdf/graph/info?source=${sourceName}&withImports=${String(withImports)}`);
        const json = (await response.json()) as { graph: string; graphSize: number };
        return json;
    };

    const fetchGraphPartUsingPythonApiV2 = async (name: string, offset: number, format = "nt", skipNamedIndividuals: boolean = false, withImports: boolean = false) => {
        const response = await fetch(`${apiUrl}api/v2/rdf/graph?source=${name}&offset=${offset}&format=${format}&skipNamedIndividuals=${String(skipNamedIndividuals)}&withImports=${withImports}`, {
            headers: { Authorization: `Bearer ${currentUser?.token ?? ""}` },
        });
        const json = (await response.json()) as ApiServerV2Response;
        if (response.status !== 200) {
            return { status: response.status, message: (json as ApiServerResponseError).detail ?? "Internal serveur error" };
        }
        return { status: response.status, message: json as ApiServerV2ResponseOk };
    };

    const fetchGraphPart = async (name: string, offset: number, withImports: boolean) => {
        const response = await fetch(`/api/v1/rdf/graph/?source=${name}&offset=${offset}&withImports=${withImports}`);
        return (await response.json()) as { data: string; graph_size: number; next_offset: number | null };
    };

    const recursDownloadSourceUsingPythonApi = async (name: string, offset: number, blobParts: BlobPart[], format = "nt") => {
        const percent = roundMinMax((offset * 100) / Number(sourceInfo.graphSize), 1, 99);

        setTransferPercent(percent);

        if (cancelCurrentOperation.current) {
            return [];
        }

        const response = await fetchGraphPartUsingPythonApiV2(name, offset, format, skipNamedIndividuals, includeImports);

        if (response.status !== 200) {
            return [];
        }
        const msg = response.message as ApiServerV2ResponseOk;

        blobParts.push(msg.data);
        if (msg.next_offset !== null) {
            blobParts = await recursDownloadSourceUsingPythonApi(name, msg.next_offset, blobParts, format);
        }
        return blobParts;
    };

    const recursDownloadSource = async (name: string, offset: number, blobParts: BlobPart[]) => {
        const percent = roundMinMax((offset * 100) / Number(sourceInfo.graphSize), 1, 99);

        setTransferPercent(percent);

        if (cancelCurrentOperation.current) {
            return [];
        }

        const response = await fetchGraphPart(name, offset, includeImports);

        blobParts.push(response.data);
        if (response.next_offset !== null) {
            blobParts = await recursDownloadSource(name, response.next_offset, blobParts);
        }
        return blobParts;
    };

    const submitDownloadSource = async (e: MouseEvent) => {
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
            setTransferState("init");
            cancelCurrentOperation.current = false;

            const downloadResult = await downloadSourceTriples();
            const blobParts = downloadResult.blobParts;
            const message = downloadResult.message;

            // If cancelled, just return silently (handleCancelOperation already reset state)
            if (message === "cancelled") {
                return;
            }

            if (message !== "ok") {
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
    const downloadSourceTriples = async () => {
        setTransferState("downloading");
        setTransferPercent(1);

        let blobParts: BlobPart[];
        if (apiUrl === "/") {
            // local API
            blobParts = await recursDownloadSource(sourceName, 0, []);
        } else {
            // sls-py-api
            blobParts = await recursDownloadSourceUsingPythonApi(sourceName, 0, [], currentDownloadFormat);
        }

        setTransferPercent(100);
        setTransferState("done");

        return { blobParts: blobParts, message: "ok" };
    };

    const toggleAddImports = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        const info = await fetchSourceInfo(sourceName, checked);
        setSourceInfo({ graphUri: info.graph, graphSize: info.graphSize });
        setIncludeImports(checked);
    };

    return (
        <Dialog fullWidth={true} maxWidth="md" onClose={onClose} open={open} PaperProps={{ component: "form" }}>
            <DialogTitle id="contained-modal-title-vcenter">
                Downloading {sourceName} ({humanizeSize(Number(sourceInfo.graphSize))} triples)
            </DialogTitle>
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
                                <MenuItem disabled={transferPercent > 0 || apiUrl === "/" || Number(sourceInfo.graphSize) > sparqlDownloadLimit} value={"xml"}>
                                    RDF/XML
                                </MenuItem>
                                <MenuItem disabled={transferPercent > 0 || apiUrl === "/" || Number(sourceInfo.graphSize) > sparqlDownloadLimit} value={"turtle"}>
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
                            <FormControlLabel
                                id={`include-imports-switch-${sourceName}`}
                                control={<Checkbox checked={includeImports} disabled={transferPercent > 0} onChange={toggleAddImports} />}
                                label="Add imports in this download"
                            />
                        </FormControl>
                    </Stack>
                    {transferPercent > 0 && !errorMessage ? (
                        <Stack alignItems="center" direction="row" spacing={2} useFlexGap>
                            <LinearProgress id={`progress-${sourceName}`} sx={{ flex: 1 }} value={transferPercent} variant={transferState === "processing" ? "indeterminate" : "determinate"} />
                            <Typography variant="body2">
                                {transferState === "processing" ? "Processing" : transferPercent === 100 ? (!errorMessage ? "Completed" : "") : `${transferPercent}%`}
                            </Typography>
                        </Stack>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Stack direction="row" gap={1}>
                    <Alert sx={{ padding: "0px 16px" }} severity="info">
                        {`Download can take a long time and remain blocked at processing step for several minutes`}
                    </Alert>
                </Stack>
                <Stack direction="row" gap={1}>
                    {transferPercent === 0 ? (
                        <Button color="primary" disabled={currentDownloadFormat === null} onClick={submitDownloadSource} startIcon={<Done />} type="submit" variant="contained">
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

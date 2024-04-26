import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";

import {
    Alert,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    InputLabel,
    LinearProgress,
    Link,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { Cancel, Close, Done, Folder } from "@mui/icons-material";

import { fetchMe, VisuallyHiddenInput } from "./Utils";

declare global {
    interface Window {
        GraphManagement: {
            createApp: () => void;
        };
    }
}
export default function GraphManagement() {
    // sources fetched from server
    const [sources, setSources] = useState<Record<string, any>>({});
    const [slsApiBaseUrl, setSlsApiBaseUrl] = useState<Record<string, any>>({});

    // user info
    const [currentUserToken, setCurrentUserToken] = useState<string | null>(null);

    // status of download/upload
    const [currentSource, setCurrentSource] = useState<string | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [currentOperation, setCurrentOperation] = useState<string | null>(null);
    const cancelCurrentOperation = useRef(false);
    const [animatedProgressBar, setAnimatedProgressBar] = useState(false);
    const [currentDownloadFormat, setCurrentDownloadFormat] = useState<string>("nt");
    const [skipNamedIndividuals, setSkipNamedIndividuals] = useState<boolean>(false);

    // error management
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // upload
    const [uploadfile, setUploadFile] = useState<File[]>([]);
    const [replaceGraph, setReplaceGraph] = useState<boolean>(true);

    // modal
    const [displayModal, setDisplayModal] = useState<string | null>(null);

    // sorting
    type Order = "asc" | "desc";
    const [orderBy, setOrderBy] = React.useState<keyof ServerSource>("name");
    const [order, setOrder] = React.useState<Order>("asc");
    function handleRequestSort(property: keyof ServerSource) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    // search
    const [filteringChars, setFilteringChars] = React.useState("");

    useEffect(() => {
        void fetchSources();
        void fetchConfig();
        (async () => {
            const response = await fetchMe();
            setCurrentUserToken(response.user.token);
        })();
    }, []);

    const fetchConfig = async () => {
        const response = await fetch("/api/v1/config");
        const json = (await response.json()) as { resources: Record<string, any> };
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

    const fetchSources = async () => {
        const response = await fetch("/api/v1/sources");
        const json = (await response.json()) as { resources: Record<string, any> };
        setSources(json.resources);
    };

    const fetchSourceInfo = async (sourceName: string) => {
        const response = await fetch(`/api/v1/rdf/graph/info?source=${sourceName}`);
        const json = await response.json();
        return json;
    };

    const fetchGraphPart = async (sourceName: string, limit: number, offset: number) => {
        const response = await fetch(`/api/v1/rdf/graph/?source=${sourceName}&limit=${limit}&offset=${offset}`);
        return await response.text();
    };

    const fetchGraphPartUsingPythonApi = async (sourceName: string, offset: number, format: string = "nt", identifier: string = "", skipNamedIndividuals: boolean = false) => {
        const response = await fetch(`${slsApiBaseUrl}api/v1/rdf/graph?source=${sourceName}&offset=${offset}&format=${format}&identifier=${identifier}&skipNamedIndividuals=${skipNamedIndividuals}`, {
            headers: { Authorization: `Bearer ${currentUserToken}` },
        });
        return await response.json();
    };

    const handleUploadSource = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setCurrentSource(event.currentTarget.value);
        setCurrentOperation(null);
        setDisplayModal("upload");
    };

    const handleSetFormat = async (event: React.MouseEvent<HTMLElement>) => {
        setCurrentDownloadFormat(event.target.value);
    };

    const handleSetSkipNamedIndividuals = async (event: React.ChangeEvent<HTMLElement>) => {
        setSkipNamedIndividuals(event.currentTarget.checked);
    };

    const handleReplaceGraphCheckbox = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setReplaceGraph(event.currentTarget.checked);
    };

    const handleDownloadSource = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setCurrentSource(event.currentTarget.value);
        setCurrentOperation(null);
        setDisplayModal("download");
    };

    const handleHideModal = () => {
        const idle = error || transferPercent === 100 || currentOperation === null;
        if (!idle) {
            return;
        }

        setCurrentOperation(null);
        setDisplayModal(null);
        setCurrentSource(null);
        setTransferPercent(0);
        setUploadFile([]);
        setError(false);
        setErrorMessage("");
        setAnimatedProgressBar(false);
        if (currentOperation) {
            cancelCurrentOperation.current = true;
        }
        setSkipNamedIndividuals(false);
        setReplaceGraph(true);
        setCurrentDownloadFormat("nt");
    };

    const uploadSource = async () => {
        try {
            // init progress bar
            setCurrentOperation("upload");
            setTransferPercent(0);
            cancelCurrentOperation.current = false;

            // get file
            const file = uploadfile[0];

            // get file size and chunk size
            const chunkSize = 1000000;
            const fileSize = file.size;

            // init values
            let chunkId = "";

            // iterate over file and send chunks to server
            for (let start = 0; start < fileSize; start += chunkSize) {
                // set percent for progress bar
                const percent = (start * 100) / fileSize;
                setTransferPercent(Math.round(percent));

                // slice file
                const end = start + chunkSize;
                const chunk = new File([file.slice(start, end)], file.name, { type: file.type });

                // last ?
                const lastChunk = start + chunkSize >= fileSize ? true : false;
                if (lastChunk) {
                    setAnimatedProgressBar(true);
                }

                // build formData
                const formData = new FormData();
                Object.entries({
                    source: currentSource,
                    last: lastChunk,
                    identifier: chunkId,
                    clean: false,
                    replace: replaceGraph,
                    data: chunk,
                }).forEach(([key, value]) => {
                    formData.append(key, value);
                });
                // if cancel button is pressed, remove uploaded file and return
                if (cancelCurrentOperation.current) {
                    formData.set("clean", true);
                    await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { Authorization: `Bearer ${currentUserToken}` }, body: formData });
                    return;
                }

                // POST data
                const res = await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { Authorization: `Bearer ${currentUserToken}` }, body: formData });
                if (res.status != 200) {
                    setError(true);
                    const message = await res.json();
                    console.error(message.error);
                    setErrorMessage(message.error);
                    return;
                } else {
                    const json = await res.json();

                    // Set values for next iteration
                    chunkId = json.identifier;
                }
            }
            setTransferPercent(100);
            setAnimatedProgressBar(false);
        } catch (error) {
            console.error(error);
            setErrorMessage((error as Error).message);
            setError(true);
        }
    };

    const handleCancelOperation = () => {
        cancelCurrentOperation.current = true;
        setCurrentOperation(null);
        setDisplayModal(null);
        setCurrentSource(null);
        setTransferPercent(0);
        setUploadFile([]);
        setError(false);
        setErrorMessage("");
        setAnimatedProgressBar(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setUploadFile(filesList);
    };

    const recursDownloadSourceUsingPythonApi = async (sourceName: string, offset: number | null, blobParts: any[], identifier: string = "") => {
        if (offset === 0) {
            setTransferPercent(100);
            setAnimatedProgressBar(true);
        }

        if (cancelCurrentOperation.current) {
            cancelCurrentOperation.current = false;
            return [];
        }
        if (offset !== null) {
            const data = await fetchGraphPartUsingPythonApi(sourceName, offset, currentDownloadFormat, identifier, skipNamedIndividuals);

            // percent
            const percent = Math.min(100, (offset * 100) / data.filesize);
            setTransferPercent(percent);
            setAnimatedProgressBar(false);

            blobParts.push(data.data);
            blobParts = await recursDownloadSourceUsingPythonApi(sourceName, data.next_offset, blobParts, data.identifier);
        }
        setTransferPercent(100);
        return blobParts;
    };

    const recursDownloadSource = async (sourceName: string, offset: number, graphSize: number, pageSize: number, blobParts: any[]) => {
        // percent
        const percent = Math.min(Math.round((offset * 100) / graphSize), 100);
        setTransferPercent(percent);

        if (cancelCurrentOperation.current) {
            cancelCurrentOperation.current = false;
            return [];
        }

        if (offset < graphSize) {
            const data = await fetchGraphPart(sourceName, pageSize, offset);
            blobParts.push(data);
            blobParts = await recursDownloadSource(sourceName, offset + pageSize, graphSize, pageSize, blobParts);
        }
        return blobParts;
    };

    const downloadSource = async () => {
        try {
            setTransferPercent(0);
            setCurrentOperation("download");
            cancelCurrentOperation.current = false;

            let blobParts;
            if (slsApiBaseUrl === "/") {
                const graphInfo = await fetchSourceInfo(currentSource);
                const graphSize = graphInfo.graphSize;
                const pageSize = graphInfo.pageSize;

                blobParts = await recursDownloadSource(currentSource, 0, graphSize, pageSize, []);
            } else {
                blobParts = await recursDownloadSourceUsingPythonApi(currentSource, 0, []);
            }

            if (blobParts.length == 0) {
                setErrorMessage("Receive empty data from the API");
                setError(true);
                return;
            }

            // create a blob and a link to dwl data, autoclick to autodownload
            const blob = new Blob(blobParts, { type: "text/plain" });
            const link = document.createElement("a");
            link.download = `${currentSource}.${currentDownloadFormat}`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error(error);
            setErrorMessage((error as Error).message);
            setError(true);
        }
    };

    const downloadModalContent = (
        <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
                <InputLabel id="select-format-label">File format</InputLabel>
                <Select
                    disabled={currentOperation !== null}
                    id={`select-format-${currentSource}`}
                    label="File format"
                    labelId="select-format-label"
                    onChange={handleSetFormat}
                    value={currentDownloadFormat}
                >
                    <MenuItem disabled={currentOperation !== null} value={"nt"}>
                        N-triples
                    </MenuItem>
                    <MenuItem disabled={currentOperation !== null || slsApiBaseUrl === "/"} value={"xml"}>
                        RDF/XML
                    </MenuItem>
                    <MenuItem disabled={currentOperation !== null || slsApiBaseUrl === "/"} value={"ttl"}>
                        Turtle
                    </MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <FormControlLabel
                    id={`download-switch-${currentSource}`}
                    control={<Checkbox checked={skipNamedIndividuals} disabled={currentOperation !== null || slsApiBaseUrl === "/"} onChange={handleSetSkipNamedIndividuals} />}
                    label="Ignore the namedIndividuals in this download"
                />
            </FormControl>
        </Stack>
    );

    const uploadModalContent = (
        <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack spacing={1} direction="row" useFlexGap>
                <Button color="info" component="label" disabled={currentOperation === "upload"} fullWidth role={undefined} startIcon={<Folder />} tabIndex={-1} variant="outlined">
                    {uploadfile.length === 1 ? uploadfile[0].name : "Select a file to upload…"}
                    <VisuallyHiddenInput id="formUploadGraph" onChange={handleFileChange} type="file" />
                </Button>
            </Stack>
            <FormControl fullWidth>
                <FormControlLabel
                    id={`upload-switch-${currentSource}`}
                    control={<Checkbox checked={replaceGraph} disabled={currentOperation !== null} onChange={handleReplaceGraphCheckbox} />}
                    label="Delete before upload"
                />
            </FormControl>
        </Stack>
    );

    const dialogModal = (
        <Dialog fullWidth={true} maxWidth="md" onClose={handleHideModal} open={displayModal} PaperProps={{ component: "form" }}>
            <DialogTitle id="contained-modal-title-vcenter">
                {displayModal == "upload" ? "Uploading" : "Downloading"} {currentSource}
            </DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
                <Stack spacing={2} useFlexGap>
                    {error ? (
                        <Alert variant="filled" severity="error">
                            {errorMessage}
                        </Alert>
                    ) : null}
                    {displayModal == "upload" ? uploadModalContent : downloadModalContent}
                    {currentOperation !== null && !error ? (
                        <Stack alignItems="center" direction="row" spacing={2} useFlexGap>
                            <LinearProgress id={`progress-${currentSource}`} sx={{ flex: 1 }} value={transferPercent} variant="determinate" />
                            <Typography variant="body2">{transferPercent === 100 ? (!error ? "Completed" : "") : `${transferPercent}%`}</Typography>
                        </Stack>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Stack direction="horizontal" gap={1}>
                    {!currentOperation ? (
                        <Button
                            color="primary"
                            component="label"
                            disabled={displayModal === "upload" ? uploadfile.length < 1 : currentDownloadFormat === null}
                            onClick={displayModal === "upload" ? uploadSource : downloadSource}
                            startIcon={<Done />}
                            type="submit"
                            variant="contained"
                        >
                            Submit
                        </Button>
                    ) : null}
                    {currentOperation === "upload" || currentOperation === "download" ? (
                        <Button
                            color={error || transferPercent === 100 ? "primary" : "error"}
                            onClick={handleCancelOperation}
                            startIcon={error || transferPercent === 100 ? <Close /> : <Cancel />}
                            variant="outlined"
                        >
                            {error || transferPercent === 100 ? "Close" : "Cancel"}
                        </Button>
                    ) : null}
                </Stack>
            </DialogActions>
        </Dialog>
    );

    return (
        <>
            {dialogModal}
            <Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                <TableContainer sx={{ height: "80vh" }} component={Paper}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: "bold" }}>Sources</TableCell>
                                <TableCell style={{ fontWeight: "bold", width: "100%" }}>Graph URI</TableCell>
                                <TableCell align="center" style={{ fontWeight: "bold" }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ width: "100%", overflow: "visible" }}>
                            {Object.entries(sources)
                                .sort(([aName, _a], [bName, _b]) => {
                                    return aName.toLowerCase() > bName.toLowerCase();
                                })
                                .map(([sourceName, source]) => {
                                    return (
                                        <TableRow>
                                            <TableCell>{sourceName}</TableCell>
                                            <TableCell>
                                                <Link href={source.graphUri}>{source.graphUri}</Link>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                    <Button variant="contained" disabled={source.accessControl != "readwrite"} color="secondary" value={source.name} onClick={handleUploadSource}>
                                                        Upload
                                                    </Button>
                                                    <Button variant="contained" color="primary" value={source.name} onClick={handleDownloadSource}>
                                                        Download
                                                    </Button>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Stack>
        </>
    );
}

window.GraphManagement.createApp = function createApp() {
    const container = document.getElementById("mount-graph-management-here");
    const root = createRoot(container!);
    root.render(<GraphManagement />);
    return root.unmount.bind(root);
};

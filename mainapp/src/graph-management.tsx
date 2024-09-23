import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
    Alert,
    Autocomplete,
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
    TableSortLabel,
    TextField,
    Typography,
} from "@mui/material";
import { Cancel, Close, Done, Folder } from "@mui/icons-material";
import CsvDownloader from "react-csv-downloader";

import { fetchMe, VisuallyHiddenInput, humanizeSize } from "./Utils";

import { writeLog } from "./Log";
import { getGraphSize, GraphInfo, ServerSource } from "./Source";

declare global {
    interface Window {
        GraphManagement: {
            createApp: () => void;
        };
    }
}

type OrderBy = "name" | "graphUri" | "graphSize";

export default function GraphManagement() {
    // sources fetched from server
    const [sources, setSources] = useState<Record<string, ServerSource>>({});
    const [slsApiBaseUrl, setSlsApiBaseUrl] = useState<string>("");

    // user info
    const [currentUserToken, setCurrentUserToken] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>("");

    // graph info
    const [graphs, setGraphs] = useState<GraphInfo[]>([]);

    // status of download/upload
    const [currentSource, setCurrentSource] = useState<string | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [currentOperation, setCurrentOperation] = useState<string | null>(null);
    const cancelCurrentOperation = useRef(false);
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
    const [orderBy, setOrderBy] = useState<OrderBy>("name");
    const [order, setOrder] = useState<Order>("asc");
    function handleRequestSort(property: OrderBy) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    // search
    const [filteringChars, setFilteringChars] = useState("");

    useEffect(() => {
        void fetchSources();
        void fetchConfig();
        void fetchGraphsInfo();
        const fetchAll = async () => {
            const response = await fetchMe();
            setCurrentUserName(response.user.login);
            setCurrentUserToken(response.user.token);
        };

        void fetchAll();
    }, []);

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

    const fetchSources = async () => {
        const response = await fetch("/api/v1/sources");
        const json = (await response.json()) as { resources: Record<string, ServerSource> };
        setSources(json.resources);
    };

    const fetchGraphsInfo = async () => {
        const response = await fetch("/api/v1/sparql/graphs");
        const json = (await response.json()) as GraphInfo[];
        setGraphs(json);
    };

    const fetchSourceInfo = async (sourceName: string) => {
        const response = await fetch(`/api/v1/rdf/graph/info?source=${sourceName}`);
        const json = (await response.json()) as { graphSize: number; pageSize: number };
        return json;
    };

    const fetchGraphPart = async (sourceName: string, limit: number, offset: number) => {
        const response = await fetch(`/api/v1/rdf/graph/?source=${sourceName}&limit=${limit}&offset=${offset}`);
        return await response.text();
    };

    const fetchGraphPartUsingPythonApi = async (sourceName: string, offset: number, format = "nt", identifier = "", skipNamedIndividuals = false) => {
        const response = await fetch(
            `${slsApiBaseUrl}api/v1/rdf/graph?source=${sourceName}&offset=${offset}&format=${format}&identifier=${identifier}&skipNamedIndividuals=${String(skipNamedIndividuals)}`,
            {
                headers: { Authorization: `Bearer ${currentUserToken ?? ""}` },
            }
        );
        return (await response.json()) as { filesize: number; data: BlobPart; next_offset: number; identifier: string };
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
        if (currentOperation) {
            cancelCurrentOperation.current = true;
        }
        setSkipNamedIndividuals(false);
        setReplaceGraph(true);
        setCurrentDownloadFormat("nt");
    };

    const uploadSource = async () => {
        if (!currentSource) {
            console.error("No current source");
            setErrorMessage("No current source");
            setError(true);
            return;
        }

        await writeLog(currentUserName, "GraphManagement", "upload", currentSource);

        try {
            // init progress bar
            setCurrentOperation("upload");
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
                    source: currentSource,
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
                    await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { Authorization: `Bearer ${currentUserToken ?? ""}` }, body: formData });
                    return;
                }

                // POST data
                const res = await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { Authorization: `Bearer ${currentUserToken ?? ""}` }, body: formData });
                if (res.status != 200) {
                    setError(true);
                    const message = (await res.json()) as { error: string };
                    console.error(message.error);
                    setErrorMessage(message.error);
                    return;
                } else {
                    const json = (await res.json()) as { identifier: string };

                    // Set values for next iteration
                    chunkId = json.identifier;
                }
            }
            setTransferPercent(100);
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
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setUploadFile(filesList);
    };

    const downloadSourceUsingPythonApi = async (sourceName: string) => {
        let offset = 0;
        let identifier = "";
        const blobParts: BlobPart[] = [];
        setTransferPercent(1);
        while (offset !== null) {
            if (cancelCurrentOperation.current) {
                cancelCurrentOperation.current = false;
                return [];
            }
            const data = await fetchGraphPartUsingPythonApi(sourceName, offset, currentDownloadFormat, identifier, skipNamedIndividuals);
            // percent
            const percent = Math.min(100, (offset * 100) / data.filesize);
            setTransferPercent(percent);

            blobParts.push(data.data);
            offset = data.next_offset;
            identifier = data.identifier;
        }
        setTransferPercent(100);
        return blobParts;
    };

    const recursDownloadSource = async (sourceName: string, offset: number, graphSize: number, pageSize: number, blobParts: BlobPart[]) => {
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
        if (!currentSource) {
            console.error("No current source");
            setErrorMessage("No current source");
            setError(true);
            return;
        }

        try {
            await writeLog(currentUserName, "GraphManagement", "download", currentSource);

            setTransferPercent(0);
            setCurrentOperation("download");
            cancelCurrentOperation.current = false;

            let blobParts: BlobPart[];
            if (slsApiBaseUrl === "/") {
                const graphInfo = await fetchSourceInfo(currentSource);
                const graphSize = graphInfo.graphSize;
                const pageSize = graphInfo.pageSize;

                blobParts = await recursDownloadSource(currentSource, 0, graphSize, pageSize, []);
            } else {
                blobParts = await downloadSourceUsingPythonApi(currentSource);
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
                    id={`select-format-${currentSource ?? ""}`}
                    label="File format"
                    labelId="select-format-label"
                    onChange={(event) => setCurrentDownloadFormat(event.target.value)}
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
                    id={`download-switch-${currentSource ?? ""}`}
                    control={
                        <Checkbox
                            checked={skipNamedIndividuals}
                            disabled={currentOperation !== null || slsApiBaseUrl === "/"}
                            onChange={(event) => {
                                setSkipNamedIndividuals(event.currentTarget.checked);
                            }}
                        />
                    }
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
                    id={`upload-switch-${currentSource ?? ""}`}
                    control={
                        <Checkbox
                            checked={replaceGraph}
                            disabled={currentOperation !== null}
                            onChange={(event) => {
                                setReplaceGraph(event.currentTarget.checked);
                            }}
                        />
                    }
                    label="Delete before upload"
                />
            </FormControl>
        </Stack>
    );

    const dialogModal = (
        <Dialog fullWidth={true} maxWidth="md" onClose={handleHideModal} open={displayModal !== null} PaperProps={{ component: "form" }}>
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
                            <LinearProgress id={`progress-${currentSource ?? ""}`} sx={{ flex: 1 }} value={transferPercent} variant="determinate" />
                            <Typography variant="body2">{transferPercent === 100 ? (!error ? "Completed" : "") : `${transferPercent}%`}</Typography>
                        </Stack>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Stack direction="row" gap={1}>
                    <Alert sx={{ padding: "0px 16px" }} severity="info">
                        {`${displayModal === "upload" ? "Upload" : "Download"} can take a long time and remain blocked at ${displayModal === "upload" ? "95" : "1"}% for several minutes`}
                    </Alert>
                </Stack>
                <Stack direction="row" gap={1}>
                    {!currentOperation ? (
                        <Button
                            color="primary"
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

    const memoizedSources = useMemo(
        () =>
            Object.values(sources).sort((a, b) => {
                if (orderBy == "graphSize") {
                    const left_n: number = getGraphSize(a, graphs);
                    const right_n: number = getGraphSize(b, graphs);
                    return order === "asc" ? left_n - right_n : right_n - left_n;
                } else {
                    const left: string = a[orderBy] || ("" as string);
                    const right: string = b[orderBy] || ("" as string);
                    return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                }
            }),
        [sources, orderBy, order]
    );

    return (
        <>
            {dialogModal}
            <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                <Autocomplete
                    disablePortal
                    id="search-graph"
                    options={Object.entries(sources).map(([sourceName, _source]) => sourceName)}
                    onInputChange={(_event, newInputValue) => {
                        setFilteringChars(newInputValue);
                    }}
                    renderInput={(params) => <TextField {...params} label="Search Sources by name" />}
                />

                <TableContainer sx={{ height: "400px" }} component={Paper}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: "bold" }}>
                                    <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>
                                        Sources
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                    <TableSortLabel active={orderBy === "graphUri"} direction={order} onClick={() => handleRequestSort("graphUri")}>
                                        Graph URI
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                    <TableSortLabel active={orderBy === "graphSize"} direction={order} onClick={() => handleRequestSort("graphSize")}>
                                        Graph Size
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" style={{ fontWeight: "bold" }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ width: "100%", overflow: "visible" }}>
                            {memoizedSources
                                .filter((source) => source.name.includes(filteringChars))
                                .map((source) => {
                                    return (
                                        <TableRow key={source.name}>
                                            <TableCell>{source.name}</TableCell>
                                            <TableCell>
                                                <Link href={source.graphUri}>{source.graphUri}</Link>
                                            </TableCell>
                                            <TableCell align="center">{humanizeSize(getGraphSize(source, graphs))}</TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                    <Button
                                                        variant="contained"
                                                        disabled={
                                                            // @ts-expect-error FIXME
                                                            source.accessControl != "readwrite"
                                                        }
                                                        color="secondary"
                                                        value={source.name}
                                                        onClick={(event) => {
                                                            setCurrentSource(event.currentTarget.value);
                                                            setCurrentOperation(null);
                                                            setDisplayModal("upload");
                                                        }}
                                                    >
                                                        Upload
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        value={source.name}
                                                        onClick={(event) => {
                                                            setCurrentSource(event.currentTarget.value);
                                                            setCurrentOperation(null);
                                                            setDisplayModal("download");
                                                        }}
                                                    >
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
                <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                    <CsvDownloader
                        filename="graph-management.csv"
                        datas={memoizedSources.map((s) => {
                            return {
                                name: s.name,
                                graphUri: s.graphUri ?? "",
                                graphSize: getGraphSize(s, graphs).toString(),
                            };
                        })}
                    >
                        <Button variant="outlined">Download CSV</Button>
                    </CsvDownloader>
                </Stack>
            </Stack>
        </>
    );
}

window.GraphManagement.createApp = function createApp() {
    const container = document.getElementById("mount-graph-management-here");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const root = createRoot(container!);
    root.render(<GraphManagement />);
    return root.unmount.bind(root);
};

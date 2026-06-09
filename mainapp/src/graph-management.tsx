import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { Button, Chip, Link, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Typography, Alert, Snackbar } from "@mui/material";
import CsvDownloader from "react-csv-downloader";

import { humanizeSize, cleanUpText, getApiUrl, fetchMe } from "./Utils";

import { getGraphSize, GraphInfo, ServerSource } from "./Source";
import { UploadGraphModal } from "./Component/UploadGraphModal";
import { MetadataModal } from "./Component/MetadataModal";
import { DownloadGraphModal } from "./Component/DownloadGraphModal";
import { ButtonWithConfirmation } from "./Component/ButtonWithConfirmation";
import { SnackInfo, initialSnackInfo } from "./user-settings";

declare global {
    interface Window {
        GraphManagement: {
            createApp: () => void;
        };
    }
}

type OrderBy = "name" | "graphUri" | "graphSize" | "group";

export default function GraphManagement() {
    // user
    const [currentUser, setCurrentUser] = useState<{ login: string; token: string } | null>(null);

    // api url
    const [apiUrl, setApiUrl] = useState<string>("/");

    // sources fetched from server
    const [sources, setSources] = useState<Record<string, ServerSource>>({});

    // graph info
    const [graphs, setGraphs] = useState<GraphInfo[]>([]);

    // status of download/upload
    const [currentSource, setCurrentSource] = useState<ServerSource | null>(null);

    // modal
    const [displayModal, setDisplayModal] = useState<"upload" | "download" | "metadata" | null>(null);

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

    // error message
    const [snackInfo, setSnackInfo] = useState<SnackInfo>(initialSnackInfo);
    const onSnackbarClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason !== "clickaway") {
            setSnackInfo({ ...snackInfo, isOpen: false });
        }
    };

    useEffect(() => {
        const fetchAll = async () => {
            const apiUrl = await getApiUrl();
            const response = await fetchMe();
            setCurrentUser(response.user);
            setApiUrl(apiUrl);
        };
        void fetchAll();
        void fetchSources();
        void fetchGraphsInfo();
    }, []);

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

    const deleteGraph = async (source: ServerSource) => {
        const response = await fetch(`${apiUrl}api/v1/rdf/graph?source=${source.name}`, { method: "DELETE", headers: { Authorization: `Bearer ${currentUser?.token}` } });
        if (!response.ok) {
            const message = `Error when deleting RDF graph: ${response.statusText}`;
            setSnackInfo({ isOpen: true, message: message, severity: "error" });
            throw Error(message);
        } else {
            await fetchGraphsInfo();
        }
    };

    const handleCloseModal = async () => {
        setDisplayModal(null);
        await fetchGraphsInfo();
    };

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
        [sources, orderBy, order, graphs],
    );

    return (
        <>
            <Snackbar autoHideDuration={6000} open={snackInfo.isOpen} onClose={onSnackbarClose}>
                <Alert onClose={onSnackbarClose} severity={snackInfo.severity} sx={{ width: "100%" }}>
                    {snackInfo.message}
                </Alert>
            </Snackbar>
            {displayModal === "upload" && currentSource ? <UploadGraphModal apiUrl={apiUrl} indexAfterSuccess={true} open={true} onClose={handleCloseModal} sourceName={currentSource.name} /> : null}{" "}
            {displayModal === "download" && currentSource ? <DownloadGraphModal apiUrl={apiUrl} open={true} onClose={handleCloseModal} sourceName={currentSource.name} /> : null}
            {displayModal === "metadata" && currentSource ? (
                <MetadataModal open={true} onClose={() => setDisplayModal(null)} sourceName={currentSource.name} isReadOnly={currentSource.accessControl !== "readwrite"} />
            ) : null}
            <Stack direction="column" spacing={{ xs: 1 }} sx={{ m: 1 }} useFlexGap>
                <TextField
                    inputProps={{ autoComplete: "off" }}
                    label="Search Sources by name"
                    id="search-graph"
                    size="small"
                    onChange={(event) => {
                        setFilteringChars(event.target.value);
                    }}
                />

                <TableContainer sx={{ maxHeight: "calc(90vh - 220px)", overflow: "auto" }} component={Paper}>
                    <Table stickyHeader size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: "bold", width: "17%" }}>
                                    <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>
                                        Sources
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold", width: "18%" }}>
                                    <TableSortLabel active={orderBy === "graphUri"} direction={order} onClick={() => handleRequestSort("graphUri")}>
                                        Graph URI
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" style={{ fontWeight: "bold", width: "22%" }}>
                                    <TableSortLabel active={orderBy === "group"} direction={order} onClick={() => handleRequestSort("group")}>
                                        Group
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" style={{ fontWeight: "bold", width: "8%" }}>
                                    <TableSortLabel active={orderBy === "graphSize"} direction={order} onClick={() => handleRequestSort("graphSize")}>
                                        <Stack direction="column" spacing={0} sx={{ alignItems: "center", lineHeight: 1.2 }} useFlexGap>
                                            <div>Graph Size</div>
                                            <Typography variant="caption">(Triple)</Typography>
                                        </Stack>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" style={{ fontWeight: "bold", width: "35%", whiteSpace: "nowrap" }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ "& .MuiTableCell-body": { py: "20px" } }}>
                            {memoizedSources
                                .filter((source) => cleanUpText(source.name).includes(cleanUpText(filteringChars)))
                                .map((source) => {
                                    return (
                                        <TableRow key={source.name}>
                                            <TableCell sx={{ overflowWrap: "anywhere" }}>{source.name}</TableCell>
                                            <TableCell>
                                                <Link
                                                    href={source.graphUri}
                                                    target="_blank"
                                                    sx={{ overflowWrap: "anywhere" }}
                                                >
                                                    {source.graphUri}
                                                </Link>
                                            </TableCell>
                                            <TableCell align="center">{source.group ? <Chip label={source.group} size="small" /> : ""}</TableCell>
                                            <TableCell align="center" sx={{ width: 200 }}>
                                                {humanizeSize(getGraphSize(source, graphs))}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" justifyContent="center" spacing={0.5} useFlexGap>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ padding: "5px" }}
                                                        onClick={() => {
                                                            setCurrentSource(source);
                                                            setDisplayModal("metadata");
                                                        }}
                                                    >
                                                        Metadata
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disabled={source.accessControl != "readwrite"}
                                                        color="secondary"
                                                        sx={{ padding: "5px" }}
                                                        onClick={() => {
                                                            setCurrentSource(source);
                                                            setDisplayModal("upload");
                                                        }}
                                                    >
                                                        Upload
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="primary"
                                                        sx={{ padding: "5px" }}
                                                        onClick={() => {
                                                            setCurrentSource(source);
                                                            setDisplayModal("download");
                                                        }}
                                                    >
                                                        Download
                                                    </Button>
                                                    <ButtonWithConfirmation size="small" buttonSx={{ padding: "5px" }} label="Delete" func={deleteGraph} args={[source]} />
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

    const root = createRoot(container!);
    root.render(<GraphManagement />);
    return root.unmount.bind(root);
};

import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { Button, Chip, Link, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Typography } from "@mui/material";
import CsvDownloader from "react-csv-downloader";

import { humanizeSize, cleanUpText } from "./Utils";

import { getGraphSize, GraphInfo, ServerSource } from "./Source";
import { UploadGraphModal } from "./Component/UploadGraphModal";
import { MetadataModal } from "./Component/MetadataModal";
import { DownloadGraphModal } from "./Component/DownloadGraphModal";

declare global {
    interface Window {
        GraphManagement: {
            createApp: () => void;
        };
    }
}

type OrderBy = "name" | "graphUri" | "graphSize" | "group";

export default function GraphManagement() {
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

    useEffect(() => {
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
            {displayModal === "upload" && currentSource ? <UploadGraphModal indexAfterSuccess={true} open={true} onClose={() => setDisplayModal(null)} sourceName={currentSource.name} /> : null}{" "}
            {displayModal === "download" && currentSource ? <DownloadGraphModal open={true} onClose={() => setDisplayModal(null)} sourceName={currentSource.name} /> : null}
            {displayModal === "metadata" && currentSource ? (
                <MetadataModal open={true} onClose={() => setDisplayModal(null)} sourceName={currentSource.name} isReadOnly={currentSource.accessControl !== "readwrite"} />
            ) : null}
            <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                <TextField
                    inputProps={{ autoComplete: "off" }}
                    label="Search Sources by name"
                    id="search-graph"
                    onChange={(event) => {
                        setFilteringChars(event.target.value);
                    }}
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
                                    <TableSortLabel active={orderBy === "group"} direction={order} onClick={() => handleRequestSort("group")}>
                                        Group
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                    <TableSortLabel active={orderBy === "graphSize"} direction={order} onClick={() => handleRequestSort("graphSize")}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }} useFlexGap>
                                            <div>Graph Size</div>
                                            <Typography variant="caption">(Triple)</Typography>
                                        </Stack>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" style={{ fontWeight: "bold" }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ width: "100%", overflow: "visible" }}>
                            {memoizedSources
                                .filter((source) => cleanUpText(source.name).includes(cleanUpText(filteringChars)))
                                .map((source) => {
                                    return (
                                        <TableRow key={source.name}>
                                            <TableCell>{source.name}</TableCell>
                                            <TableCell>
                                                <Link href={source.graphUri} target="_blank">
                                                    {source.graphUri}
                                                </Link>
                                            </TableCell>
                                            <TableCell align="center">{source.group ? <Chip label={source.group} size="small" /> : ""}</TableCell>
                                            <TableCell align="center">{humanizeSize(getGraphSize(source, graphs))}</TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => {
                                                            setCurrentSource(source);
                                                            setDisplayModal("metadata");
                                                        }}
                                                    >
                                                        Metadata
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        disabled={source.accessControl != "readwrite"}
                                                        color="secondary"
                                                        onClick={() => {
                                                            setCurrentSource(source);
                                                            setDisplayModal("upload");
                                                        }}
                                                    >
                                                        Upload
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        onClick={() => {
                                                            setCurrentSource(source);
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

    const root = createRoot(container!);
    root.render(<GraphManagement />);
    return root.unmount.bind(root);
};

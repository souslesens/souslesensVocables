import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
} from "@mui/material";
import CalendarMonth from "@mui/icons-material/CalendarMonth";

import CsvDownloader from "react-csv-downloader";
import { SRD } from "srd";

import { useModel } from "../Admin";
import { Log, LogFiles, getLogs } from "../Log";
import { cleanUpText } from "../Utils";

type Order = "asc" | "desc";

export const LogsTable = () => {
    const { model } = useModel();

    return SRD.match(
        {
            notAsked: () => <p>Let&apos;s fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}
                </Alert>
            ),
            success: (logFiles) => {
                return <LogsTableComponent logFiles={logFiles} />;
            },
        },
        model.logFiles,
    );
};

function LogsTableComponent({ logFiles }: { logFiles: LogFiles }) {
    const [filteringChars, setFilteringChars] = useState("");
    const [orderBy, setOrderBy] = useState<keyof Log>("timestamp");
    const [order, setOrder] = useState<Order>("desc");

    const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(undefined);
    const [selectedLogs, setSelectedLogs] = useState<Log[]>([]);

    const handleRequestSort = (property: keyof Log) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleLogSelection = (event: ChangeEvent<HTMLInputElement>) => {
        setSelectedPeriod(event.target.value);
    };

    useEffect(() => {
        if (selectedPeriod !== undefined) {
            getLogs(selectedPeriod)
                .then((data) => setSelectedLogs(data))
                .catch(() => {
                    console.error("Error getting logs");
                    setSelectedLogs([]);
                });
        }
    }, [selectedPeriod]);

    const logFilesData = logFiles.message;
    if (selectedPeriod === undefined) {
        setSelectedPeriod(logFilesData.find((log) => log.current)?.date);
    }

    const memoizedLogs = useMemo(() => {
        return selectedLogs
            .map((item, index) => ({ ...item, key: index.toString() }))
            .slice()
            .sort((a: Log, b: Log) => {
                const left: string = a[orderBy];
                const right: string = b[orderBy];
                return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
            });
    }, [order, orderBy, selectedLogs]);

    if (logFiles.status === 500) {
        return (
            <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                {`${JSON.stringify(logFiles.message)}, consult the administrator of this instance for more information.`}
            </Alert>
        );
    } else if (logFiles.status !== 200) {
        return (
            <Alert variant="filled" severity="info" sx={{ m: 4 }}>
                {JSON.stringify(logFiles.message)}
            </Alert>
        );
    }

    return (
        <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
            <Stack direction="row" spacing={{ xs: 2 }} useFlexGap>
                <TextField
                    select
                    id="select-period"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <CalendarMonth />
                            </InputAdornment>
                        ),
                    }}
                    label="Select Period"
                    onChange={handleLogSelection}
                    size="medium"
                    value={selectedPeriod}
                >
                    {logFilesData.map((file, i) => (
                        <MenuItem key={i} value={file.date}>
                            {file.date}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    inputProps={{ autoComplete: "off" }}
                    label="Search logs by username"
                    id="search-logs"
                    onChange={(event) => {
                        setFilteringChars(event.target.value);
                    }}
                />
            </Stack>
            <TableContainer sx={{ height: "400px" }} component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" style={{ fontWeight: "bold" }}>
                                <TableSortLabel active={orderBy === "timestamp"} direction={order} onClick={() => handleRequestSort("timestamp")}>
                                    at
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" style={{ fontWeight: "bold" }}>
                                <TableSortLabel active={orderBy === "user"} direction={order} onClick={() => handleRequestSort("user")}>
                                    User
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" style={{ fontWeight: "bold" }}>
                                <TableSortLabel active={orderBy === "tool"} direction={order} onClick={() => handleRequestSort("tool")}>
                                    Tool
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" style={{ fontWeight: "bold" }}>
                                <TableSortLabel active={orderBy === "action"} direction={order} onClick={() => handleRequestSort("action")}>
                                    Action
                                </TableSortLabel>
                            </TableCell>
                            <TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                <TableSortLabel active={orderBy === "source"} direction={order} onClick={() => handleRequestSort("source")}>
                                    Source
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={{ width: "100%", overflow: "visible" }}>
                        {memoizedLogs
                            .filter((log) => cleanUpText(log.user).includes(cleanUpText(filteringChars)))
                            .map((log) => {
                                return (
                                    <TableRow key={log.key}>
                                        <TableCell align="center" style={{ whiteSpace: "nowrap" }}>
                                            {log.timestamp}
                                        </TableCell>
                                        <TableCell align="center">{log.user}</TableCell>
                                        <TableCell align="center">{log.tool}</TableCell>
                                        <TableCell align="center">{log.action}</TableCell>
                                        <TableCell>{log.source}</TableCell>
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
            <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                <CsvDownloader filename="logs.csv" datas={memoizedLogs}>
                    <Button variant="outlined">Download CSV</Button>
                </CsvDownloader>
            </Stack>
        </Stack>
    );
}

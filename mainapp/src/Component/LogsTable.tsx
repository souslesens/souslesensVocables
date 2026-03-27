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
import { Log, LogFiles, getLogsByDateRange } from "../Log";
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

    const [startPeriod, setStartPeriod] = useState<string | undefined>(undefined);
    const [endPeriod, setEndPeriod] = useState<string | undefined>(undefined);
    const [selectedLogs, setSelectedLogs] = useState<Log[]>([]);

    const handleRequestSort = (property: keyof Log) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleStartPeriodChange = (event: ChangeEvent<HTMLInputElement>) => {
        setStartPeriod(event.target.value);
    };

    const handleEndPeriodChange = (event: ChangeEvent<HTMLInputElement>) => {
        setEndPeriod(event.target.value);
    };

    useEffect(() => {
        if (startPeriod !== undefined && endPeriod !== undefined) {
            const startDate = startPeriod + "-01";
            const [year, month] = endPeriod.split("-");
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const endDate = `${endPeriod}-${lastDay}`;

            getLogsByDateRange(startDate, endDate)
                .then((data) => setSelectedLogs(data))
                .catch(() => {
                    console.error("Error getting logs");
                    setSelectedLogs([]);
                });
        }
    }, [startPeriod, endPeriod]);

    const logFilesData = logFiles.message;
    if (startPeriod === undefined) {
        setStartPeriod(logFilesData.find((log) => log.current)?.date);
    }
    if (endPeriod === undefined) {
        setEndPeriod(logFilesData.find((log) => log.current)?.date);
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
                    id="select-start-period"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <CalendarMonth />
                            </InputAdornment>
                        ),
                    }}
                    label="Start Period"
                    onChange={handleStartPeriodChange}
                    size="medium"
                    value={startPeriod ?? ""}
                >
                    {logFilesData.map((file, i) => (
                        <MenuItem key={i} value={file.date}>
                            {file.date}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    id="select-end-period"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <CalendarMonth />
                            </InputAdornment>
                        ),
                    }}
                    label="End Period"
                    onChange={handleEndPeriodChange}
                    size="medium"
                    value={endPeriod ?? ""}
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

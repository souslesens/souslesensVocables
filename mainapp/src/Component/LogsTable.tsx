import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";

import { Box, TextField, CircularProgress, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack, TableSortLabel } from "@mui/material";
import { useModel } from "../Admin";
import * as React from "react";
import { SRD } from "srd";
import { Log } from "../Log";
import CsvDownloader from "react-csv-downloader";

export const LogsTable = () => {
    const { model } = useModel();

    const [filteringChars, setFilteringChars] = React.useState("");
    const [orderBy, setOrderBy] = React.useState<keyof Log>("timestamp");
    const [order, setOrder] = React.useState<Order>("desc");
    type Order = "asc" | "desc";
    function handleRequestSort(property: keyof Log) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const renderLogs = SRD.match(
        {
            notAsked: () => <p>Let&aposs fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    ,<p>{`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}</p>
                </Box>
            ),
            success: (gotLogs: Log[]) => {
                const sortedLogs = () =>
                    gotLogs
                        .map((item, index) => ({ ...item, key: index }))
                        .slice()
                        .sort((a: Log, b: Log) => {
                            const left: string = a[orderBy];
                            const right: string = b[orderBy];
                            if (orderBy === "timestamp") {
                                return order === "asc" ? Number(new Date(left).getTime() > new Date(right).getTime()) : Number(new Date(left) < new Date(right));
                            }
                            return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                        });
                const memoizedLogs = React.useMemo(() => sortedLogs(), [gotLogs, orderBy, order]);
                const getOptions = () =>
                    memoizedLogs.filter(function (this: Set<string>, { user }) {
                        return !this.has(user) && this.add(user);
                    }, new Set());
                const memoizedOptions = React.useMemo(() => getOptions(), [gotLogs]);
                return (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <Stack>
                            <CsvDownloader filename="logs.csv" datas={gotLogs} />
                            <Autocomplete
                                disablePortal
                                id="search-logs"
                                options={memoizedOptions}
                                sx={{ width: 300 }}
                                onInputChange={(event, newInputValue) => {
                                    setFilteringChars(newInputValue);
                                }}
                                getOptionLabel={(option) => option.user}
                                renderOption={(props, option) => (
                                    <li {...props} key={option.key}>
                                        {option.user}
                                    </li>
                                )}
                                renderInput={(params) => <TextField {...params} label="Search logs by username" />}
                            />{" "}
                            <Box id="table-container" sx={{ justifyContent: "center", height: "400px", display: "flex" }}>
                                <TableContainer sx={{ height: "400px" }} component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell style={{ fontWeight: "bold" }}>User</TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>Tool</TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>Source</TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>
                                                    <TableSortLabel active={orderBy === "timestamp"} direction={order} onClick={() => handleRequestSort("timestamp")}>
                                                        at
                                                    </TableSortLabel>
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                            {memoizedLogs
                                                .filter((log) => log.user.includes(filteringChars))
                                                .map((log) => {
                                                    return (
                                                        <TableRow key={log.key}>
                                                            <TableCell>{log.user}</TableCell>
                                                            <TableCell>{log.tool}</TableCell>
                                                            <TableCell>{log.source}</TableCell>
                                                            <TableCell>{log.timestamp}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Stack>
                    </Box>
                );
            },
        },
        model.logs
    );

    return renderLogs;
};

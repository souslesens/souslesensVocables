import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";

import { Box, Button, TextField, CircularProgress, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack, TableSortLabel } from "@mui/material";
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
                    <Stack direction="column" spacing={{ xs: 2 }} sx={{ mx: 12, my: 4 }} useFlexGap>
                        <Autocomplete
                            disablePortal
                            id="search-logs"
                            options={memoizedOptions}
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
                        />
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
                                        <TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <TableSortLabel active={orderBy === "source"} direction={order} onClick={() => handleRequestSort("source")}>
                                                Source
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
                                                    <TableCell align="center" style={{ whiteSpace: "nowrap" }}>{log.timestamp}</TableCell>
                                                    <TableCell align="center">{log.user}</TableCell>
                                                    <TableCell align="center">{log.tool}</TableCell>
                                                    <TableCell>{log.source}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <CsvDownloader filename="logs.csv" datas={gotLogs}>
                                <Button variant="outlined">Download CSV</Button>
                            </CsvDownloader>
                        </Stack>
                     </Stack>
                );
            },
        },
        model.logs
    );

    return renderLogs;
};

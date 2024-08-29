import * as Mui from "@mui/material";
import * as MuiIcons from "@mui/icons-material";
import * as React from "react";

import CsvDownloader from "react-csv-downloader";
import { SRD } from "srd";

import { useModel } from "../Admin";
import { Log, getLogs } from "../Log";
import { cleanUpText } from "../Utils";

export const LogsTable = () => {
    const { model } = useModel();

    const [filteringChars, setFilteringChars] = React.useState("");
    const [orderBy, setOrderBy] = React.useState<keyof Log>("timestamp");
    const [order, setOrder] = React.useState<Order>("desc");

    const [selectedPeriod, setSelectedPeriod] = React.useState<string>(undefined);
    const [selectedLogs, setSelectedLogs] = React.useState<Log[]>([]);

    type Order = "asc" | "desc";

    const handleRequestSort = (property: keyof Log) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleLogSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedPeriod(event.target.value);
    };

    React.useEffect(() => {
        getLogs(selectedPeriod).then((data) => setSelectedLogs(data));
    }, [selectedPeriod]);

    return SRD.match(
        {
            notAsked: () => <p>Let&apos;s fetch some data!</p>,
            loading: () => (
                <Mui.Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <Mui.CircularProgress />
                </Mui.Box>
            ),
            failure: (msg: string) => (
                <Mui.Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}
                </Mui.Alert>
            ),
            success: () => {
                if (model.logFiles.data.status === 500) {
                    return (
                        <Mui.Alert variant="filled" severity="error" sx={{ m: 4 }}>
                            {`${model.logFiles.data.message}, consult the administrator of this instance for more information.`}
                        </Mui.Alert>
                    );
                }

                const logFilesData = model.logFiles.data.message;
                if (selectedPeriod === undefined) {
                    setSelectedPeriod(logFilesData.find((log) => log.current).date);
                }

                const sortedLogs = () =>
                    selectedLogs
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

                const memoizedLogs = React.useMemo(() => sortedLogs(), [selectedLogs, orderBy, order]);
                const getOptions = () =>
                    memoizedLogs.filter(function (this: Set<string>, { user }) {
                        return !this.has(user) && this.add(user);
                    }, new Set());
                const memoizedOptions = React.useMemo(() => getOptions(), [selectedLogs]);

                return (
                    <Mui.Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <Mui.Stack direction="row" spacing={{ xs: 2 }} useFlexGap>
                            <Mui.TextField
                                select
                                id="select-period"
                                InputProps={{
                                    startAdornment: (
                                        <Mui.InputAdornment position="start">
                                            <MuiIcons.CalendarMonth />
                                        </Mui.InputAdornment>
                                    ),
                                }}
                                label="Select Period"
                                onChange={handleLogSelection}
                                size="medium"
                                value={selectedPeriod}
                            >
                                {logFilesData.map((file, i) => (
                                    <Mui.MenuItem key={i} value={file.date}>
                                        {file.date}
                                    </Mui.MenuItem>
                                ))}
                            </Mui.TextField>
                            <Mui.TextField
                                label="Search logs by username"
                                id="search-logs"
                                onChange={(event) => {
                                    setFilteringChars(event.target.value);
                                }}
                            />
                        </Mui.Stack>
                        <Mui.TableContainer sx={{ height: "400px" }} component={Mui.Paper}>
                            <Mui.Table stickyHeader>
                                <Mui.TableHead>
                                    <Mui.TableRow>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <Mui.TableSortLabel active={orderBy === "timestamp"} direction={order} onClick={() => handleRequestSort("timestamp")}>
                                                at
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <Mui.TableSortLabel active={orderBy === "user"} direction={order} onClick={() => handleRequestSort("user")}>
                                                User
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <Mui.TableSortLabel active={orderBy === "tool"} direction={order} onClick={() => handleRequestSort("tool")}>
                                                Tool
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <Mui.TableSortLabel active={orderBy === "action"} direction={order} onClick={() => handleRequestSort("action")}>
                                                Action
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <Mui.TableSortLabel active={orderBy === "source"} direction={order} onClick={() => handleRequestSort("source")}>
                                                Source
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                    </Mui.TableRow>
                                </Mui.TableHead>
                                <Mui.TableBody sx={{ width: "100%", overflow: "visible" }}>
                                    {memoizedLogs
                                        .filter((log) => cleanUpText(log.user).includes(cleanUpText(filteringChars)))
                                        .map((log) => {
                                            return (
                                                <Mui.TableRow key={log.key}>
                                                    <Mui.TableCell align="center" style={{ whiteSpace: "nowrap" }}>
                                                        {log.timestamp}
                                                    </Mui.TableCell>
                                                    <Mui.TableCell align="center">{log.user}</Mui.TableCell>
                                                    <Mui.TableCell align="center">{log.tool}</Mui.TableCell>
                                                    <Mui.TableCell align="center">{log.action}</Mui.TableCell>
                                                    <Mui.TableCell>{log.source}</Mui.TableCell>
                                                </Mui.TableRow>
                                            );
                                        })}
                                </Mui.TableBody>
                            </Mui.Table>
                        </Mui.TableContainer>
                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <CsvDownloader filename="logs.csv" datas={memoizedLogs}>
                                <Mui.Button variant="outlined">Download CSV</Mui.Button>
                            </CsvDownloader>
                        </Mui.Stack>
                    </Mui.Stack>
                );
            },
        },
        model.logFiles
    );
};

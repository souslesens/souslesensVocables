import { ulid } from "ulid";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import Autocomplete from "@mui/material/Autocomplete";

import { RadioGroup, Box, CircularProgress, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack, SliderValueLabel } from "@mui/material";
import { useModel } from "../Admin";
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from "srd";
import { Log } from "../Log";
import { Button, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, Grid, InputLabel, MenuItem, Modal, Radio, Select, TextField } from "@material-ui/core";
import { identity, style } from "../Utils";

export const LogsTable = () => {
    const { model, updateModel } = useModel();

    const [filteringChars, setFilteringChars] = React.useState("");

    const renderLogs = SRD.match(
        {
            notAsked: () => <p>Let's fetch some data!</p>,
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
            success: (gotLogs: Log[]) => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <Stack>
                        <Autocomplete
                            disablePortal
                            id="search-logs"
                            options={gotLogs.map((log) => log.user)}
                            sx={{ width: 300 }}
                            onInputChange={(event, newInputValue) => {
                                setFilteringChars(newInputValue);
                            }}
                            renderInput={(params) => <TextField {...params} label="Search logs by username" />}
                        />{" "}
                        <Box id="table-container" sx={{ justifyContent: "center", height: "400px", display: "flex" }}>
                            <TableContainer sx={{ height: "400px" }} component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell style={{ fontWeight: "bold" }}>User</TableCell>
                                            <TableCell style={{ fontWeight: "bold" }}>tool</TableCell>
                                            <TableCell style={{ fontWeight: "bold" }}>at</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                        {gotLogs
                                            .filter((log) => log.user.includes(filteringChars))
                                            .map((log) => {
                                                return (
                                                    <TableRow key={log.timestamp}>
                                                        <TableCell>{log.user}</TableCell>

                                                        <TableCell>{log.tool}</TableCell>
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
            ),
        },
        model.logs
    );

    return renderLogs;
};

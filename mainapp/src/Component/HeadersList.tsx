import { MouseEvent, useEffect, useState } from "react";

import { Button, Dialog, DialogActions, DialogContent, IconButton, InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableRow, TextField } from "@mui/material";
import { Add, EditNote, Remove } from "@mui/icons-material";

import { sourceHelp } from "../Source";
import { HelpTooltip } from "./HelpModal";

type HeadersListProps = {
    headers: Record<string, string>;
    onSubmit: (headers: Record<string, string>) => void;
};

type HeadersDialogProps = {
    edit: boolean;
    open: boolean;
    onClose: () => void;
    onSubmit: (header: HeaderType) => void;
    selected?: HeaderType | null;
};

type HeaderType = {
    name: string;
    value: string;
};

const emptyHeader: HeaderType = { name: "", value: "" };

export const HeadersList = ({ headers, onSubmit }: HeadersListProps) => {
    const [edit, setEdit] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedHeader, setSelectedHeader] = useState<HeaderType>(emptyHeader);

    const handleClose = () => setOpen(false);
    const handleOpen = () => {
        setSelectedHeader(emptyHeader);
        setEdit(false);
        setOpen(true);
    };

    const handleEdit = (key: string) => {
        setSelectedHeader({ name: key, value: headers[key] });
        setEdit(true);
        setOpen(true);
    };

    const handleRemove = (key: string) => {
        delete headers[key];
        onSubmit(headers);
    };

    const handleSubmit = (data: { name: string; value: string }) => {
        setOpen(false);
        onSubmit({ ...headers, [data.name]: data.value });
    };

    return (
        <Stack spacing={1} useFlexGap>
            <Paper variant="outlined">
                <TableContainer>
                    <Table size="small" sx={{ width: "100%" }}>
                        <TableBody>
                            {Object.entries(headers).map(([key, value]) => (
                                <TableRow key={`header-${key}`}>
                                    <TableCell sx={{ whiteSpace: "nowrap" }} variant="head">
                                        {key}
                                    </TableCell>
                                    <TableCell sx={{ width: "100%", wordBreak: "break-all" }}>{value}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} useFlexGap>
                                            <IconButton aria-label="edit" onClick={() => handleEdit(key)} size="small" title="Edit">
                                                <EditNote />
                                            </IconButton>
                                            <IconButton aria-label="remove" onClick={() => handleRemove(key)} size="small" title="Remove">
                                                <Remove />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Button fullWidth onClick={handleOpen} size="small" startIcon={<Add />}>
                                        Add HTTP Header
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            <HeadersDialog edit={edit} open={open} onClose={handleClose} onSubmit={handleSubmit} selected={selectedHeader} />
        </Stack>
    );
};

const HeadersDialog = ({ edit, open, onClose, onSubmit, selected }: HeadersDialogProps) => {
    const [header, setHeader] = useState<HeaderType>(emptyHeader);

    useEffect(() => {
        if (!open) {
            setHeader(emptyHeader);
        } else {
            setHeader(selected as HeaderType);
        }
    }, [open, selected]);

    const handleField = (key: string, value: string) => setHeader({ ...header, [key]: value });

    const handleSubmit = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onSubmit(header);
    };

    return (
        <Dialog aria-labelledby="headers-dialog-title" aria-describedby="headers-dialog-description" fullWidth maxWidth="sm" open={open} onClose={onClose}>
            <DialogContent>
                <Stack spacing={2} useFlexGap>
                    {edit || (
                        <TextField
                            fullWidth
                            id="header-name"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <HelpTooltip title={sourceHelp.sparql_server.headers.key} />
                                    </InputAdornment>
                                ),
                            }}
                            label="Name"
                            name="name"
                            onChange={(e) => handleField(e.target.name, e.target.value)}
                            required
                            value={header.name}
                        />
                    )}
                    <TextField
                        fullWidth
                        id="header-value"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <HelpTooltip title={sourceHelp.sparql_server.headers.value} />
                                </InputAdornment>
                            ),
                        }}
                        label="Value"
                        name="value"
                        onChange={(e) => handleField(e.target.name, e.target.value)}
                        value={header.value}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose}>
                    Cancel
                </Button>
                <Button color="primary" onClick={handleSubmit}>
                    Submit
                </Button>
            </DialogActions>
        </Dialog>
    );
};

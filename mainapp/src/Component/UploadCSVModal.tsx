import { Done, Close, Folder, UploadFile } from "@mui/icons-material";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField } from "@mui/material";
import { ChangeEvent, MouseEvent, useState } from "react";

import { fetchMe, VisuallyHiddenInput } from "../Utils";

type UploadCSVModalProps = {
    apiUrl: string;
    databaseId: string;
    databaseName: string;
    onClose: () => void;
};

export const UploadCSVModal = ({ apiUrl, databaseId, databaseName, onClose }: UploadCSVModalProps) => {
    // The Python API handles Excel; the local fallback route only handles CSV.
    const isPythonApi = apiUrl !== "/";
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [table, setTable] = useState("");
    const [delimiter, setDelimiter] = useState(",");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleOpen = () => {
        setErrorMessage("");
        setSuccessMessage("");
        setFile(null);
        setTable("");
        setDelimiter(",");
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        onClose();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.currentTarget.files?.[0] ?? null;
        setFile(selectedFile);
        if (selectedFile) {
            setTable(selectedFile.name.replace(/\.[^.]+$/, ""));
        }
    };

    const handleSubmit = async (event: MouseEvent) => {
        event.preventDefault();
        if (!file) {
            setErrorMessage(isPythonApi ? "Please select a CSV or Excel file" : "Please select a CSV file");
            return;
        }
        if (!table) {
            setErrorMessage("Please provide a table name");
            return;
        }

        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const { user } = await fetchMe();
            const formData = new FormData();
            formData.append("data", file);
            formData.append("database", databaseId);
            formData.append("table", table);
            formData.append("delimiter", delimiter);

            const response = await fetch(`${apiUrl}api/v1/csv-to-db`, {
                method: "POST",
                headers: { Authorization: `Bearer ${user.token}` },
                body: formData,
            });

            if (response.status !== 200) {
                let reason = "Internal server error";
                try {
                    const json = (await response.json()) as { detail?: string; error?: string; message?: string };
                    reason = json.detail ?? json.error ?? json.message ?? reason;
                } catch {
                    reason = response.statusText || reason;
                }
                throw new Error(reason);
            }

            setSuccessMessage(`Data uploaded to table ${table}`);
        } catch (err) {
            setErrorMessage((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <IconButton color="primary" onClick={handleOpen} title="Upload CSV data into a database table">
                <UploadFile />
            </IconButton>
            <Dialog fullWidth={true} maxWidth="md" onClose={handleClose} open={open} PaperProps={{ component: "form" }}>
                <DialogTitle id="contained-modal-title-vcenter">{`Upload CSV${isPythonApi ? " or Excel" : ""} to ${databaseName}`}</DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                    <Stack spacing={2} useFlexGap>
                        {errorMessage ? (
                            <Alert variant="filled" severity="error">
                                {errorMessage}
                            </Alert>
                        ) : null}
                        {successMessage ? (
                            <Alert variant="filled" severity="success">
                                {successMessage}
                            </Alert>
                        ) : null}
                        <Stack spacing={1} sx={{ pt: 1 }}>
                            <Button color="info" component="label" disabled={loading} fullWidth role={undefined} startIcon={<Folder />} tabIndex={-1} variant="outlined">
                                {file ? file.name : `Select a CSV${isPythonApi ? " or Excel" : ""} file…`}
                                <VisuallyHiddenInput
                                    onChange={handleFileChange}
                                    type="file"
                                    accept={isPythonApi ? ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : ".csv,text/csv"}
                                />
                            </Button>
                            <TextField fullWidth id="table" label="Table" onChange={(event) => setTable(event.target.value)} required value={table} />
                            <TextField
                                disabled={file?.name.toLowerCase().endsWith(".xlsx") ?? false}
                                fullWidth
                                id="delimiter"
                                label="Delimiter"
                                onChange={(event) => setDelimiter(event.target.value)}
                                value={delimiter}
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="primary" disabled={loading} onClick={handleSubmit} startIcon={<Done />} type="submit" variant="contained">
                        Submit
                    </Button>
                    <Button color="error" onClick={handleClose} startIcon={<Close />} variant="outlined">
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

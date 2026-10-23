import { Done, Close, Folder, Upload } from "@mui/icons-material";
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
        setFile(event.currentTarget.files?.[0] ?? null);
    };

    const handleSubmit = async (event: MouseEvent) => {
        event.preventDefault();
        if (!file) {
            setErrorMessage("Please select a CSV file");
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
                const json = (await response.json()) as { detail?: string; error?: string };
                throw new Error(json.detail ?? json.error ?? "Internal server error");
            }

            setSuccessMessage(`CSV uploaded to table ${table}`);
        } catch (err) {
            setErrorMessage((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <IconButton color="primary" onClick={handleOpen} title="Upload CSV">
                <Upload />
            </IconButton>
            <Dialog fullWidth={true} maxWidth="md" onClose={handleClose} open={open} PaperProps={{ component: "form" }}>
                <DialogTitle id="contained-modal-title-vcenter">{`Upload CSV to ${databaseName}`}</DialogTitle>
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
                                {file ? file.name : "Select a CSV file…"}
                                <VisuallyHiddenInput onChange={handleFileChange} type="file" accept=".csv,text/csv" />
                            </Button>
                            <TextField fullWidth id="table" label="Table" onChange={(event) => setTable(event.target.value)} required value={table} />
                            <TextField fullWidth id="delimiter" label="Delimiter" onChange={(event) => setDelimiter(event.target.value)} value={delimiter} />
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

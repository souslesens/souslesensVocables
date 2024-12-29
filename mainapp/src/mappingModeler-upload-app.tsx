import { createRoot } from "react-dom/client";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";

import { Alert, Button, MenuItem, Select, Stack } from "@mui/material";
import { Done, Folder } from "@mui/icons-material";

import { VisuallyHiddenInput } from "./Utils";
import { data } from "jquery";

interface UploadFormData {
    displayForm: "database" | "file" | "";
    currentSource: string;
    selectedDatabase: string;
    selectedFiles: string[];
}

declare global {
    interface Window {
        DataSourceManager: {
            uploadFormData: UploadFormData;
            createDataBaseSourceMappings: () => void;
            createCsvSourceMappings: () => void;
            createApp: (uploadFormData: UploadFormData) => void;
        };
    }
}

export default function App(uploadFormData: UploadFormData) {
    const [databases, setDatabases] = useState<Record<string, string>[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState("_default");

    // error management
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        void fetchDatabases();
    }, []);

    const uploadFileHandler = (event: ChangeEvent<HTMLInputElement>) => {
        setError(false);
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setFiles(filesList);
    };

    const fileSubmitHandler = async (event: FormEvent) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append("path", uploadFormData.currentSource);
        files.forEach((file) => {
            formData.append(file.name, file);
        });

        const response = await fetch("/api/v1/upload", { method: "POST", body: formData });
        if (response.status === 201) {
            setError(false);
            // reload
            window.DataSourceManager.uploadFormData.selectedFiles = files.map((file) => file.name);
            window.DataSourceManager.createCsvSourceMappings();
        } else {
            setError(true);
            setErrorMessage("The upload did not works…");
        }
    };

    const fetchDatabases = async () => {
        const response = await fetch("/api/v1/databases");
        const json = (await response.json()) as { resources: Record<string, string>[] };
        setDatabases(json.resources);
    };

    const widget = (displayForm: string) => {
        if (displayForm === "database") {
            return (
                <Select
                    label="Select database"
                    onChange={(event) => {
                        const label = event.target.value;
                        const id = databases.find((database) => database.name === label)?.id;
                        setSelectedDatabase(label);
                        window.DataSourceManager.uploadFormData.selectedDatabase = {id:id,name:label};
                        window.DataSourceManager.createDataBaseSourceMappings();
                    }}
                    value={selectedDatabase}
                >
                    <MenuItem disabled value={"_default"}>
                        Select database
                    </MenuItem>
                    {databases.map((database) => (
                        <MenuItem key={database.id} value={database.name}> 
                            {database.name}
                        </MenuItem>
                    ))}
                </Select>
            );
        }

        if (displayForm === "file") {
            return (
                <Stack alignItems="flex-end" spacing={2} useFlexGap>
                    <Button color="info" component="label" fullWidth role={undefined} startIcon={<Folder />} tabIndex={-1} variant="outlined">
                        {files.length === 1 ? files[0].name : "Select a file to upload…"}
                        <VisuallyHiddenInput accept=".csv,.tsv" id="formUploadCSV" onChange={uploadFileHandler} type="file" />
                    </Button>
                    <Button disabled={files.length === 0} onClick={fileSubmitHandler} startIcon={<Done />} size="small" variant="contained">
                        Submit
                    </Button>
                </Stack>
            );
        }

        return <></>;
    };

    return (
        <Stack spacing={2} sx={{ width: 400 }} useFlexGap>
            {error ? (
                <Alert variant="filled" severity="error">
                    {errorMessage}
                </Alert>
            ) : null}
            {widget(window.DataSourceManager.uploadFormData.displayForm)}
        </Stack>
    );
}

window.DataSourceManager.createApp = function createApp(uploadFormData: UploadFormData) {
    const container = document.getElementById("mount-mappingModeler-upload-app-here");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const root = createRoot(container!);
    root.render(<App {...uploadFormData} />);
    return root.unmount.bind(root);
};

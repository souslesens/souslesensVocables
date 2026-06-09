import { createRoot } from "react-dom/client";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";

import { Alert, Button, MenuItem, Select, Stack, LinearProgress, Typography } from "@mui/material";
import { Done, Folder } from "@mui/icons-material";

import { VisuallyHiddenInput } from "./Utils";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

interface Database {
    id?: string;
    name: string;
}

interface UploadFormData {
    displayForm: "database" | "file" | "";
    currentSource: string;
    selectedDatabase: Database;
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

    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [currentChunk, setCurrentChunk] = useState(0);
    const [totalChunks, setTotalChunks] = useState(0);

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
        setUploadProgress(0);
        setIsUploading(false);
        setCurrentChunk(0);
        setTotalChunks(0);
    };

    const uploadChunk = async (file: File, uploadId: string, chunkIndex: number, totalChunks: number, isLastChunk: boolean): Promise<Record<string, unknown>> => {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunked", "true");
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", String(chunkIndex));
        formData.append("totalChunks", String(totalChunks));
        formData.append("filename", file.name);
        formData.append("path", uploadFormData.currentSource);
        formData.append("last", isLastChunk ? "true" : "false");
        formData.append("chunk", chunkBlob, `chunk_${chunkIndex}`);

        const response = await fetch("/api/v1/upload", { method: "POST", body: formData });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return response.json();
    };

    const fileSubmitHandler = async (event: FormEvent) => {
        event.preventDefault();
        if (files.length === 0) {
            return;
        }

        setError(false);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            for (const file of files) {
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                setTotalChunks(totalChunks);
                const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

                for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                    const isLastChunk = chunkIndex === totalChunks - 1;

                    try {
                        await uploadChunk(file, uploadId, chunkIndex, totalChunks, isLastChunk);

                        setCurrentChunk(chunkIndex + 1);
                        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                        setUploadProgress(progress);
                    } catch (chunkError) {
                        console.error(`Chunk ${chunkIndex} failed:`, chunkError);

                        await fetch(`/api/v1/upload?uploadId=${uploadId}`, { method: "DELETE" });

                        throw new Error(`Upload failed at chunk ${chunkIndex + 1}/${totalChunks}: ${(chunkError as Error).message}`);
                    }
                }
            }

            window.DataSourceManager.uploadFormData.selectedFiles = files.map((file) => file.name);
            window.DataSourceManager.createCsvSourceMappings();
        } catch (err) {
            setError(true);
            setErrorMessage((err as Error).message || "Upload failed");
            setIsUploading(false);
            return;
        }

        setIsUploading(false);
        setUploadProgress(100);
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
                        const id = databases.find((database) => database.database === label)?.id;
                        setSelectedDatabase(label);
                        window.DataSourceManager.uploadFormData.selectedDatabase = { id: id, name: label };
                        window.DataSourceManager.createDataBaseSourceMappings();
                    }}
                    value={selectedDatabase}
                >
                    <MenuItem disabled value={"_default"}>
                        Select database
                    </MenuItem>
                    {databases.map((database) => (
                        <MenuItem key={database.id} value={database.database}>
                            {database.database}
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
                    {isUploading && totalChunks > 0 && (
                        <Stack spacing={1} sx={{ width: "100%" }}>
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                {uploadProgress}%
                            </Typography>
                            <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 1 }} />
                        </Stack>
                    )}
                    <Button disabled={files.length === 0 || isUploading} onClick={fileSubmitHandler} startIcon={<Done />} size="small" variant="contained">
                        {isUploading ? "Uploading..." : "Submit"}
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

    const root = createRoot(container!);
    root.render(<App {...uploadFormData} />);
    return root.unmount.bind(root);
};

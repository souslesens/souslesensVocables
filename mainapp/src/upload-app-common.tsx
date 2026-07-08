import { createRoot } from "react-dom/client";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";

import { Alert, Button, MenuItem, Select, Stack, LinearProgress, Typography } from "@mui/material";
import { Done, Folder } from "@mui/icons-material";

import { VisuallyHiddenInput, sanitizeFileName } from "./Utils";

const CHUNK_SIZE = 10 * 1024 * 1024;

interface Database {
    id?: string;
    name: string;
}

interface UploadFormDataString {
    displayForm: "database" | "file" | "";
    currentSource: string;
    selectedDatabase: string;
    selectedFiles: string[];
}

interface UploadFormDataObject {
    displayForm: "database" | "file" | "";
    currentSource: string;
    selectedDatabase: Database;
    selectedFiles: string[];
}

interface DatabaseConfig {
    valueKey: string;
    databaseValueType: "string" | "object";
}

interface UploadAppConfig {
    namespaceObject: {
        uploadFormData: {
            displayForm: "database" | "file" | "";
            currentSource: string;
            selectedDatabase: unknown;
            selectedFiles: string[];
        };
        createDataBaseSourceMappings: () => void;
        createCsvSourceMappings: () => void;
        createApp: () => void;
    };
    containerId: string;
    databaseConfig: DatabaseConfig;
}

interface DatabaseResponse {
    id: string;
    database?: string;
    name: string;
}

export function createUploadApp(config: UploadAppConfig) {
    function App() {
        const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
        const [files, setFiles] = useState<File[]>([]);
        const [selectedDatabase, setSelectedDatabase] = useState("_default");

        const [error, setError] = useState(false);
        const [errorMessage, setErrorMessage] = useState("");

        const [uploadProgress, setUploadProgress] = useState(0);
        const [isUploading, setIsUploading] = useState(false);
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
            const sanitizedFiles = filesList.map((file) => new File([file], sanitizeFileName(file.name), { type: file.type }));
            setFiles(sanitizedFiles);
            setUploadProgress(0);
            setIsUploading(false);
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
            formData.append("path", config.namespaceObject.uploadFormData.currentSource);
            formData.append("last", isLastChunk ? "true" : "false");
            formData.append("chunk", chunkBlob, `chunk_${chunkIndex}`);

            const response = await fetch("/api/v1/upload", { method: "POST", body: formData });

            if (!response.ok) {
                const errorData = (await response.json().catch(() => ({}))) as { message?: string };
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return (await response.json()) as Record<string, unknown>;
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

                            const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                            setUploadProgress(progress);
                        } catch (chunkError) {
                            console.error(`Chunk ${chunkIndex} failed:`, chunkError);

                            await fetch(`/api/v1/upload?uploadId=${uploadId}`, { method: "DELETE" });

                            throw new Error(`Upload failed at chunk ${chunkIndex + 1}/${totalChunks}: ${(chunkError as Error).message}`);
                        }
                    }
                }

                config.namespaceObject.uploadFormData.selectedFiles = files.map((file) => file.name);
                config.namespaceObject.createCsvSourceMappings();
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
            const json = (await response.json()) as { resources: DatabaseResponse[] };
            setDatabases(json.resources);
        };

        const widget = (displayForm: string) => {
            if (displayForm === "database") {
                return (
                    <Select
                        label="Select database"
                        onChange={(event) => {
                            const label = event.target.value;
                            setSelectedDatabase(label);

                            if (config.databaseConfig.databaseValueType === "object") {
                                const id = databases.find((db) => db[config.databaseConfig.valueKey as keyof DatabaseResponse] === label)?.id;
                                (config.namespaceObject.uploadFormData as UploadFormDataObject).selectedDatabase = { id, name: label };
                            } else {
                                (config.namespaceObject.uploadFormData as UploadFormDataString).selectedDatabase = label;
                            }

                            config.namespaceObject.createDataBaseSourceMappings();
                        }}
                        value={selectedDatabase}
                    >
                        <MenuItem disabled value={"_default"}>
                            Select database
                        </MenuItem>
                        {databases.map((database) => (
                            <MenuItem key={database.id} value={database[config.databaseConfig.valueKey as keyof DatabaseResponse] as string}>
                                {database[config.databaseConfig.valueKey as keyof DatabaseResponse] as string}
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
                {widget(config.namespaceObject.uploadFormData.displayForm)}
            </Stack>
        );
    }

    config.namespaceObject.createApp = function createApp() {
        const container = document.getElementById(config.containerId);

        const root = createRoot(container!);
        root.render(<App />);
        return root.unmount.bind(root);
    };
}

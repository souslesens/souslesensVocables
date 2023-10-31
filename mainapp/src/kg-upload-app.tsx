import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";

import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";
import Alert from "react-bootstrap/Alert";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";

declare global {
    interface Window {
        KGcreator: {
            listFiles: (subDir: string) => void;
            listTables: (subDir: string) => void;
            createDataBaseSourceMappings: () => void;
            createCsvSourceMappings: () => void;
            currentSourceType: string;
            uploadFormData: any;
        };
    }
}

export default function App({ uploadFormData }: { uploadFormData: any }) {
    const [sourceType, setSourceType] = useState("");
    const [subDirs, setSubDirs] = useState<string[]>([]);
    const [subDir, setSubDir] = useState("");
    const [databases, setDatabases] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [serverfiles, setServerFiles] = useState<string[]>([]);
    const [uploadStatus, setUploadStatus] = useState("");
    const [displayNewSubDirForm, setDisplayNewSubDirForm] = useState(false);
    const [sources, setSources] = useState<string[]>([]);
    const [selectedNewSource, setSelectedNewSource] = useState("");
    const [createDirSuccess, setCreateDirSuccess] = useState(false);
    const [selectedDatabase, setSelectedDatabase] = useState("_default");
    const [selectedFile, setSelectedFile] = useState("_default");

    useEffect(() => {
        void fetchSubDirs();
    }, [uploadStatus, createDirSuccess]);

    useEffect(() => {
        if (subDir != "") {
            void fetchFilesInSubDir(subDir);
        }
    }, [subDir, uploadStatus]);

    useEffect(() => {
        void fetchDatabases();
    }, []);

    useEffect(() => {
        void fetchSources();
    }, []);

    useEffect(() => {
        void fetchFiles();
    }, []);

    const uploadFileHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUploadStatus("");
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setFiles(filesList);
    };

    const fileSubmitHandler = async (event: React.FormEvent) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append("path", uploadFormData.currentSource);
        files.forEach((file) => {
            formData.append(file.name, file);
        });

        const response = await fetch("/api/v1/upload", { method: "POST", body: formData });
        if (response.status === 201) {
            setUploadStatus("success");
            // reload
            await fetchFiles()
        } else {
            setUploadStatus("error");
            // todo: display error message
        }
    };

    const fetchSources = async () => {
        const response = await fetch("/api/v1/sources");
        const json = (await response.json()) as { resources: Record<string, any> };
        const fetchedSources = Object.keys(json.resources);
        setSources(fetchedSources);
    };

    const fetchDatabases = async () => {
        const response = await fetch("/api/v1/kg/data?type=sql.sqlserver&dbName=master&sqlQuery=SELECT name FROM sys.databases");
        const json = (await response.json()) as { name: string }[];
        const dbs = json.map((db) => {
            return db.name;
        });
        setDatabases(dbs);
    };

    const fetchSubDirs = async () => {
        const response = await fetch("/api/v1/data/files?dir=CSV");
        const json = (await response.json()) as string[];
        setSubDirs(json);
    };

    const fetchFiles = async () => {
        const response = await fetch("/api/v1/data/files?dir=CSV/" + window.KGcreator.uploadFormData.currentSource);
        const files = (await response.json()) as string[];
        setServerFiles(files)
    }

    const fetchFilesInSubDir = async (subDir: string) => {
        const response = await fetch("/api/v1/data/files?dir=CSV/" + subDir);
        (await response.json()) as string[];
        // update js app
        window.KGcreator.listFiles(subDir);
    };

    const handleSourceTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setUploadStatus("");
        setFiles([]);
        setSourceType(event.currentTarget.value);
        // update js app
        window.KGcreator.currentSourceType = event.currentTarget.value === "files" ? "CSV" : "DATABASE";
    };

    const handleSubDirChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setUploadStatus("");
        setFiles([]);
        if (event.currentTarget.value === "_newsubdir") {
            setSubDir("");
            setDisplayNewSubDirForm(true);
            setUploadStatus("");
        } else {
            setSubDir(event.currentTarget.value);
            setDisplayNewSubDirForm(false);
        }
    };

    const handleNewSubDirChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedNewSource(event.currentTarget.value);
    };

    const handleDatabaseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const db = event.currentTarget.value;
        setSelectedDatabase(db);
        window.KGcreator.uploadFormData.selectedDatabase = db;
        window.KGcreator.createDataBaseSourceMappings();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const file = event.currentTarget.value;
        setSelectedFile(file);
        window.KGcreator.uploadFormData.selectedFile = file
        window.KGcreator.createCsvSourceMappings();
    };

    const handleClickNewSubDir = async () => {
        // create subdir serverside
        const formData = new FormData();
        formData.append("dir", "CSV");
        formData.append("newDirName", selectedNewSource);
        await fetch("/api/v1/data/dir", { method: "POST", body: formData });
        setSelectedNewSource("");
        setDisplayNewSubDirForm(false);
        setSubDir(selectedNewSource);
        setCreateDirSuccess(true);
    };

    const selectDatabaseOrFiles = (
        <Form.Select defaultValue="_default" onChange={handleSourceTypeChange} aria-label="">
            <option value="_default" disabled={true}>
                Select source type
            </option>
            <option value="database">Database</option>
            <option value="files">Files</option>
        </Form.Select>
    );

    const selectSubDir = (
        <Form.Select value={subDir === "" ? "_default" : subDir} defaultValue="_default" onChange={handleSubDirChange} aria-label="Default select example">
            <option value="_default" disabled={true}>
                Select directory
            </option>
            {subDirs.map((dir) => {
                return (
                    <option key={dir} value={dir}>
                        {dir}
                    </option>
                );
            })}
            <option value="_newsubdir">+ Add new directory</option>
        </Form.Select>
    );

    const selectDatabase = (
        <Form.Select defaultValue="_default" value={selectedDatabase} onChange={handleDatabaseChange} aria-label="Select database">
            <option value="_default" disabled={true}>
                Select database
            </option>
            {databases.map((database) => {
                return (
                    <option key={database} value={database}>
                        {database}
                    </option>
                );
            })}
        </Form.Select>
    );

    const selectFiles = (
        <Form.Select defaultValue="_default" value={selectedFile} onChange={handleFileChange} aria-label="Select file">
            <option value="_default" disabled={true}>
                Select file
            </option>
            {serverfiles.map((file) => {
                return (
                    <option key={file} value={file}>
                        {file}
                    </option>
                );
            })}
        </Form.Select>
    );
    const browseForm = (
        <Form.Group controlId="formFileMultiple" className="mb-3">
            <Form.Control name="files" type="file" multiple accept=".csv,.tsv" onChange={uploadFileHandler} />
            <Form.Text color="muted">
                <p>Supported files: CSV</p>
            </Form.Text>
        </Form.Group>
    );

    const _u_progressBars = files.map((file) => {
        return (
            <div key={file.name} className="mb-1">
                <div className="text-center">{file.name}</div>
                <ProgressBar now={uploadStatus === "success" ? 100 : 0} label={`${uploadStatus === "success" ? 100 : 0}%`} />
            </div>
        );
    });

    const uploadButton = (
        <div className="mb-3">
            <Button variant="primary" onClick={fileSubmitHandler}>
                <FontAwesomeIcon icon={uploadStatus === "success" ? faCheck : uploadStatus === "error" ? faTimes : faFile} /> Upload {files.length} {files.length === 1 ? "file" : "files"}
            </Button>
        </div>
    );

    const newSubDirForm = (
        <Form.Select defaultValue="_default" aria-label="select-new-source" onChange={handleNewSubDirChange}>
            <option value="_default" disabled={true}>
                Select source
            </option>
            {sources.map((source) => (
                <option key={source} value={source}>
                    {source}
                </option>
            ))}
        </Form.Select>
    );

    const errorMessage = (message: string) => <Alert variant="danger">{message}</Alert>;

    if (window.KGcreator.uploadFormData.displayForm == "database") {
        return <Col className="mb-3 px-1">{selectDatabase}</Col>;
    }
    if (window.KGcreator.uploadFormData.displayForm == "file") {
        return (
            <>
                <Row>
                    <Col className="mb-3 px-1">{selectFiles}</Col>
                </Row>
                <Row>
                    {browseForm}
                    {files.length > 0 ? uploadButton : null}
                    {uploadStatus === "error" ? errorMessage("Error during upload") : null}
                </Row>
            </>
        );
    }
    return <></>;
}

const container = document.getElementById("mount-kg-upload-app-here");
const root = createRoot(container!);
root.render(<App uploadFormData={window.KGcreator.uploadFormData} />);

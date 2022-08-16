import * as React from "react";
import * as ReactDOM from "react-dom";
import { useState, useEffect } from "react";

import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faCheck } from "@fortawesome/free-solid-svg-icons";

declare global {
    interface Window {
        KGcreator: {
            listFiles: (subDir: string) => void;
            listTables: (subDir: string) => void;
            currentSourceType: string;
        };
    }
}

export default function App() {
    const [sourceType, setSourceType] = useState("");
    const [subDirs, setSubDirs] = useState<string[]>([]);
    const [subDir, setSubDir] = useState("");
    const [databases, setDatabases] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [displayNewSubDirForm, setDisplayNewSubDirForm] = useState(false);
    const [sources, setSources] = useState<string[]>([]);
    const [selectedNewSource, setSelectedNewSource] = useState("");
    const [createDirSuccess, setCreateDirSuccess] = useState(false);
    const [selectedDatabase, setSelectedDatabase] = useState("_default");

    useEffect(() => {
        void fetchSubDirs();
    }, [uploadSuccess, createDirSuccess]);

    useEffect(() => {
        if (subDir != "") {
            void fetchFilesInSubDir(subDir);
        }
    }, [subDir, uploadSuccess]);

    useEffect(() => {
        void fetchDatabases();
    }, []);

    useEffect(() => {
        void fetchSources();
    }, []);

    const uploadFileHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUploadSuccess(false);
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setFiles(filesList);
    };

    const fileSubmitHandler = async (event: React.FormEvent) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append("path", subDir);
        files.forEach((file) => {
            formData.append(file.name, file);
        });

        const response = await fetch("/api/v1/upload", { method: "POST", body: formData });
        if (response.status === 201) {
            setUploadSuccess(true);
        } else {
            setUploadSuccess(false);
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
        const response = await fetch("/api/v1/kg/data?type=sql.sqlserver&dbName=TEPDK2&sqlQuery=SELECT name FROM sys.databases");
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

    const fetchFilesInSubDir = async (subDir: string) => {
        const response = await fetch("/api/v1/data/files?dir=CSV/" + subDir);
        (await response.json()) as string[];
        // update js app
        window.KGcreator.listFiles(subDir);
    };

    const handleSourceTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setUploadSuccess(false);
        setFiles([]);
        setSourceType(event.currentTarget.value);
        // update js app
        window.KGcreator.currentSourceType = event.currentTarget.value === "files" ? "CSV" : "DATABASE";
    };

    const handleSubDirChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setUploadSuccess(false);
        setFiles([]);
        if (event.currentTarget.value === "_newsubdir") {
            setSubDir("");
            setDisplayNewSubDirForm(true);
            setUploadSuccess(false);
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
        window.KGcreator.listTables(db);
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
                Select source
            </option>
            {subDirs.map((dir) => {
                return (
                    <option key={dir} value={dir}>
                        {dir}
                    </option>
                );
            })}
            <option value="_newsubdir">+ Add new source</option>
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

    const browseForm = (
        <Form.Group controlId="formFileMultiple" className="mb-3">
            <Form.Control name="files" type="file" multiple accept=".csv,.tsv" onChange={uploadFileHandler} />
            <Form.Text color="muted">
                <p>Supported files: CSV/TSV. Maximum file size is 4GB</p>
            </Form.Text>
        </Form.Group>
    );

    const progressBars = files.map((file) => {
        return (
            <div key={file.name} className="mb-1">
                <div className="text-center">{file.name}</div>
                <ProgressBar now={uploadSuccess ? 100 : 0} label={`${uploadSuccess ? 100 : 0}%`} />
            </div>
        );
    });

    const uploadButton = (
        <div className="mb-3">
            <Button variant="primary" onClick={fileSubmitHandler}>
                <FontAwesomeIcon icon={uploadSuccess ? faCheck : faFile} /> Upload {files.length} {files.length === 1 ? "file" : "files"}
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

    return (
        <Container fluid>
            <Row>
                <Col className="mb-3 pe-1">{selectDatabaseOrFiles}</Col>
                {sourceType === "files" ? <Col className="mb-3 px-1">{selectSubDir}</Col> : null}
                {sourceType === "database" ? <Col className="mb-3 px-1">{selectDatabase}</Col> : null}
            </Row>
            <Row>
                {sourceType === "files" && subDir != "" ? browseForm : null}
                {/*sourceType === "files" && subDir != "" && files.length > 0 ? progressBars : null*/}
                {sourceType === "files" && subDir != "" && files.length > 0 ? uploadButton : null}
            </Row>
            <Row>
                <Col className="pe-1">{displayNewSubDirForm ? newSubDirForm : null}</Col>
                <Col className="ps-1">
                    {displayNewSubDirForm ? (
                        <Button onClick={handleClickNewSubDir} variant="secondary">
                            Add
                        </Button>
                    ) : null}
                </Col>
            </Row>
        </Container>
    );
}

ReactDOM.render(<App />, document.getElementById("mount-kg-upload-app-here"));

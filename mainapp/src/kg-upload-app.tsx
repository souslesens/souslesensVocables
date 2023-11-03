import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";

import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";

declare global {
    interface Window {
        KGcreator: {
            createDataBaseSourceMappings: () => void;
            createCsvSourceMappings: () => void;
            uploadFormData: {
                displayForm: "database" | "file" | "";
                currentSource: string;
                selectedDatabase: string;
                selectedFiles: string[];
            };
        };
    }
}

export default function App({ uploadFormData }: { uploadFormData: any }) {
    const [databases, setDatabases] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadStatus, setUploadStatus] = useState("");
    const [selectedDatabase, setSelectedDatabase] = useState("_default");

    useEffect(() => {
        void fetchDatabases();
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
            window.KGcreator.uploadFormData.selectedFiles = files.map((file) => file.name)
            window.KGcreator.createCsvSourceMappings();
        } else {
            setUploadStatus("error");
            // todo: display error message
        }
    };

    const fetchDatabases = async () => {
        const response = await fetch("/api/v1/kg/data?type=sql.sqlserver&dbName=master&sqlQuery=SELECT name FROM sys.databases");
        const json = (await response.json()) as { name: string }[];
        const dbs = json.map((db) => {
            return db.name;
        });
        setDatabases(dbs);
    };

    const handleDatabaseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const db = event.currentTarget.value;
        setSelectedDatabase(db);
        window.KGcreator.uploadFormData.selectedDatabase = db;
        window.KGcreator.createDataBaseSourceMappings();
    };

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
                <p>Supported files: CSV</p>
            </Form.Text>
        </Form.Group>
    );

    const uploadButton = (
        <div className="mb-3">
            <Button variant="primary" onClick={fileSubmitHandler}>
                <FontAwesomeIcon icon={uploadStatus === "success" ? faCheck : uploadStatus === "error" ? faTimes : faFile} /> Upload {files.length} {files.length === 1 ? "file" : "files"}
            </Button>
        </div>
    );

    const errorMessage = (message: string) => <Alert variant="danger">{message}</Alert>;

    if (window.KGcreator.uploadFormData.displayForm == "database") {
        return <Col className="mb-3 px-1">{selectDatabase}</Col>;
    }
    if (window.KGcreator.uploadFormData.displayForm == "file") {
        return (
            <>
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

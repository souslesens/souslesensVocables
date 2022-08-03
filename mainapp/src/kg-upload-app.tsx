import * as React from "react";
import * as ReactDOM from "react-dom";
import { useState, useEffect } from "react";

import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";
import Table from "react-bootstrap/Table";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faCheck } from "@fortawesome/free-solid-svg-icons";

export default function App() {
    const [sourceType, setSourceType] = useState("");
    const [subDirs, setSubDirs] = useState(Array());
    const [subDir, setSubDir] = useState("");
    const [filesInSubDir, setFilesInSubDir] = useState(Array());

    const [files, setFiles] = useState(Array());
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        fetchSubDirs();
    }, [uploadSuccess]);

    useEffect(() => {
        if (subDir != "") {
            fetchFilesInSubDir(subDir);
        }
    }, [subDir, uploadSuccess]);

    const uploadFileHandler = (event: any) => {
        setUploadSuccess(false);
        const filesList = Array.from(event.target.files);
        const filesNameList = filesList.map((file: any) => {
            return file.name;
        });
        setFilesName(filesNameList);
        setFiles(filesList);
    };

    const fileSubmitHandler = (event: any) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append("path", subDir);
        files.forEach((file: any) => {
            formData.append("files", file);
        });

        fetch("/api/v1/upload", { method: "POST", body: formData }).then(async (response) => {
            console.log(response);
            setUploadSuccess(true);
        });
    };

    const fetchSubDirs = async () => {
        const response = await fetch("/api/v1/data/files?dir=CSV");
        const json = await response.json();
        setSubDirs(json);
    };

    const fetchFilesInSubDir = async (subDir: string) => {
        const response = await fetch("/api/v1/data/files?dir=CSV/" + subDir);
        const json = await response.json();
        setFilesInSubDir(json);
    };

    const handleSourceTypeChange = (event: any) => {
        setUploadSuccess(false);
        setFiles(Array());
        setSourceType(event.target.value);
    };

    const handleSubDirChange = (event: any) => {
        setUploadSuccess(false);
        setFiles(Array());
        setSubDir(event.target.value);
    };

    const selectDatabaseOrFiles = (
        <Form.Select onChange={handleSourceTypeChange} aria-label="">
            <option disabled={true} selected={true}>
                Select source type
            </option>
            <option value="database">Database</option>
            <option value="files">Files</option>
        </Form.Select>
    );

    const selectSubDir = (
        <Form.Select onChange={handleSubDirChange} aria-label="Default select example">
            <option disabled={true} selected={true}>
                Select source
            </option>
            {subDirs.map((dir) => {
                return <option value={dir}>{dir}</option>;
            })}
        </Form.Select>
    );

    const fileTable = (
        <Container>
            <Table striped>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
                    {filesInSubDir.map((file) => {
                        return (
                            <tr>
                                <td>{file}</td>
                                <td>1MB</td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </Container>
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
            <div className="mb-1">
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

    return (
        <Container fluid>
            <Row>
                <Col className="pe-1">{selectDatabaseOrFiles}</Col>
                {sourceType === "files" ? <Col className="ps-1">{selectSubDir}</Col> : null}
            </Row>
            <Row>
                {filesInSubDir.length > 0 && sourceType === "files" ? fileTable : null}
                {sourceType === "files" && subDir != "" ? browseForm : null}
                {/*sourceType === "files" && subDir != "" && files.length > 0 ? progressBars : null*/}
                {sourceType === "files" && subDir != "" && files.length > 0 ? uploadButton : null}
            </Row>
        </Container>
    );
}

ReactDOM.render(<App />, document.getElementById("mount-kg-upload-app-here"));

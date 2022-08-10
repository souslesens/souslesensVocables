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

declare global {
    interface Window { KGcreator: any; }
}

export default function App() {
    const [sourceType, setSourceType] = useState("");
    const [subDirs, setSubDirs] = useState(Array());
    const [subDir, setSubDir] = useState("");
    const [filesInSubDir, setFilesInSubDir] = useState(Array());

    const [files, setFiles] = useState(Array());
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const [displayNewSubDirForm , setDisplayNewSubDirForm] = useState(false);
    const [sources, setSources] = useState(Array())
    const [selectedNewSource, setSelectedNewSource] = useState("")
    const [createDirSuccess, setCreateDirSuccess] = useState(false)

    useEffect(() => {
        fetchSubDirs();
    }, [uploadSuccess, createDirSuccess]);

    useEffect(() => {
        if (subDir != "") {
            fetchFilesInSubDir(subDir);
        }
    }, [subDir, uploadSuccess]);

    useEffect(() => {
        fetchSources()
    }, [])


    const uploadFileHandler = (event: any) => {
        setUploadSuccess(false);
        const filesList = Array.from(event.target.files);
        const filesNameList = filesList.map((file: any) => {
            return file.name;
        });
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

    const fetchSources = async () => {
        const response = await fetch("/api/v1/sources")
        const json = await response.json()
        console.log(json.resources)
        const fetchedSources = Object.keys(json.resources).map((key) => {
            return key
        })
        console.log(fetchedSources)
        setSources(fetchedSources)
    }

    const fetchSubDirs = async () => {
        const response = await fetch("/api/v1/data/files?dir=CSV");
        const json = await response.json();
        setSubDirs(json);
    };

    const fetchFilesInSubDir = async (subDir: string) => {
        const response = await fetch("/api/v1/data/files?dir=CSV/" + subDir);
        const json = await response.json();
        // update js app
        window.KGcreator.listFiles(subDir) || {}
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
        if (event.target.value === "_newsubdir") {
            setFilesInSubDir(Array())
            setSubDir("")
            setDisplayNewSubDirForm(true)
            setUploadSuccess(false)
        } else {
            setSubDir(event.target.value);
            setDisplayNewSubDirForm(false)
        }
    };

    const handleNewSubDirChange = (event: any) => {
        setSelectedNewSource(event.target.value)
    }

    const handleClickNewSubDir = (event: any) => {
        console.log("Add " + selectedNewSource + " source")
        // create subdir serverside
        const formData = new FormData();
        formData.append("dir", "CSV");
        formData.append("newDirName", selectedNewSource);
        fetch("/api/v1/data/dir", { method: "POST", body: formData }).then(async (response) => {
            console.log(response);
            setSelectedNewSource("")
            setDisplayNewSubDirForm(false)
            setSubDir(selectedNewSource)
            setCreateDirSuccess(true)
        });

    }

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
            {subDirs.map((dir, index) => {
                return <option key={"select-subdir-" + index} value={dir}>{dir}</option>;
            })}
            <option value="_newsubdir">+ Add new source</option>
        </Form.Select>
    );

    const fileTable = (
        <Container className="mb-3 overflow-auto" style={{maxHeight: "500px"}}>
            <Table striped>
                <thead>
                    <tr>
                        <th>Name</th>
                    </tr>
                </thead>
                <tbody>
                    {filesInSubDir.map((file, index) => {
                        return (
                            <tr key={"file-table-tr-" + index}>
                                <td>{file}</td>
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

    const newSubDirForm = (
        <Form.Select defaultValue="_default" aria-label="select-new-source" onChange={handleNewSubDirChange}>
            <option value="_default" disabled={true}>
                Select source
            </option>
            {sources.map((source, index) => {
                return <option key={"select-source-" + index} value={source}>{source}</option>;
            })}
        </Form.Select>
    );

    return (
        <Container fluid>
            <Row>
                <Col className="mb-3 pe-1">{selectDatabaseOrFiles}</Col>
                {sourceType === "files" ? <Col className="mb-3 px-1">{selectSubDir}</Col> : null}
            </Row>
            <Row>
                {sourceType === "files" && subDir != "" ? browseForm : null}
                {/*sourceType === "files" && subDir != "" && files.length > 0 ? progressBars : null*/}
                {sourceType === "files" && subDir != "" && files.length > 0 ? uploadButton : null}
                {/*filesInSubDir.length > 0 && sourceType === "files" ? fileTable : null*/}
            </Row>
            <Row>
                <Col className="pe-1">
                    {displayNewSubDirForm ? newSubDirForm : null}
                </Col>
                <Col className="ps-1">
                    {displayNewSubDirForm ? <Button onClick={handleClickNewSubDir} variant="secondary">Add</Button> : null}
                </Col>
            </Row>
        </Container>
    );
}

ReactDOM.render(<App />, document.getElementById("mount-kg-upload-app-here"));

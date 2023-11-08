import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import ProgressBar from "react-bootstrap/ProgressBar";
import Stack from "react-bootstrap/Stack";
import Table from "react-bootstrap/Table";

export default function GraphManagement() {
    const [sources, setSources] = useState<Record<string, any>>({});
    const [buttonsDisabled, setButtonsDisabled] = useState(false);
    const [uploadButtonsDisabled, setUploadButtonsDisabled] = useState(false);
    const [downloadPercent, setDownloadPercent] = useState(0);
    const [uploadPercent, setUploadPercent] = useState(0);
    const [uploadProgress, setUploadProgress] = useState(false);
    const [uploadfile, setUploadFile] = useState<File[]>([]);
    const [downloadingSource, setDownloadingSource] = useState("");
    const [uploadingSource, setUploadingSource] = useState("");
    const [error, setError] = useState(false);
    const [uploadError, setUploadError] = useState(false);
    const [displayModal, setDisplayModal] = useState(false);

    useEffect(() => {
        void fetchSources();
    }, []);

    const fetchSources = async () => {
        const response = await fetch("/api/v1/sources");
        const json = (await response.json()) as { resources: Record<string, any> };
        setSources(json.resources);
    };

    const fetchSourceInfo = async (graphUri: string) => {
        const response = await fetch(`/api/v1/rdf/graph/info?graph=${graphUri}`);
        const json = await response.json();
        return json;
    };

    const fetchGraphPart = async (graphUri: string, limit: number, offset: number) => {
        const response = await fetch(`/api/v1/rdf/graph/?graph=${graphUri}&limit=${limit}&offset=${offset}`);
        return await response.text();
    };

    const handleUploadSource = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setUploadingSource(event.currentTarget.id);
        setUploadProgress(false);
        setDisplayModal(true);
    };

    const handleHideUploadModal = () => {
        setUploadingSource("");
        setDisplayModal(false);
    };

    const handleUploadGraph = async () => {
        // init progress bar
        setUploadProgress(true);
        setUploadPercent(0);

        // get file
        const file = uploadfile[0];

        // get file size and chunk size
        const chunkSize = 40000;
        const fileSize = file.size;

        // init values
        let firstChunk = true;
        let lastChunk = false;
        let chunkId = null;

        // iterate over file and send chunks to server
        for (let start = 0; start < fileSize; start += chunkSize) {
            // set percent for progress bar
            const percent = (start * 100) / fileSize;
            setUploadPercent(Math.round(percent));

            // slice file
            const end = start + chunkSize;
            const chunk = file.slice(start, end);

            // build formData
            const formData = new FormData();
            formData.append("first", JSON.stringify(firstChunk));
            formData.append("last", JSON.stringify(lastChunk));
            formData.append("id", JSON.stringify(chunkId));
            formData.append("data", chunk);

            // POST data
            const res = await fetch("/api/v1/rdf/graph", { method: "post", body: formData });
            const json = await res.json();

            // Set values for next iteration
            firstChunk = false;
            lastChunk = start + chunkSize >= fileSize ? true : false;
            chunkId = json.id;
        }
    };

    const handleCancelUpload = async () => {
        setUploadProgress(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setUploadFile(filesList);
    };

    const handleDownloadSource = async (event: React.MouseEvent<HTMLButtonElement>) => {
        try {
            const graphUri = event.currentTarget.value;
            const sourceName = event.currentTarget.id;

            setButtonsDisabled(true);
            setDownloadingSource(sourceName);
            setDownloadPercent(0);

            const graphInfo = await fetchSourceInfo(graphUri);
            const graphSize = graphInfo.graphSize;
            const pageSize = graphInfo.pageSize;

            let offset = 0;
            let percent = 0;
            let blobParts = [];

            // fetch all parts of the graph and store them into blobParts
            while (offset < graphSize) {
                const data = await fetchGraphPart(graphUri, pageSize, offset);
                blobParts.push(data);

                offset += pageSize;
                percent = Math.round((offset * 100) / graphSize);
                percent = percent > 100 ? 100 : percent;
                setDownloadPercent(percent);
            }

            // create a blob and a link to dwl data, autoclick to autodownload
            const blob = new Blob(blobParts, { type: "text/plain" });
            const link = document.createElement("a");
            link.download = `${sourceName}.nt`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);

            setButtonsDisabled(false);
            setDownloadingSource("");
        } catch (error) {
            console.error(error);
            setError(true);
            setButtonsDisabled(false);
            setDownloadingSource("");
        }
    };

    const uploadModal = (
        <Modal show={displayModal} onHide={handleHideUploadModal} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">{uploadingSource.replace("upload-", "")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Stack>
                        <Form.Group controlId="formUploadGraph" className="mb-3">
                            <Form.Label>Choose RDF graph to upload</Form.Label>
                            <Form.Control onChange={handleFileChange} required={true} type="file" disabled={uploadProgress} />
                        </Form.Group>
                        <Stack direction="horizontal" gap={1}>
                            {!uploadProgress ? (
                                <Button disabled={uploadfile.length < 1 ? true : false} type="submit" onClick={handleUploadGraph} style={{ flex: 1 }}>
                                    Upload
                                </Button>
                            ) : null}
                            {uploadProgress ? (
                                <ProgressBar label={uploadPercent == 100 ? "Completed" : ""} style={{ flex: 1, display: "flex", height: "3.1em" }} id={`progress-toto`} now={uploadPercent} />
                            ) : null}
                            {uploadProgress ? (
                                <Button variant="danger" onClick={handleCancelUpload} disabled={uploadPercent == 100}>
                                    Cancel
                                </Button>
                            ) : null}
                        </Stack>
                    </Stack>
                </Form>
            </Modal.Body>
        </Modal>
    );

    const tableBody = Object.entries(sources).map(([sourceName, source]) => {
        return (
            <tr>
                <td>{sourceName}</td>
                <td>{source.graphUri}</td>
                <td>
                    <Stack direction="horizontal" gap={1}>
                        <Button disabled={uploadButtonsDisabled} variant={uploadError ? "danger" : "secondary"} value={source.graphUri} id={`upload-${sourceName}`} onClick={handleUploadSource}>
                            {uploadButtonsDisabled ? (uploadingSource == sourceName ? `${uploadPercent}%` : "Upload") : "Upload"}
                        </Button>
                        <Button
                            style={{ flex: 1, display: downloadingSource == sourceName ? "none" : "inline-block" }}
                            disabled={buttonsDisabled}
                            variant={error ? "danger" : "primary"}
                            value={source.graphUri}
                            id={sourceName}
                            onClick={handleDownloadSource}
                            visuallyHidden={downloadingSource == sourceName}
                        >
                            {buttonsDisabled ? (downloadingSource == sourceName ? `${downloadPercent}%` : "Download") : "Download"}
                        </Button>
                        <ProgressBar style={{ flex: 1, display: downloadingSource != sourceName ? "none" : "flex", height: "3.1em" }} id={`progress-${sourceName}`} now={downloadPercent} />
                    </Stack>
                </td>
            </tr>
        );
    });

    return (
        <>
            {uploadModal}
            <Stack style={{ overflow: "auto", height: "90vh" }}>
                <Table>
                    <thead style={{ position: "sticky", top: 0, "z-index": 10, "background-color": "white" }}>
                        <tr>
                            <th>Source</th>
                            <th>Graph URI</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>{tableBody}</tbody>
                </Table>
            </Stack>
        </>
    );
}

const container = document.getElementById("mount-graph-management-here");
const root = createRoot(container!);
root.render(<GraphManagement />);

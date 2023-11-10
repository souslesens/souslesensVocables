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
    // sources fetched from server
    const [sources, setSources] = useState<Record<string, any>>({});

    // status of download/upload
    const [currentSource, setCurrentSource] = useState<string | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [currentOperation, setCurrentOperation] = useState<string | null>(null);
    const [cancelCurrentOperation, setCancelCurrentOperation] = useState(false);

    // error management
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // upload
    const [uploadfile, setUploadFile] = useState<File[]>([]);

    // modal
    const [displayModal, setDisplayModal] = useState<string | null>(null);

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
        setCurrentSource(event.currentTarget.id.replace("upload-", ""));
        setCurrentOperation(null);
        setDisplayModal("upload");
    };

    const handleDownloadSource = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setCurrentSource(event.currentTarget.id);
        setCurrentOperation(null);
        setDisplayModal("download");
        await downloadSource(event.currentTarget.id, event.currentTarget.value);
    };

    const handleHideUploadModal = () => {
        setCurrentSource(null);
        setDisplayModal(null);
    };

    const handleUploadGraph = async () => {
        // init progress bar
        setCurrentOperation("upload");
        setTransferPercent(0);

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
            setTransferPercent(Math.round(percent));

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

    const handleCancelUpload = () => {
        setCancelCurrentOperation(true);
        setCurrentOperation(null);
        setDisplayModal(null);
        setCurrentSource(null);
        // setTransferPercent(0);
        setUploadFile([]);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setUploadFile(filesList);
    };

    const recursDownloadSource = async (sourceName: string, graphUri: string, offset: number, graphSize: number, pageSize: number, blobParts: any[]) => {
        // percent
        const percent = Math.min(Math.round((offset * 100) / graphSize), 100);
        setTransferPercent(percent);

        console.log("cancelCurrentOperation", cancelCurrentOperation);

        if (offset < graphSize) {
            const data = await fetchGraphPart(graphUri, pageSize, offset);
            blobParts.push(data);
            blobParts = await recursDownloadSource(sourceName, graphUri, offset + pageSize, graphSize, pageSize, blobParts);
        }
        return blobParts;
    };

    const downloadSource = async (sourceName: string, graphUri: string) => {
        try {
            setCurrentSource(sourceName);
            setTransferPercent(0);
            setCurrentOperation("download");

            const graphInfo = await fetchSourceInfo(graphUri);
            const graphSize = graphInfo.graphSize;
            const pageSize = graphInfo.pageSize;

            const blobParts = await recursDownloadSource(sourceName, graphUri, 0, graphSize, pageSize, []);

            // create a blob and a link to dwl data, autoclick to autodownload
            const blob = new Blob(blobParts, { type: "text/plain" });
            const link = document.createElement("a");
            link.download = `${sourceName}.nt`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error(error);
            setError(true);
        }
    };

    const downloadModalContent = (
        <>
            <Stack direction="horizontal" gap={1}>
                {currentOperation == "download" ? (
                    <ProgressBar label={transferPercent == 100 ? "Completed" : ""} style={{ flex: 1, display: "flex", height: "3.1em" }} id={`progress-bar`} now={transferPercent} />
                ) : null}
                {currentOperation == "download" ? (
                    <Button variant="danger" onClick={handleCancelUpload} disabled={transferPercent == 100}>
                        Cancel
                    </Button>
                ) : null}
            </Stack>
        </>
    );

    const uploadModalContent = (
        <Form>
            <Stack>
                <Form.Group controlId="formUploadGraph" className="mb-3">
                    <Form.Label>Choose RDF graph to upload</Form.Label>
                    <Form.Control onChange={handleFileChange} required={true} type="file" disabled={currentOperation == "upload"} />
                </Form.Group>
                <Stack direction="horizontal" gap={1}>
                    {!currentOperation ? (
                        <Button disabled={uploadfile.length < 1 ? true : false} type="submit" onClick={handleUploadGraph} style={{ flex: 1 }}>
                            Upload
                        </Button>
                    ) : null}
                    {currentOperation == "upload" ? (
                        <ProgressBar label={transferPercent == 100 ? "Completed" : ""} style={{ flex: 1, display: "flex", height: "3.1em" }} id={`progress-toto`} now={transferPercent} />
                    ) : null}
                    {currentOperation == "upload" ? (
                        <Button variant="danger" onClick={handleCancelUpload} disabled={transferPercent == 100}>
                            Cancel
                        </Button>
                    ) : null}
                </Stack>
            </Stack>
        </Form>
    );

    const uploadModal = (
        <Modal show={displayModal} onHide={handleHideUploadModal} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    {displayModal == "upload" ? "Uploading" : null}
                    {displayModal == "download" ? "Downloading" : null} {currentSource}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {displayModal == "upload" ? uploadModalContent : null}
                {displayModal == "download" ? downloadModalContent : null}
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
                        <Button variant={error ? "danger" : "secondary"} value={source.graphUri} id={`upload-${sourceName}`} onClick={handleUploadSource}>
                            Upload
                        </Button>
                        <Button variant={error ? "danger" : "primary"} value={source.graphUri} id={sourceName} onClick={handleDownloadSource}>
                            Download
                        </Button>
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

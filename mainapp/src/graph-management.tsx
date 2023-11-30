import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";

import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import ProgressBar from "react-bootstrap/ProgressBar";
import Stack from "react-bootstrap/Stack";
import Table from "react-bootstrap/Table";

export default function GraphManagement() {
    // sources fetched from server
    const [sources, setSources] = useState<Record<string, any>>({});
    const [slsApiBaseUrl, setSlsApiBaseUrl] = useState<Record<string, any>>({});

    // status of download/upload
    const [currentSource, setCurrentSource] = useState<string | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [currentOperation, setCurrentOperation] = useState<string | null>(null);
    const cancelCurrentOperation = useRef(false);
    const [animatedProgressBar, setAnimatedProgressBar] = useState(false);

    // error management
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // upload
    const [uploadfile, setUploadFile] = useState<File[]>([]);

    // modal
    const [displayModal, setDisplayModal] = useState<string | null>(null);

    useEffect(() => {
        void fetchSources();
        void fetchConfig();
    }, []);

    const fetchConfig = async () => {
        const response = await fetch("/api/v1/config");
        const json = (await response.json()) as { resources: Record<string, any> };
        const slsApi = json.slsApi;
        if (slsApi !== undefined) {
            if (slsApi.url) {
                // force presence of trailing /
                setSlsApiBaseUrl(json.slsApi.url.replace(/\/$/, "").concat("/"));
                return;
            }
        }
        setSlsApiBaseUrl("/");
    };

    const fetchSources = async () => {
        const response = await fetch("/api/v1/sources");
        const json = (await response.json()) as { resources: Record<string, any> };
        setSources(json.resources);
    };

    const fetchSourceInfo = async (sourceName: string) => {
        const response = await fetch(`/api/v1/rdf/graph/info?source=${sourceName}`);
        const json = await response.json();
        return json;
    };

    const fetchGraphPart = async (sourceName: string, limit: number, offset: number) => {
        const response = await fetch(`${slsApiBaseUrl}api/v1/rdf/graph/?source=${sourceName}&limit=${limit}&offset=${offset}`);
        return await response.text();
    };

    const handleUploadSource = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setCurrentSource(event.currentTarget.value);
        setCurrentOperation(null);
        setDisplayModal("upload");
    };

    const handleDownloadSource = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setCurrentSource(event.currentTarget.value);
        setCurrentOperation(null);
        setDisplayModal("download");
        await downloadSource(event.currentTarget.value);
    };

    const handleHideModal = () => {
        setCurrentOperation(null);
        setDisplayModal(null);
        setCurrentSource(null);
        setTransferPercent(0);
        setUploadFile([]);
        setError(false);
        setErrorMessage("");
        setAnimatedProgressBar(false);
        if (currentOperation) {
            cancelCurrentOperation.current = true;
        }
    };

    const handleUploadGraph = async () => {
        // init progress bar
        setCurrentOperation("upload");
        setTransferPercent(0);
        cancelCurrentOperation.current = false;

        // get file
        const file = uploadfile[0];

        // get file size and chunk size
        const chunkSize = 1000000;
        const fileSize = file.size;

        // init values
        let chunkId = "";

        // iterate over file and send chunks to server
        for (let start = 0; start < fileSize; start += chunkSize) {
            // set percent for progress bar
            const percent = (start * 100) / fileSize;
            setTransferPercent(Math.round(percent));

            // slice file
            const end = start + chunkSize;
            const chunk = new File([file.slice(start, end)], file.name, { type: file.type });

            // last ?
            const lastChunk = start + chunkSize >= fileSize ? true : false;
            if (lastChunk) {
                setAnimatedProgressBar(true);
            }

            // build formData
            const formData = new FormData();
            Object.entries({
                source: currentSource,
                last: lastChunk,
                identifier: chunkId,
                clean: false,
                data: chunk,
            }).forEach(([key, value]) => {
                formData.append(key, value);
            });

            // if cancel button is pressed, remove uploaded file and return
            if (cancelCurrentOperation.current) {
                formData.set("clean", true);
                await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { "X-Token": "admin" }, body: formData });
                return;
            }

            // POST data
            const res = await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { "X-Token": "admin" }, body: formData });
            if (res.status != 200) {
                setError(true);
                const message = await res.json();
                console.error(message.error);
                setErrorMessage(message.error);
                return;
            } else {
                const json = await res.json();

                // Set values for next iteration
                chunkId = json.identifier;
            }
        }
        setTransferPercent(100);
        setAnimatedProgressBar(false);
    };

    const handleCancelOperation = () => {
        cancelCurrentOperation.current = true;
        setCurrentOperation(null);
        setDisplayModal(null);
        setCurrentSource(null);
        setTransferPercent(0);
        setUploadFile([]);
        setError(false);
        setErrorMessage("");
        setAnimatedProgressBar(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.files === null) {
            return;
        }
        console.log(event.currentTarget.files);
        const filesList = Array.from(event.currentTarget.files);
        setUploadFile(filesList);
    };

    const recursDownloadSource = async (sourceName: string, offset: number, graphSize: number, pageSize: number, blobParts: any[]) => {
        // percent
        const percent = Math.min(Math.round((offset * 100) / graphSize), 100);
        setTransferPercent(percent);

        if (cancelCurrentOperation.current) {
            cancelCurrentOperation.current = false;
            return [];
        }

        if (offset < graphSize) {
            const data = await fetchGraphPart(sourceName, pageSize, offset);
            blobParts.push(data);
            blobParts = await recursDownloadSource(sourceName, offset + pageSize, graphSize, pageSize, blobParts);
        }
        return blobParts;
    };

    const downloadSource = async (sourceName: string) => {
        try {
            setCurrentSource(sourceName);
            setTransferPercent(0);
            setCurrentOperation("download");
            cancelCurrentOperation.current = false;

            const graphInfo = await fetchSourceInfo(sourceName);
            const graphSize = graphInfo.graphSize;
            const pageSize = graphInfo.pageSize;

            const blobParts = await recursDownloadSource(sourceName, 0, graphSize, pageSize, []);
            if (blobParts.length == 0) {
                return;
            }

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
                    <Button variant="danger" onClick={handleCancelOperation} disabled={transferPercent == 100}>
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
                        <ProgressBar
                            animated={animatedProgressBar}
                            label={transferPercent == 100 ? (!error ? "Completed" : "") : animatedProgressBar ? "Uploading to triplestore" : ""}
                            style={{ flex: 1, display: "flex", height: "3.1em" }}
                            id={`progress-toto`}
                            now={transferPercent}
                        />
                    ) : null}
                    {currentOperation == "upload" ? (
                        <Button variant="danger" onClick={handleCancelOperation} disabled={transferPercent == 100}>
                            Cancel
                        </Button>
                    ) : null}
                </Stack>
            </Stack>
        </Form>
    );

    const uploadModal = (
        <Modal show={displayModal} onHide={handleHideModal} backdrop={"static"} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    {displayModal == "upload" ? "Uploading" : null}
                    {displayModal == "download" ? "Downloading" : null} {currentSource}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Stack gap={3}>
                    {displayModal == "upload" ? uploadModalContent : null}
                    {displayModal == "download" ? downloadModalContent : null}
                    {error ? (
                        <Alert style={{ mt: "1em" }} variant="danger">
                            {errorMessage}
                        </Alert>
                    ) : null}
                </Stack>
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
                        <Button disabled={source.accessControl != "readwrite"} variant="secondary" value={sourceName} onClick={handleUploadSource}>
                            Upload
                        </Button>
                        <Button variant="primary" value={sourceName} onClick={handleDownloadSource}>
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

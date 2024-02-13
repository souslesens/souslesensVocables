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

import { fetchMe } from "./Utils";


declare global {
    interface Window {
        GraphManagement: {
            createApp: () => void;
        } 
    }
}
export default function GraphManagement() {
    // sources fetched from server
    const [sources, setSources] = useState<Record<string, any>>({});
    const [slsApiBaseUrl, setSlsApiBaseUrl] = useState<Record<string, any>>({});

    // user info
    const [currentUserToken, setCurrentUserToken] = useState<string | null>(null);

    // status of download/upload
    const [currentSource, setCurrentSource] = useState<string | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [currentOperation, setCurrentOperation] = useState<string | null>(null);
    const cancelCurrentOperation = useRef(false);
    const [animatedProgressBar, setAnimatedProgressBar] = useState(false);
    const [currentDownloadFormat, setCurrentDownloadFormat] = useState<string | null>(null);
    const [skipNamedIndividuals, setSkipNamedIndividuals] = useState<boolean>(false);

    // error management
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // upload
    const [uploadfile, setUploadFile] = useState<File[]>([]);
    const [replaceGraph, setReplaceGraph] = useState<boolean>(true);

    // modal
    const [displayModal, setDisplayModal] = useState<string | null>(null);

    useEffect(() => {
        void fetchSources();
        void fetchConfig();
        (async () => {
            const response = await fetchMe();
            setCurrentUserToken(response.user.token);
        })();
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
        const response = await fetch(`/api/v1/rdf/graph/?source=${sourceName}&limit=${limit}&offset=${offset}`);
        return await response.text();
    };

    const fetchGraphPartUsingPythonApi = async (sourceName: string, offset: number, format: string = "nt", identifier: string = "", skipNamedIndividuals: boolean = false) => {
        const response = await fetch(`${slsApiBaseUrl}api/v1/rdf/graph?source=${sourceName}&offset=${offset}&format=${format}&identifier=${identifier}&skipNamedIndividuals=${skipNamedIndividuals}`, {
            headers: { Authorization: `Bearer ${currentUserToken}` },
        });
        return await response.json();
    };

    const handleUploadSource = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setCurrentSource(event.currentTarget.value);
        setCurrentOperation(null);
        setDisplayModal("upload");
    };

    const handleSetFormat = async (event: React.MouseEvent<HTMLElement>) => {
        setCurrentDownloadFormat(event.currentTarget.value);
    };

    const handleSetSkipNamedIndividuals = async (event: React.MouseEvent<HTMLElement>) => {
        setSkipNamedIndividuals(event.currentTarget.value == "false");
    };

    const handleReplaceGraphCheckbox = async (event: React.MouseEvent<HTMLInputElement>) => {
        setReplaceGraph(event.currentTarget.value == "false");
    };

    const handleDownloadSource = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setCurrentSource(event.currentTarget.value);
        setCurrentOperation(null);
        setDisplayModal("download");
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
                replace: replaceGraph,
                data: chunk,
            }).forEach(([key, value]) => {
                formData.append(key, value);
            });
            console.log(slsApiBaseUrl);
            console.log(currentUserToken);
            // if cancel button is pressed, remove uploaded file and return
            if (cancelCurrentOperation.current) {
                formData.set("clean", true);
                await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { Authorization: `Bearer ${currentUserToken}` }, body: formData });
                return;
            }

            // POST data
            const res = await fetch(`${slsApiBaseUrl}api/v1/rdf/graph`, { method: "post", headers: { Authorization: `Bearer ${currentUserToken}` }, body: formData });
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
        const filesList = Array.from(event.currentTarget.files);
        setUploadFile(filesList);
    };

    const recursDownloadSourceUsingPythonApi = async (sourceName: string, offset: number | null, blobParts: any[], identifier: string = "") => {
        if (offset === 0) {
            setTransferPercent(100);
            setAnimatedProgressBar(true);
        }

        if (cancelCurrentOperation.current) {
            cancelCurrentOperation.current = false;
            return [];
        }
        if (offset !== null) {
            const data = await fetchGraphPartUsingPythonApi(sourceName, offset, currentDownloadFormat, identifier, skipNamedIndividuals);

            // percent
            const percent = Math.min(100, (offset * 100) / data.filesize);
            setTransferPercent(percent);
            setAnimatedProgressBar(false);

            blobParts.push(data.data);
            blobParts = await recursDownloadSourceUsingPythonApi(sourceName, data.next_offset, blobParts, data.identifier);
        }
        setTransferPercent(100);
        return blobParts;
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

    const downloadSource = async () => {
        try {
            setTransferPercent(0);
            setCurrentOperation("download");
            cancelCurrentOperation.current = false;

            let blobParts;
            if (slsApiBaseUrl === "/") {
                const graphInfo = await fetchSourceInfo(currentSource);
                const graphSize = graphInfo.graphSize;
                const pageSize = graphInfo.pageSize;

                blobParts = await recursDownloadSource(currentSource, 0, graphSize, pageSize, []);
            } else {
                blobParts = await recursDownloadSourceUsingPythonApi(currentSource, 0, []);
            }

            if (blobParts.length == 0) {
                return;
            }

            // create a blob and a link to dwl data, autoclick to autodownload
            const blob = new Blob(blobParts, { type: "text/plain" });
            const link = document.createElement("a");
            link.download = `${currentSource}.${currentDownloadFormat}`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error(error);
            setError(true);
        }
    };

    const downloadModalContent = (
        <Stack>
            <Form>
                <Stack direction="horizontal">
                    <Form.Check
                        disabled={currentOperation !== null}
                        onClick={handleSetFormat}
                        name="radio-format"
                        inline
                        type="radio"
                        id={`radio-format-nt-${currentSource}`}
                        label="N-triples"
                        value="nt"
                    ></Form.Check>
                    <Form.Check
                        disabled={currentOperation !== null || slsApiBaseUrl === "/"}
                        onClick={handleSetFormat}
                        name="radio-format"
                        inline
                        type="radio"
                        id={`radio-format-xml-${currentSource}`}
                        label="RDF/XML"
                        value="xml"
                    ></Form.Check>
                    <Form.Check
                        disabled={currentOperation !== null || slsApiBaseUrl === "/"}
                        onClick={handleSetFormat}
                        name="radio-format"
                        inline
                        type="radio"
                        id={`radio-format-ttl-${currentSource}`}
                        label="Turtle"
                        value="ttl"
                    ></Form.Check>
                </Stack>

                <Stack className="my-2">
                    <Form.Check
                        disabled={currentOperation !== null || slsApiBaseUrl === "/"}
                        id={`check-ignore-namedIndividuals-${currentSource}`}
                        label="Ignore the namedIndividuals in this download"
                        name="check-ignore-namedIndividuals"
                        onClick={handleSetSkipNamedIndividuals}
                        type="switch"
                        value={skipNamedIndividuals}
                    ></Form.Check>
                </Stack>

                <Stack direction="horizontal" gap={1}>
                    {!currentOperation ? (
                        <Button disabled={currentDownloadFormat === null} type="submit" onClick={downloadSource} style={{ flex: 1 }}>
                            Download
                        </Button>
                    ) : null}
                    {currentOperation == "download" ? (
                        <ProgressBar
                            animated={animatedProgressBar}
                            label={transferPercent == 100 ? (animatedProgressBar ? "Preparing data…" : "Completed") : ""}
                            style={{ flex: 1, display: "flex", height: "3.1em" }}
                            id={`progress-bar`}
                            now={transferPercent}
                        />
                    ) : null}
                    {currentOperation == "download" ? (
                        <Button variant="danger" onClick={handleCancelOperation} disabled={transferPercent == 100}>
                            Cancel
                        </Button>
                    ) : null}
                </Stack>
            </Form>
        </Stack>
    );

    const uploadModalContent = (
        <Form>
            <Stack>
                <Form.Group controlId="formUploadGraph" className="mb-2">
                    <Form.Label>Choose RDF graph to upload</Form.Label>
                    <Form.Control onChange={handleFileChange} required={true} type="file" disabled={currentOperation == "upload"} />
                </Form.Group>
                <Form.Check checked={replaceGraph} value={replaceGraph} onClick={handleReplaceGraphCheckbox} className="mb-3" type="switch" id="toto" label="Delete before upload" />
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
                            style={{ flex: 1, display: "flex", height: "3.1em", transition: "none" }}
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

    const tableBody = Object.entries(sources)
        .sort(([aName, _a], [bName, _b]) => {
            return aName.toLowerCase() > bName.toLowerCase();
        })
        .map(([sourceName, source]) => {
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
                            <th>Sources</th>
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




window.GraphManagement.createApp = function createApp() {
    const container = document.getElementById("mount-graph-management-here");
    const root = createRoot(container!);
    root.render(<GraphManagement />);
    return root.unmount.bind(root);
};
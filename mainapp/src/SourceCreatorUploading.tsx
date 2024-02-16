import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";

import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Stack from "react-bootstrap/Stack";
import ProgressBar from "react-bootstrap/ProgressBar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import { fetchMe } from "./Utils";

interface UploadFormData {
    displayForm: "database" | "file" | "";
    currentSource: string;
    selectedDatabase: string;
    selectedFiles: string[];
}

declare global {
    interface Window {
        CreateSLSVsource_bot: {
            createDataBaseSourceMappings: () => void;
            createCsvSourceMappings: () => void;
            uploadFormData: UploadFormData;
            createApp: (uploadFormData: UploadFormData) => void;
        };
    }
}

export default function App(uploadFormData: UploadFormData) {
    // Use Graph Management variables necessary in Uploading module
    const [currentOperation, setCurrentOperation] = useState<string | null>(null);
    const [replaceGraph, setReplaceGraph] = useState<boolean>(true);
    const [uploadfile, setUploadFile] = useState<File[]>([]);
    const [animatedProgressBar, setAnimatedProgressBar] = useState(false);
    const [transferPercent, setTransferPercent] = useState(0);
    const cancelCurrentOperation = useRef(false);
    // user info
    const [currentUserToken, setCurrentUserToken] = useState<string | null>(null);

    const [slsApiBaseUrl, setSlsApiBaseUrl] = useState<Record<string, any>>({});

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
                source: window.CreateSLSVsource_bot.params.sourceLabel,
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

    const handleReplaceGraphCheckbox = async (event: React.MouseEvent<HTMLInputElement>) => {
        setReplaceGraph(event.currentTarget.value == "false");
    };
    const uploadFileHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUploadStatus("");
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setFiles(filesList);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setUploadFile(filesList);
    };

    if (window.CreateSLSVsource_bot.uploadFormData.displayForm == "file") {
        return (
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
    }
    return <></>;
}

window.CreateSLSVsource_bot.createApp = function createApp(uploadFormData: UploadFormData) {
    const container = document.getElementById("mount-upload-here");
    const root = createRoot(container!);
    root.render(<App {...uploadFormData} />);
    return root.unmount.bind(root);
};

import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import ProgressBar from "react-bootstrap/ProgressBar";
import Stack from "react-bootstrap/Stack";
import Table from "react-bootstrap/Table";

export default function GraphManagement() {
    const [sources, setSources] = useState<Record<string, any>>({});
    const [buttonsDisabled, setButtonsDisabled] = useState(false);
    const [uploadButtonsDisabled, setUploadButtonsDisabled] = useState(false);
    const [downloadPercent, setDownloadPercent] = useState(0);
    const [uploadPercent, setUploadPercent] = useState(0);
    const [downloadingSource, setDownloadingSource] = useState("");
    const [uploadingSource, setUploadingSource] = useState("");
    const [error, setError] = useState(false);
    const [uploadError, setUploadError] = useState(false);

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
        //
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
    );
}

const container = document.getElementById("mount-graph-management-here");
const root = createRoot(container!);
root.render(<GraphManagement />);

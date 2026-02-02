import { Done, Close, Cancel } from "@mui/icons-material";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
    Alert,
    LinearProgress,
    Typography,
    DialogActions,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
} from "@mui/material";
import { fetchMe, roundMinMax } from "../Utils";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { writeLog } from "../Log";
import { createRoot } from "react-dom/client";

declare const Config: {
    sources: Record<string, { imports?: string[]; baseUri?: string }>;
};

interface DownloadGraphModalProps {
    apiUrl: string;
    onClose: () => void;
    open: boolean;
    sourceName: string;
}

type ApiServerResponseOk = {
    filesize: number;
    data: BlobPart;
    next_offset: number;
    identifier: string;
};

type ApiServerResponseError = {
    detail: string;
};

type SourceInfo = {
    graphUri: string | undefined;
    graphSize: number | undefined;
};

type ApiServerResponse = ApiServerResponseError | ApiServerResponseOk;

const addImportsAndContributor = (blobParts: BlobPart[], sourceName: string, userLogin: string, format: string): BlobPart[] => {
    const content = blobParts.map((part) => (typeof part === "string" ? part : "")).join("");
    const contributorUri = "http://purl.org/dc/elements/1.1/contributor";
    const owlImportsUri = "http://www.w3.org/2002/07/owl#imports";
    const hasContributor =
        content.includes(contributorUri) || content.includes("http://purl.org/dc/terms/contributor") || /\bdc:contributor\b/.test(content) || /\bdcterms:contributor\b/.test(content);
    const hasImports = content.includes(owlImportsUri) || /\bowl:imports\b/.test(content);

    const sourceConfig = Config.sources[sourceName];
    const imports = sourceConfig?.imports ?? [];
    if (!sourceConfig || !sourceConfig.baseUri) {
        return blobParts;
    }
    const baseUri = sourceConfig.baseUri;
    const importsToAdd: string[] = [];
    if (!hasImports) {
        imports.forEach((importName) => {
            const importBaseUri = Config.sources[importName]?.baseUri;
            if (importBaseUri) {
                importsToAdd.push(importBaseUri);
            }
        });
    }

    if (importsToAdd.length === 0 && hasContributor) {
        return blobParts;
    }

    if (format === "nt") {
        const additionalTriples: string[] = [];
        importsToAdd.forEach((importBaseUri) => {
            additionalTriples.push(`<${baseUri}> <${owlImportsUri}> <${importBaseUri}> .`);
        });
        if (!hasContributor) {
            additionalTriples.push(`<${baseUri}> <${contributorUri}> "${userLogin}" .`);
        }
        if (additionalTriples.length > 0) {
            return [...blobParts, "\n" + additionalTriples.join("\n") + "\n"];
        }
    } else if (format === "ttl") {
        const escapedBaseUri = baseUri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const baseUriPattern = new RegExp(`(<${escapedBaseUri}>(?:(?:"[^"]*"|<[^>]*>|[^.]))*)(\\.)`, "gm");

        let insertions = "";
        importsToAdd.forEach((importBaseUri) => {
            insertions += ` ;\n    owl:imports <${importBaseUri}>`;
        });
        if (!hasContributor) {
            insertions += ` ;\n    dc:contributor "${userLogin}"`;
        }

        if (!insertions) {
            return blobParts;
        }

        const match = content.match(baseUriPattern);
        if (match) {
            for (let i = 0; i < blobParts.length; i++) {
                const part = blobParts[i];
                if (typeof part !== "string") continue;

                if (part.match(baseUriPattern)) {
                    const modifiedPart = part.replace(baseUriPattern, `$1${insertions}\n$2`);
                    const result = [...blobParts];
                    result[i] = modifiedPart;
                    return result;
                }
            }
        } else {
            const newSection = `\n<${baseUri}> a owl:Ontology${insertions} .\n`;
            return [...blobParts, newSection];
        }
    } else if (format === "xml") {
        const escapedBaseUri = baseUri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const descriptionPattern = new RegExp(`(<rdf:Description rdf:about="${escapedBaseUri}"[^>]*>[\\s\\S]*?)(<\\/rdf:Description>)`, "gm");

        let insertions = "";
        importsToAdd.forEach((importBaseUri) => {
            insertions += `\n    <owl:imports rdf:resource="${importBaseUri}"/>`;
        });
        if (!hasContributor) {
            insertions += `\n    <dc:contributor>${userLogin}</dc:contributor>`;
        }

        if (!insertions) {
            return blobParts;
        }

        const match = content.match(descriptionPattern);
        if (match) {
            for (let i = 0; i < blobParts.length; i++) {
                const part = blobParts[i];
                if (typeof part !== "string") continue;

                if (part.match(descriptionPattern)) {
                    const modifiedPart = part.replace(descriptionPattern, `$1${insertions}\n$2`);
                    const result = [...blobParts];
                    result[i] = modifiedPart;
                    return result;
                }
            }
        } else {
            const newSection = `\n<rdf:Description rdf:about="${baseUri}">${insertions}\n</rdf:Description>\n`;

            // Try to insert before </rdf:RDF>
            for (let i = blobParts.length - 1; i >= 0; i--) {
                const part = blobParts[i];
                if (typeof part !== "string") continue;

                if (part.includes("</rdf:RDF>")) {
                    const modifiedPart = part.replace("</rdf:RDF>", `${newSection}</rdf:RDF>`);
                    const result = [...blobParts];
                    result[i] = modifiedPart;
                    return result;
                }
            }
            // Fallback: append at the end
            return [...blobParts, newSection];
        }
    }

    return blobParts;
};

export function DownloadGraphModal({ apiUrl, onClose, open, sourceName }: DownloadGraphModalProps) {
    const [currentUser, setCurrentUser] = useState<{ login: string; token: string } | null>(null);
    const [transferPercent, setTransferPercent] = useState(0);
    const [transferState, setTransferState] = useState<"init" | "downloading" | "processing" | "done">("init");
    const [errorMessage, setErrorMessage] = useState("");
    const cancelCurrentOperation = useRef(false);
    const [currentDownloadFormat, setCurrentDownloadFormat] = useState("nt");
    const [skipNamedIndividuals, setSkipNamedIndividuals] = useState(false);
    const [includeImports, setIncludeImports] = useState(false);
    const [sourceInfo, setSourceInfo] = useState<SourceInfo>({ graphUri: undefined, graphSize: undefined });

    useEffect(() => {
        const fetchAll = async () => {
            const response = await fetchMe();
            setCurrentUser(response.user);

            const info = await fetchSourceInfo(sourceName, false);
            setSourceInfo({ graphUri: info.graph, graphSize: info.graphSize });
        };
        void fetchAll();
    }, []);

    const handleCancelOperation = () => {
        cancelCurrentOperation.current = true;
        setTransferPercent(0);
        setTransferState("init");
        setErrorMessage("");
        onClose();
    };

    const fetchSourceInfo = async (sourceName: string, withImports: boolean) => {
        const response = await fetch(`/api/v1/rdf/graph/info?source=${sourceName}&withImports=${String(withImports)}`);
        const json = (await response.json()) as { graph: string; graphSize: number };
        return json;
    };

    const fetchGraphPartUsingPythonApi = async (name: string, offset: number, format = "nt", identifier = "", skipNamedIndividuals = false) => {
        const response = await fetch(`${apiUrl}api/v1/rdf/graph?source=${name}&offset=${offset}&format=${format}&identifier=${identifier}&skipNamedIndividuals=${String(skipNamedIndividuals)}`, {
            headers: { Authorization: `Bearer ${currentUser?.token ?? ""}` },
        });
        const json = (await response.json()) as ApiServerResponse;
        if (response.status !== 200) {
            return { status: response.status, message: (json as ApiServerResponseError).detail ?? "Internal serveur error" };
        }
        return { status: response.status, message: json as ApiServerResponseOk };
    };

    const downloadSourceUsingPythonApi = async (name: string, basePercent: number, sourceWeight: number) => {
        let offset = 0;
        let identifier = "";
        const blobParts: BlobPart[] = [];
        setTransferState("downloading");
        while (offset !== null) {
            if (cancelCurrentOperation.current) {
                return { blobParts: null, message: "cancelled" };
            }
            const response = await fetchGraphPartUsingPythonApi(name, offset, currentDownloadFormat, identifier, skipNamedIndividuals);
            const status = response.status;
            if (status >= 400) {
                const errorMessage = response.message as string;
                return { blobParts: null, message: errorMessage };
            }
            const message = response.message as ApiServerResponseOk;
            // percent within this source (0-100), then scaled to the source's weight
            const sourcePercent = message.filesize > 0 ? Math.min(100, (offset * 100) / message.filesize) : 0;
            const globalPercent = Math.min(100, basePercent + (sourcePercent * sourceWeight) / 100);
            setTransferPercent(Math.round(globalPercent));

            blobParts.push(message.data);
            offset = message.next_offset;
            identifier = message.identifier;
        }
        return { blobParts: blobParts, message: "ok" };
    };

    const fetchGraphPart = async (name: string, offset: number, withImports: boolean) => {
        const response = await fetch(`/api/v1/rdf/graph/?source=${name}&offset=${offset}&withImports=${withImports}`);
        return await response.json();
    };

    const recursDownloadSource = async (name: string, offset: number, blobParts: BlobPart[]) => {
        const percent = roundMinMax((offset * 100) / sourceInfo.graphSize, 1, 99);

        setTransferPercent(percent);

        if (cancelCurrentOperation.current) {
            return [];
        }

        const response = await fetchGraphPart(name, offset, includeImports);

        if (response.data !== "# Empty NT\n") {
            blobParts.push(response.data);
            blobParts = await recursDownloadSource(name, response.next_offset, blobParts);
        }
        return blobParts;
    };

    const submitDownloadSource = async (e: MouseEvent) => {
        e.preventDefault();
        if (!currentUser) {
            console.error("No user");
            setErrorMessage("No user");
            return;
        }

        if (!sourceName) {
            console.error("No current source");
            setErrorMessage("No current source");
            return;
        }

        try {
            await writeLog(currentUser.login, "GraphManagement", "download", sourceName);

            setTransferPercent(0);
            setTransferState("init");
            cancelCurrentOperation.current = false;

            const downloadResult = await downloadSourceTriples();
            const blobParts = downloadResult.blobParts;
            const message = downloadResult.message;

            // If cancelled, just return silently (handleCancelOperation already reset state)
            if (message === "cancelled") {
                return;
            }

            if (message !== "ok") {
                setErrorMessage(message);
                return;
            }

            if (!blobParts || blobParts.length == 0) {
                setErrorMessage("Receive empty data from the API");
                return;
            }

            // create a blob and a link to dwl data, autoclick to autodownload
            const blob = new Blob(blobParts, { type: "text/plain" });
            const link = document.createElement("a");
            link.download = `${sourceName}.${currentDownloadFormat}`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error(error);
            setErrorMessage((error as Error).message);
        }
    };
    const downloadSourceTriples = async () => {
        setTransferState("downloading");
        setTransferPercent(1);

        const blobParts: BlobPart[] = await recursDownloadSource(sourceName, 0, []);

        setTransferPercent(100);
        setTransferState("done");

        return { blobParts: blobParts, message: "ok" };
    };

    const toggleAddImports = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        const info = await fetchSourceInfo(sourceName, checked);
        setSourceInfo({ graphUri: info.graph, graphSize: info.graphSize });
        setIncludeImports(checked);
    };

    return (
        <Dialog fullWidth={true} maxWidth="md" onClose={onClose} open={open} PaperProps={{ component: "form" }}>
            <DialogTitle id="contained-modal-title-vcenter">Downloading {sourceName}</DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
                <Stack spacing={2} useFlexGap>
                    {errorMessage ? (
                        <Alert variant="filled" severity="error">
                            {errorMessage}
                        </Alert>
                    ) : null}
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel id="select-format-label">File format</InputLabel>
                            <Select
                                disabled={transferPercent > 0}
                                id={`select-format-${sourceName}`}
                                label="File format"
                                labelId="select-format-label"
                                onChange={(event) => setCurrentDownloadFormat(event.target.value)}
                                value={currentDownloadFormat}
                            >
                                <MenuItem disabled={transferPercent > 0} value={"nt"}>
                                    N-triples
                                </MenuItem>
                                <MenuItem disabled={transferPercent > 0 || apiUrl === "/"} value={"xml"}>
                                    RDF/XML
                                </MenuItem>
                                <MenuItem disabled={transferPercent > 0 || apiUrl === "/"} value={"ttl"}>
                                    Turtle
                                </MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <FormControlLabel
                                id={`download-switch-${sourceName}`}
                                control={
                                    <Checkbox
                                        checked={skipNamedIndividuals}
                                        disabled={transferPercent > 0 || apiUrl === "/"}
                                        onChange={(event) => {
                                            setSkipNamedIndividuals(event.currentTarget.checked);
                                        }}
                                    />
                                }
                                label="Ignore the namedIndividuals in this download"
                            />
                        </FormControl>
                        <FormControl fullWidth>
                            <FormControlLabel
                                id={`include-imports-switch-${sourceName}`}
                                control={<Checkbox checked={includeImports} disabled={transferPercent > 0} onChange={toggleAddImports} />}
                                label="Add imports in this download"
                            />
                        </FormControl>
                    </Stack>
                    {transferPercent > 0 && !errorMessage ? (
                        <Stack alignItems="center" direction="row" spacing={2} useFlexGap>
                            <LinearProgress id={`progress-${sourceName}`} sx={{ flex: 1 }} value={transferPercent} variant={transferState === "processing" ? "indeterminate" : "determinate"} />
                            <Typography variant="body2">
                                {transferState === "processing" ? "Processing" : transferPercent === 100 ? (!errorMessage ? "Completed" : "") : `${transferPercent}%`}
                            </Typography>
                        </Stack>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Stack direction="row" gap={1}>
                    <Alert sx={{ padding: "0px 16px" }} severity="info">
                        {`Download can take a long time and remain blocked at processing step for several minutes`}
                    </Alert>
                </Stack>
                <Stack direction="row" gap={1}>
                    {transferPercent === 0 ? (
                        <Button color="primary" disabled={currentDownloadFormat === null} onClick={submitDownloadSource} startIcon={<Done />} type="submit" variant="contained">
                            Submit
                        </Button>
                    ) : (
                        <Button
                            color={errorMessage || transferPercent === 100 ? "primary" : "error"}
                            onClick={handleCancelOperation}
                            startIcon={errorMessage || transferPercent === 100 ? <Close /> : <Cancel />}
                            variant="outlined"
                        >
                            {errorMessage || transferPercent === 100 ? "Close" : "Cancel"}
                        </Button>
                    )}
                </Stack>
            </DialogActions>
        </Dialog>
    );
}

declare global {
    interface Window {
        DownloadGraphModal: {
            createApp: (props: Omit<DownloadGraphModalProps, "open">) => void;
        };
    }
}

window.DownloadGraphModal = {
    createApp: (props: Omit<DownloadGraphModalProps, "open">) => {
        const container = document.getElementById("mount-download-graph-modal-here");

        const root = createRoot(container!);
        root.render(<DownloadGraphModal open={true} {...props} />);
        return root;
    },
};

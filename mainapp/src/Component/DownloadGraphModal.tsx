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
import { fetchMe } from "../Utils";
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

type ApiServerResponse = ApiServerResponseError | ApiServerResponseOk;

const addImportsAndContributor = (blobParts: BlobPart[], sourceName: string, userLogin: string, format: string): BlobPart[] => {
    const content = blobParts.map((part) => (typeof part === "string" ? part : "")).join("");
    const contributorUri = "http://purl.org/dc/elements/1.1/contributor";
    const owlImportsUri = "http://www.w3.org/2002/07/owl#imports";
    const hasContributor = content.includes(contributorUri);
    const hasImports = content.includes(owlImportsUri);

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

        //<http:\/\/purl\.obolibrary\.org\/obo\/bfo\.owl>(?:(?:"[^"]*"|<[^>]*>|[^.])*)\.
        const baseUriPattern = new RegExp(`(<${escapedBaseUri}>(?:(?:"[^"]*"|<[^>]*>|[^.]))*)(\\.)`, "gm");

        for (let i = 0; i < blobParts.length; i++) {
            const part = blobParts[i];
            if (typeof part !== "string") continue;

            const match = part.match(baseUriPattern);
            if (match) {
                let insertions = "";
                importsToAdd.forEach((importBaseUri) => {
                    insertions += ` ;\n    owl:imports <${importBaseUri}>`;
                });
                if (!hasContributor) {
                    insertions += ` ;\n    dc:contributor "${userLogin}"`;
                }
                const modifiedPart = part.replace(baseUriPattern, `$1${insertions}\n$2`);
                const result = [...blobParts];
                result[i] = modifiedPart;
                return result;
            }
        }
    } else if (format === "xml") {
        const escapedBaseUri = baseUri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Pattern XML: <rdf:Description rdf:about="baseUri"> ... </rdf:Description>
        const descriptionPattern = new RegExp(`(<rdf:Description rdf:about="${escapedBaseUri}"[^>]*>[\\s\\S]*?)(<\\/rdf:Description>)`, "gm");

        for (let i = 0; i < blobParts.length; i++) {
            const part = blobParts[i];
            if (typeof part !== "string") continue;

            const match = part.match(descriptionPattern);
            if (match) {
                let insertions = "";
                importsToAdd.forEach((importBaseUri) => {
                    insertions += `\n    <owl:imports rdf:resource="${importBaseUri}"/>`;
                });
                if (!hasContributor) {
                    insertions += `\n    <dc:contributor>${userLogin}</dc:contributor>`;
                }
                const modifiedPart = part.replace(descriptionPattern, `$1${insertions}\n$2`);
                const result = [...blobParts];
                result[i] = modifiedPart;
                return result;
            }
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

    useEffect(() => {
        const fetchAll = async () => {
            const response = await fetchMe();
            setCurrentUser(response.user);
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

    const fetchSourceInfo = async (sourceName: string) => {
        const response = await fetch(`/api/v1/rdf/graph/info?source=${sourceName}`);
        const json = (await response.json()) as { graphSize: number; pageSize: number };
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

    const fetchGraphPart = async (name: string, limit: number, offset: number) => {
        const response = await fetch(`/api/v1/rdf/graph/?source=${name}&limit=${limit}&offset=${offset}`);
        return await response.text();
    };

    const recursDownloadSource = async (name: string, offset: number, graphSize: number, pageSize: number, blobParts: BlobPart[], basePercent: number, sourceWeight: number) => {
        // percent within this source, then scaled to global progress
        const sourcePercent = graphSize > 0 ? Math.min(Math.round((offset * 100) / graphSize), 100) : 0;
        const globalPercent = Math.min(100, basePercent + (sourcePercent * sourceWeight) / 100);
        setTransferPercent(Math.round(globalPercent));

        if (cancelCurrentOperation.current) {
            return [];
        }

        if (offset < graphSize) {
            const data = await fetchGraphPart(name, pageSize, offset);
            blobParts.push(data);
            blobParts = await recursDownloadSource(name, offset + pageSize, graphSize, pageSize, blobParts, basePercent, sourceWeight);
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

            const enrichedBlobParts = addImportsAndContributor(blobParts, sourceName, currentUser.login, currentDownloadFormat);

            // create a blob and a link to dwl data, autoclick to autodownload
            const blob = new Blob(enrichedBlobParts, { type: "text/plain" });
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
        let blobParts: BlobPart[] | null;
        let message = "ok";
        let sources = [sourceName];
        if (includeImports) {
            const imports = window?.Config.sources[sourceName]?.imports || [];
            sources = sources.concat(imports);
        }
        blobParts = [];
        let blobPartsSource: BlobPart[] = [];

        // First, fetch the size of all sources to calculate proportional weights
        const sourceSizes: { source: string; graphSize: number; pageSize: number }[] = [];
        let totalSize = 0;

        setTransferState("downloading");

        for (const source of sources) {
            if (apiUrl === "/") {
                const graphInfo = await fetchSourceInfo(source);
                sourceSizes.push({ source, graphSize: graphInfo.graphSize, pageSize: graphInfo.pageSize });
                totalSize += graphInfo.graphSize;
            } else {
                // For Python API, we get the filesize during download, so use equal weight as fallback
                // We'll update progress based on actual filesize during download
                sourceSizes.push({ source, graphSize: 0, pageSize: 0 });
            }
        }

        // Calculate proportional weights based on actual sizes
        // Use 99 as max during download to reserve 100 for completion
        const maxPercentDuringDownload = 99;
        let cumulativePercent = 0;

        for (let i = 0; i < sources.length; i++) {
            // Check for cancellation before each source
            if (cancelCurrentOperation.current) {
                return { blobParts: null, message: "cancelled" };
            }

            const sourceInfo = sourceSizes[i];
            const source = sourceInfo.source;

            // Calculate this source's weight as percentage of total (scaled to max 99%)
            const sourceWeight = totalSize > 0 ? (sourceInfo.graphSize / totalSize) * maxPercentDuringDownload : maxPercentDuringDownload / sources.length;
            const basePercent = cumulativePercent;

            if (apiUrl === "/") {
                blobPartsSource = await recursDownloadSource(source, 0, sourceInfo.graphSize, sourceInfo.pageSize, [], basePercent, sourceWeight);
                // Check if cancelled (empty array returned)
                if (cancelCurrentOperation.current) {
                    return { blobParts: null, message: "cancelled" };
                }
                blobParts = blobParts.concat(blobPartsSource);
            } else {
                const result = await downloadSourceUsingPythonApi(source, basePercent, sourceWeight);
                if (result.message === "cancelled" || result.blobParts === null) {
                    return { blobParts: null, message: "cancelled" };
                }
                blobPartsSource = result.blobParts || [];
                blobParts = blobParts.concat(blobPartsSource);

                message = result.message;
                if (message !== "ok") {
                    return { blobParts: blobParts, message: message };
                }
            }
            cumulativePercent += sourceWeight;
        }
        setTransferPercent(100);
        setTransferState("done");
        return { blobParts: blobParts, message: message };
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
                                control={
                                    <Checkbox
                                        checked={includeImports}
                                        disabled={transferPercent > 0}
                                        onChange={(event) => {
                                            setIncludeImports(event.currentTarget.checked);
                                        }}
                                    />
                                }
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

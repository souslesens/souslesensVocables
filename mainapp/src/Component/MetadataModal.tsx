import { Chip, Dialog, DialogContent, DialogTitle, Paper, Tooltip } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useEffect, useState } from "react";

interface MetadataModalProps {
    onClose: () => void;
    open: boolean;
    sourceName: string | null;
}

export type Metadata = {
    metadata: string;
    type: string;
    value: string;
    datatype?: string;
    "xml:lang"?: string;
};

export type MetadataRow = Metadata & { id: number };

interface MetadataTableProps {
    metadata: Metadata[];
    prefixes: Record<string, string>;
}

function renderMetadataChip(params: GridRenderCellParams<{ metadata: string; prettyMetadata: string }, any, any>) {
    return (
        <Tooltip title={params.value.metadata}>
            <Chip label={params.value.prettyMetadata} />
        </Tooltip>
    );
}

export function MetadataTable({ metadata, prefixes }: MetadataTableProps) {
    const getUriRessource = (uri: string, baseUri: string) => {
        return uri.replace(baseUri, "").replace("/", "").replace("#", "");
    };
    const getBaseUri = (uri: string) => {
        const parsedUri = new URL(uri);
        let last = "#";
        if (parsedUri.hash.length == 0) {
            parsedUri.pathname = parsedUri.pathname.split("/").slice(0, -1).join("/");
            last = "/";
        }
        return parsedUri.origin + parsedUri.pathname + last;
    };

    const prettifyUri = (uri: string) => {
        const baseUri = getBaseUri(uri);
        const ressource = getUriRessource(uri, baseUri);

        return `${prefixes[baseUri]}:${ressource}`;
    };

    const columns: GridColDef[] = [
        { field: "metadata", headerName: "Metadata", renderCell: renderMetadataChip, valueGetter: (_value, row) => ({ metadata: row.metadata, prettyMetadata: prettifyUri(row.metadata) }) },
        { field: "value", headerName: "Value", flex: 1 },
    ];

    const rows: MetadataRow[] = metadata.map((row, i) => {
        return {
            id: i,
            ...row,
        };
    });

    return (
        <Paper variant="outlined" style={{ height: "600px" }}>
            <DataGrid rows={rows} columns={columns} autoPageSize />
        </Paper>
    );
}

export function MetadataModal({ onClose, open, sourceName }: MetadataModalProps) {
    const [metadata, setMetadata] = useState<Metadata[]>([]);
    const [prefixes, setPrefixes] = useState<Record<string, string>>({});

    useEffect(() => {
        void fetchMetadata();
        void fetchPrefixCc();
    }, []);

    const fetchMetadata = async () => {
        const response = await fetch(`/api/v1/rdf/graph/info?source=${sourceName}`);
        const json = (await response.json()) as { pageSize: number; graph: string; graphSize: number; metadata: Metadata[] };
        setMetadata(json.metadata);
    };

    const fetchPrefixCc = async () => {
        const response = await fetch("http://prefix.cc/popular/all.file.json");
        const json = (await response.json()) as Record<string, string>;
        const result = Object.fromEntries(Object.entries(json).map(([k, v]) => [v, k]));
        setPrefixes(result);
    };

    return (
        <Dialog fullWidth={true} maxWidth="md" onClose={onClose} open={open} PaperProps={{ component: "form" }}>
            <DialogTitle id="metadata-modal-title">Metadata for {sourceName}</DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
                <MetadataTable metadata={metadata} prefixes={prefixes} />
            </DialogContent>
        </Dialog>
    );
}

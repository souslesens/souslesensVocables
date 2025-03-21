import { Alert, Autocomplete, Button, Chip, Dialog, DialogContent, DialogTitle, Paper, Stack, TextField, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef, GridEventListener, GridRowEditStopReasons, GridRowId, GridRowModes, GridRowModesModel, GridToolbarContainer } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";

declare module "@mui/x-data-grid" {
    interface ToolbarPropsOverrides {
        setRows: (newRows: (oldRows: MetadataRow[]) => MetadataRow[]) => void;
        setRowModesModel: (newModel: (oldModel: GridRowModesModel) => GridRowModesModel) => void;
        rowNumber: number;
        loading: boolean;
        onSave: () => Promise<void>;
        canSave: boolean;
    }
}

interface MetadataModalProps {
    onClose: () => void;
    open: boolean;
    sourceName: string | null;
    isReadOnly?: boolean;
}

export type Metadata = {
    metadata: string;
    value: string;
    type?: string;
    datatype?: string;
    "xml:lang"?: string;
    // Internal value used to represent a combination of type, datatype and xml:lang
    shortType?: string;
};

type MetadataRow = Metadata & {
    id: number;
    // Item is being added but has not yet been validated
    // Allows user to cancel adding row
    isNew?: boolean;
};

interface MetadataTableProps {
    loading: boolean;
    isReadOnly: boolean;
    metadata: Metadata[];
    prefixes: Record<string, string>;
    onSubmit: (newMetadata: Metadata[], addedData: Metadata[], removedData: Metadata[]) => Promise<void>;
}

const AVAILABLE_URI_LIST = [
    "http://purl.org/dc/elements/1.1/contributor",
    "http://purl.org/dc/elements/1.1/creator",
    "http://purl.org/dc/elements/1.1/description",
    "http://purl.org/dc/elements/1.1/license",
    "http://purl.org/dc/elements/1.1/title",
    "http://purl.org/dc/terms/provenance",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "http://www.w3.org/2000/01/rdf-schema#comment",
    "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
    "http://www.w3.org/2000/01/rdf-schema#label",
    "http://www.w3.org/2000/01/rdf-schema#seeAlso",
    "http://www.w3.org/2002/07/owl#versionIRI",
    "http://www.w3.org/2002/07/owl#versionInfo",
];

const AVAILABLE_TYPES = ["literal", "string", "number", "fr", "en"] as const;

// Mapping between a shortType and metadata values
const TYPE_TO_DATA: Record<
    string,
    {
        type: string;
        datatype?: string;
        "xml:lang"?: string;
    }
> = {
    literal: { type: "literal", "xml:lang": undefined },
    string: { type: "typed-literal", datatype: "http://www.w3.org/2001/XMLSchema#string" },
    number: { type: "typed-literal", datatype: "http://www.w3.org/2001/XMLSchema#number" },
    fr: { type: "literal", "xml:lang": "fr" },
    en: { type: "literal", "xml:lang": "en" },
};

function metadataToType(metadata: Metadata) {
    return metadata.shortType ?? Object.keys(TYPE_TO_DATA).find((k) => Object.entries(TYPE_TO_DATA[k]).every(([key, value]) => value === metadata[key as keyof Metadata])) ?? "literal";
}

function getUriRessource(uri: string, baseUri: string) {
    return uri.replace(baseUri, "").replace("/", "").replace("#", "");
}
function getBaseUri(uri: string) {
    const parsedUri = new URL(uri);
    let last = "#";
    if (parsedUri.hash.length == 0) {
        parsedUri.pathname = parsedUri.pathname.split("/").slice(0, -1).join("/");
        last = "/";
    }
    return parsedUri.origin + parsedUri.pathname + last;
}

function isInMetadata(list: Metadata[], row: Metadata) {
    return list.some((r) => r.metadata === row.metadata && r.value === row.value && metadataToType(r) === metadataToType(row));
}

function getMetadataWithType(metadata: Metadata[]): Metadata[] {
    return metadata.map((d) => {
        if (d.shortType) {
            return { ...d, ...TYPE_TO_DATA[d.shortType], shortType: undefined };
        }
        return d;
    });
}

function EditMetadataToolbar(props: {
    loading: boolean;
    canSave: boolean;
    rowNumber: number;
    setRows: (newRows: (oldRows: MetadataRow[]) => MetadataRow[]) => void;
    setRowModesModel: (newModel: (oldModel: GridRowModesModel) => GridRowModesModel) => void;
    onSave: () => void;
}) {
    const { setRows, setRowModesModel, rowNumber, loading, onSave, canSave } = props;

    const handleClick = () => {
        const id = rowNumber;
        setRows((oldRows) => [{ id, metadata: "", value: "", isNew: true }, ...oldRows]);
        setRowModesModel((oldModel) => ({
            ...oldModel,
            [id]: { mode: GridRowModes.Edit, fieldToFocus: "value" },
        }));
    };

    return (
        <GridToolbarContainer>
            <Button color="primary" variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={loading || !canSave}>
                Save
            </Button>
            <Button color="primary" startIcon={<AddIcon />} onClick={handleClick} disabled={loading}>
                Add Metadata
            </Button>
        </GridToolbarContainer>
    );
}

function MetadataTable({ metadata, prefixes, onSubmit, loading, isReadOnly }: MetadataTableProps) {
    const [rows, setRows] = useState<MetadataRow[]>([]);
    const [paginationModel, setPaginationModel] = useState({
        pageSize: 10,
        page: 0,
    });

    const addedData = rows.filter((d) => !isInMetadata(metadata, d));
    const removedData = metadata.filter((m) => !isInMetadata(rows, m));
    const canSave =
        (addedData.length > 0 || removedData.length > 0) &&
        // Prevent adding incomplete items
        addedData.every((d) => d.value && d.shortType && d.metadata);

    useEffect(() => {
        setRows(
            metadata.map((row, i) => {
                return {
                    id: i,
                    shortType: metadataToType(row),
                    ...row,
                };
            }),
        );
    }, [metadata]);

    const usedUriList = new Set(metadata.map((m) => m.metadata));
    const availableUriList = new Set(AVAILABLE_URI_LIST).union(usedUriList);

    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

    const handleSave = async () => {
        if (canSave) {
            await onSubmit(rows, addedData, removedData);
        }
    };

    const handleRowEditStop: GridEventListener<"rowEditStop"> = (params, event) => {
        if (params.reason === GridRowEditStopReasons.rowFocusOut) {
            event.defaultMuiPrevented = true;
        }
    };

    const handleEditClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit, fieldToFocus: "value" } });
    };

    const handleSaveClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
    };

    const handleDeleteClick = (id: GridRowId) => () => {
        setRows(rows.filter((row) => row.id !== id));
    };

    const handleCancelClick = (id: GridRowId) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View, ignoreModifications: true },
        });

        const editedRow = rows.find((row) => row.id === id);
        if (editedRow && editedRow.isNew) {
            setRows(rows.filter((row) => row.id !== id));
        }
    };

    const processRowUpdate = (newRow: MetadataRow) => {
        const updatedRow = { ...newRow, isNew: false };
        setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
        return updatedRow;
    };

    const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
        setRowModesModel(newRowModesModel);
    };

    const prettifyUri = (uri: string) => {
        if (!uri) {
            return "";
        }

        const baseUri = getBaseUri(uri);
        const ressource = getUriRessource(uri, baseUri);

        return `${prefixes[baseUri]}:${ressource}`;
    };

    const columns: GridColDef[] = [
        {
            field: "shortType",
            headerName: "Type",
            renderCell: (params) => {
                const value = params.value as string;
                return (
                    <Tooltip title={value}>
                        <Chip label={value} />
                    </Tooltip>
                );
            },
            renderEditCell: (editParams) => {
                return (
                    <Autocomplete
                        value={editParams.value as string}
                        onChange={(_event, value) => editParams.api.setEditCellValue({ field: editParams.field, id: editParams.id, value })}
                        options={[...AVAILABLE_TYPES].sort()}
                        renderInput={(params) => <TextField {...params} label="Type" sx={{ width: 200 }} />}
                    />
                );
            },
            editable: true,
            width: 200,
        },
        {
            field: "metadata",
            headerName: "Metadata",
            renderCell: (params) => {
                const value = params.value as string;
                return (
                    <Tooltip title={value}>
                        <Chip label={prettifyUri(value)} />
                    </Tooltip>
                );
            },
            renderEditCell: (editParams) => {
                return (
                    <Autocomplete
                        value={editParams.value as string}
                        onChange={(_event, value) => editParams.api.setEditCellValue({ field: editParams.field, id: editParams.id, value })}
                        options={[...availableUriList].sort()}
                        getOptionLabel={prettifyUri}
                        renderInput={(params) => <TextField {...params} label="Metadata" sx={{ width: 200 }} />}
                    />
                );
            },
            editable: true,
            width: 200,
        },
        { field: "value", headerName: "Value", editable: true, flex: 1 },
    ];

    if (!isReadOnly) {
        columns.push({
            field: "actions",
            type: "actions",
            headerName: "Actions",
            width: 100,
            cellClassName: "actions",
            getActions: ({ id }) => {
                const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

                if (isInEditMode) {
                    return [
                        <GridActionsCellItem
                            key={"save"}
                            icon={<SaveIcon />}
                            label="Save"
                            sx={{
                                color: "primary.main",
                            }}
                            onClick={handleSaveClick(id)}
                        />,
                        <GridActionsCellItem key={"cancel"} icon={<CancelIcon />} label="Cancel" className="textPrimary" onClick={handleCancelClick(id)} color="inherit" />,
                    ];
                }

                return [
                    <GridActionsCellItem key={"edit"} icon={<EditIcon />} label="Edit" className="textPrimary" onClick={handleEditClick(id)} color="inherit" />,
                    <GridActionsCellItem key={"delete"} icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id)} color="inherit" />,
                ];
            },
        });
    }

    return (
        <Paper variant="outlined" style={{ height: "600px" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                editMode={isReadOnly ? undefined : "row"}
                rowModesModel={isReadOnly ? undefined : rowModesModel}
                onRowModesModelChange={isReadOnly ? undefined : handleRowModesModelChange}
                onRowEditStop={isReadOnly ? undefined : handleRowEditStop}
                processRowUpdate={isReadOnly ? undefined : processRowUpdate}
                slots={{ toolbar: isReadOnly ? undefined : EditMetadataToolbar }}
                slotProps={{
                    toolbar: isReadOnly ? undefined : { setRows, setRowModesModel, rowNumber: rows.length, loading, onSave: handleSave, canSave },
                }}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50]}
                loading={loading}
            />
        </Paper>
    );
}

export function MetadataModal({ onClose, open, sourceName, isReadOnly = false }: MetadataModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<Metadata[]>([]);
    const [prefixes, setPrefixes] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchMetadata = async () => {
            const response = await fetch(`/api/v1/rdf/graph/metadata?source=${sourceName ?? ""}`);
            const json = (await response.json()) as { metadata: Metadata[] };
            setMetadata(json.metadata);
        };

        const fetchPrefixCc = async () => {
            const response = await fetch("http://prefix.cc/popular/all.file.json");
            const json = (await response.json()) as Record<string, string>;
            const result = Object.fromEntries(Object.entries(json).map(([k, v]) => [v, k]));
            setPrefixes(result);
        };

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.all([fetchMetadata(), fetchPrefixCc()]).finally(() => {
            setLoading(false);
        });
    }, [sourceName]);

    async function onSubmit(newMetadata: Metadata[], addedData: Metadata[], removedData: Metadata[]) {
        setLoading(true);
        setError(null);
        try {
            const addDataWithType = getMetadataWithType(addedData);
            const removedDataWithType = getMetadataWithType(removedData);
            const response = await fetch(`/api/v1/rdf/graph/metadata?source=${sourceName ?? ""}`, {
                method: "POST",
                body: JSON.stringify({ addedData: addDataWithType, removedData: removedDataWithType }),
                headers: { "Content-Type": "application/json" },
            });
            if (response.status >= 200 && response.status < 300) {
                setMetadata(newMetadata);
            } else {
                console.error(await response.text());
                setError("Error saving data");
            }
        } catch (e) {
            setError((e as Error).message);
        }
        setLoading(false);
    }

    return (
        <Dialog
            fullWidth={true}
            maxWidth="md"
            onClose={() => {
                if (!loading) {
                    onClose();
                }
            }}
            open={open}
            PaperProps={{ component: "form" }}
        >
            <DialogTitle id="metadata-modal-title">Metadata for {sourceName}</DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
                <Stack spacing={1}>
                    {error ? <Alert severity="error">{error}</Alert> : null}
                    <MetadataTable metadata={metadata} prefixes={prefixes} onSubmit={onSubmit} loading={loading} isReadOnly={isReadOnly} />
                </Stack>
            </DialogContent>
        </Dialog>
    );
}

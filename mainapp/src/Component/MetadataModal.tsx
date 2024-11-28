import { Alert, Autocomplete, Button, Chip, Dialog, DialogContent, DialogTitle, Paper, Stack, TextField, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef, GridEventListener, GridRowEditStopReasons, GridRowId, GridRowModes, GridRowModesModel, GridToolbarContainer } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";

interface MetadataModalProps {
    onClose: () => void;
    open: boolean;
    sourceName: string | null;
}

export type Metadata = {
    metadata: string;
    value: string;
};

type MetadataRow = Metadata & {
    id: number;
    // Item is being added but has not yet been validated
    // Allows user to cancel adding row
    isNew?: boolean;
};

interface MetadataTableProps {
    loading: boolean;
    metadata: Metadata[];
    prefixes: Record<string, string>;
    onSubmit: (newMetadata: Metadata[], addedData: Metadata[], removedData: Metadata[]) => Promise<void>;
}

const AVAILABLE_URI_LIST = [
    "http://www.w3.org/2002/07/owl#versionInfo",
    "http://www.w3.org/2000/01/rdf-schema#label",
    "http://www.w3.org/2000/01/rdf-schema#comment",
    "http://www.w3.org/2000/01/rdf-schema#seeAlso",
    "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
];

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

function MetadataTable({ metadata, prefixes, onSubmit, loading }: MetadataTableProps) {
    const [rows, setRows] = useState<MetadataRow[]>([]);
    const [paginationModel, setPaginationModel] = useState({
        pageSize: 8,
        page: 0,
    });

    const addedData = rows.filter((d) => !isInMetadata(metadata, d));
    const removedData = metadata.filter((m) => !isInMetadata(rows, m));
    const canSave = addedData.length > 0 || removedData.length > 0;

    useEffect(() => {
        setRows(
            metadata.map((row, i) => {
                return {
                    id: i,
                    ...row,
                };
            })
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
        {
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
        },
    ];

    return (
        <Paper variant="outlined" style={{ height: "600px" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={handleRowModesModelChange}
                onRowEditStop={handleRowEditStop}
                processRowUpdate={processRowUpdate}
                slots={{ toolbar: EditMetadataToolbar }}
                slotProps={{
                    toolbar: { setRows, setRowModesModel, rowNumber: rows.length, loading, onSave: handleSave, canSave },
                }}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50]}
                loading={loading}
            />
        </Paper>
    );
}

function isInMetadata(list: Metadata[], row: Metadata) {
    return list.some((r) => r.metadata === row.metadata && r.value === row.value);
}

export function MetadataModal({ onClose, open, sourceName }: MetadataModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<Metadata[]>([]);
    const [prefixes, setPrefixes] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchMetadata = async () => {
            const response = await fetch(`/api/v1/rdf/graph/info?source=${sourceName ?? ""}`);
            const json = (await response.json()) as { pageSize: number; graph: string; graphSize: number; metadata: Metadata[] };
            setMetadata(json.metadata);
        };

        const fetchPrefixCc = async () => {
            const response = await fetch("http://prefix.cc/popular/all.file.json");
            const json = (await response.json()) as Record<string, string>;
            const result = Object.fromEntries(Object.entries(json).map(([k, v]) => [v, k]));
            setPrefixes(result);
        };

        Promise.all([fetchMetadata(), fetchPrefixCc()]).finally(() => {
            setLoading(false);
        });
    }, []);

    async function onSubmit(newMetadata: Metadata[], _addedData: Metadata[], _removedData: Metadata[]) {
        setLoading(true);
        setError(null);
        try {
            // TODO make api call
            await new Promise<void>((resolve) => setTimeout(resolve, 2000));
            setMetadata(newMetadata);
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
                    <MetadataTable metadata={metadata} prefixes={prefixes} onSubmit={onSubmit} loading={loading} />
                </Stack>
            </DialogContent>
        </Dialog>
    );
}

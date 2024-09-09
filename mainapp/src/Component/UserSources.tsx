import { useEffect, useState } from "react";
import {
    Autocomplete,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    IconButton,
    Link,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
} from "@mui/material";
import { CheckBox, CheckBoxOutlineBlank, Delete, Edit } from "@mui/icons-material";

import { getSources, ServerSource, ServerSourceSchema } from "../Source";
import { cleanUpText, fetchMe } from "../Utils";

type DialogType = "delete" | "edit";
type Order = "asc" | "desc";
type User = {
    login: string;
    allowSourceCreation: boolean;
    maxNumberCreatedSource: number;
};

const initialDialog = { delete: false, edit: false };
const initialUser = { login: "", allowSourceCreation: false, maxNumberCreatedSource: 0 };

const DeleteSourceDialog = (props: { onClose: void; onDelete: void; open: boolean; sourceName: string }) => {
    const { onClose, onDelete, open, sourceName } = props;

    return (
        <Dialog aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" open={open} onClose={onClose}>
            <DialogTitle id="delete-dialog-title">{`Delete ${sourceName}`}</DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-dialog-description">{"The source will be erased from this instance. Are you sure?"}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose}>
                    Cancel
                </Button>
                <Button color="error" onClick={onDelete}>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const SubmitSourceDialog = (props: { onClose: void; onSubmit: void; open: boolean; sources: ServerSource[]; sourceName?: string }) => {
    const { onClose, onSubmit, open, sources, sourceName } = props;

    const [predicates, setPredicates] = useState<string[]>([]);
    const [sourceNames, setSourceNames] = useState<string[]>([]);
    const [source, setSource] = useState<ServerSource>({});

    useEffect(() => {
        const filteredSources = sources.filter((source) => source.name === sourceName);
        setPredicates([...new Set(sources.flatMap((s) => s.taxonomyPredicates))]);
        setSourceNames(sources.flatMap((s) => s.name));
        setSource(filteredSources[0]);
    }, [sources, sourceName]);

    const handleField = (fieldName: string, value: string | boolean) => {
        setSource({ ...source, [fieldName]: value });
    };

    const icon = <CheckBoxOutlineBlank fontSize="small" />;
    const checkedIcon = <CheckBox fontSize="small" />;

    return (
        <Dialog
            aria-labelledby="submit-dialog-title"
            fullWidth
            maxWidth="md"
            open={open}
            onClose={onClose}
            PaperProps={{
                component: "form",
                onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const parsedForm = ServerSourceSchema.safeParse(source);
                    if (parsedForm.error === undefined) {
                        onSubmit(source);
                    }
                },
            }}
        >
            <DialogTitle id="submit-dialog-title">{`Edit ${sourceName}`}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }} useFlexGap>
                    <Autocomplete
                        freeSolo
                        id="taxonomyPredicates"
                        limitTags={2}
                        multiple
                        onChange={(e, value) => handleField("taxonomyPredicates", value)}
                        options={predicates}
                        renderInput={(params) => <TextField {...params} label="Taxonomy Predicates" />}
                        renderOption={(props, option, { selected }) => {
                            const { key, ...optionProps } = props;
                            return (
                                <li key={key} {...optionProps}>
                                    <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 2 }} checked={selected} />
                                    {key}
                                </li>
                            );
                        }}
                        renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                                const { key, ...rest } = getTagProps({ index });
                                return <Chip key={key} label={option} {...rest} />;
                            })
                        }
                        value={source ? source.taxonomyPredicates : []}
                    />
                    <TextField
                        id="topClassFilter"
                        label="Top Class Filters"
                        multiline
                        onChange={(event) => handleField("topClassFilter", event.target.value)}
                        rows={4}
                        value={source ? source.topClassFilter : ""}
                    />
                    <Autocomplete
                        disableCloseOnSelect
                        id="imports"
                        multiple
                        onChange={(e, value) => handleField("imports", value)}
                        options={sourceNames}
                        renderInput={(params) => <TextField {...params} label="Imports" />}
                        renderOption={(props, option, { selected }) => {
                            const { key, ...optionProps } = props;
                            return (
                                <li key={key} {...optionProps}>
                                    <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 2 }} checked={selected} />
                                    {key}
                                </li>
                            );
                        }}
                        renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                                const { key, ...rest } = getTagProps({ index });
                                return <Chip key={key} label={option} {...rest} />;
                            })
                        }
                        value={source ? source.imports : []}
                    />
                    <FormGroup>
                        <FormControlLabel
                            control={<Checkbox checked={source ? source.allowIndividuals : false} onChange={(event) => handleField("allowIndividuals", event.target.checked)} />}
                            label="Allow Individuals?"
                        />
                    </FormGroup>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button color="primary" type="submit">
                    Submit
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const UserSources = (props: { handleSnackbar: void }) => {
    const { handleSnackbar } = props;

    const [filtering, setFiltering] = useState("");
    const [isOpen, setIsOpen] = useState<DialogTitle, boolean>(initialDialog);
    const [order, setOrder] = useState<Order>("asc");
    const [orderBy, setOrderBy] = useState<keyof ServerSource>("name");
    const [selectedSource, setSelectedSource] = useState("");
    const [sources, setSources] = useState<ServerSource[]>([]);
    const [user, setUser] = useState<User>(initialUser);

    useEffect(() => {
        (async () => {
            setSources(await getSources());

            const me = await fetchMe();
            setUser({
                login: me.user.login,
                allowSourceCreation: me.user.allowSourceCreation,
                maxNumberCreatedSource: me.user.maxNumberCreatedSource,
            });
        })();
    }, []);

    const handleCloseDialog = (dialogType: DialogType) => {
        setIsOpen({ ...isOpen, [dialogType]: false });
    };

    const handleDeleteSource = async () => {
        try {
            const response = await fetch(`/api/v1/sources/${selectedSource}`, { method: "delete" });

            const data = await response.json();
            if (response.status == 200) {
                setSources(Object.values(data.resources));
                handleSnackbar(`The source '${selectedSource}' have been deleted`);
            } else {
                console.error(data.message);
                handleSnackbar(`An error occurs during deletion: ${data.message}`, "error");
            }
        } catch (error) {
            console.error(error);
            handleSnackbar(`An error occurs during deletion: ${error}`, "error");
        }
        setIsOpen({ ...isOpen, delete: false });
    };

    const handleSubmitSource = async (source: ServerSource) => {
        try {
            const response = await fetch(`/api/v1/sources/${selectedSource}`, {
                body: JSON.stringify(source, null, "\t"),
                headers: { "Content-Type": "application/json" },
                method: "put",
            });

            const data = await response.json();
            if (response.status == 200) {
                setSources(Object.values(data.resources));
                handleSnackbar(`The source '${selectedSource}' have been updated`);
            } else {
                console.error(data.message);
                handleSnackbar(`An error occurs during updating: ${data.message}`, "error");
            }
        } catch (error) {
            console.error(error);
            handleSnackbar(`An error occurs during updating: ${error}`, "error");
        }
        setIsOpen({ ...isOpen, edit: false });
    };

    const onOpenDialog = (dialogType: DialogType, sourceName?: string) => {
        setSelectedSource(sourceName);
        setIsOpen({ ...isOpen, [dialogType]: true });
    };

    const onSortTable = (property: keyof ServerSource) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const sortedSources: ServerSource[] = sources.slice().sort((a: ServerSource, b: ServerSource) => {
        const left: string = a[orderBy] || ("" as string);
        const right: string = b[orderBy] || ("" as string);
        return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
    });

    return (
        <Stack spacing={2} sx={{ m: 4 }}>
            <TextField label="Filter Sources by name" id="filter-sources" onChange={(event) => setFiltering(event.target.value)} />
            <TableContainer sx={{ height: "400px" }} component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ fontWeight: "bold" }}>
                                <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => onSortTable("name")}>
                                    Source Name
                                </TableSortLabel>
                            </TableCell>
                            <TableCell style={{ fontWeight: "bold" }}>
                                <TableSortLabel active={orderBy === "graphUri"} direction={order} onClick={() => onSortTable("graphUri")}>
                                    Graph URI
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                <TableSortLabel active={orderBy === "group"} direction={order} onClick={() => onSortTable("group")}>
                                    Group
                                </TableSortLabel>
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={{ width: "100%", overflow: "visible" }}>
                        {sortedSources
                            .filter((source) => cleanUpText(source.name).includes(cleanUpText(filtering)))
                            .map((source) => {
                                return (
                                    <TableRow key={source.name}>
                                        <TableCell>{source.name}</TableCell>
                                        <TableCell>
                                            <Link href={source.graphUri}>{source.graphUri}</Link>
                                        </TableCell>
                                        <TableCell align="center">{source.group ? <Chip label={source.group} size="small" /> : ""}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                <IconButton aria-label="edit" color="primary" onClick={() => onOpenDialog("edit", source.name)} size="small">
                                                    <Edit />
                                                </IconButton>
                                                <IconButton aria-label="delete" color="error" onClick={() => onOpenDialog("delete", source.name)} size="small">
                                                    <Delete />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
            <DeleteSourceDialog handleSnackbar={handleSnackbar} onClose={() => handleCloseDialog("delete")} onDelete={handleDeleteSource} open={isOpen["delete"]} sourceName={selectedSource} />
            <SubmitSourceDialog onClose={() => handleCloseDialog("edit")} onSubmit={handleSubmitSource} open={isOpen["edit"]} sources={sources} sourceName={selectedSource} />
        </Stack>
    );
};

export { UserSources };

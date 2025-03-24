import { useState, FormEvent, useEffect, SyntheticEvent } from "react";
import {
    Dialog,
    DialogContent,
    Stack,
    TextField,
    DialogActions,
    Button,
    Alert,
    Paper,
    Box,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    InputAdornment,
    IconButton,
    DialogTitle,
    MenuItem,
    FormGroup,
    Divider,
    Chip,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
    Checkbox,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableSortLabel,
    TableBody,
    Tooltip,
    Snackbar,
    Tabs,
    CircularProgress,
    Link,
    List,
    Tab,
    AlertColor,
} from "@mui/material";
import { Add, Edit, Extension, DeleteForever, AddCircle, Done, Download } from "@mui/icons-material";

import { SRD, success } from "srd";
import { ulid } from "ulid";

import { useModel } from "../Admin";
import { writeLog } from "../Log";
import {
    PluginOptionSchema,
    PluginOptionType,
    RepositorySchema,
    RepositoryType,
    deleteRepository,
    fetchRepository,
    getEnabledPlugins,
    getRepositoryPlugins,
    getRepositoryTags,
    readRepositories,
    Response,
    writeConfig,
    writeRepository,
} from "../Plugins";

import { DeleteDialog } from "./DeleteDialog";
import { PasswordField } from "./PasswordField";
import { cleanUpText } from "../Utils";

type DispatcherProps = {
    me: string;
    onDeleteRepository: (repositoryId: string) => void;
    onSubmitRepository: (identifier: string | null, data: RepositoryType) => void;
    selectedTab: string;
    snack: (message: string, severity?: AlertColor) => void;
};

type PluginsDialogFormProps = {
    onClose: (e: Event) => void;
    onSubmit: (data: PluginOptionType) => void;
    open: boolean;
    plugin?: PluginOptionType;
};

type PluginsRepositoryDialogProps = {
    onClose: () => void;
    onSubmit: (identifier: string | null, data: RepositoryType) => void;
    open: boolean;
    edit?: boolean;
    selectedRepository?: string | null;
    repositories: Record<string, RepositoryType>;
};

const PluginsDialogForm = ({ onClose, onSubmit, open, plugin }: PluginsDialogFormProps) => {
    const [errors, setErrors] = useState("");

    const optionsName = Object.keys(plugin || {});

    const handleValidation = (data: PluginOptionType) => {
        const parsedForm = PluginOptionSchema.safeParse(data);

        if (!parsedForm.success) {
            parsedForm.error.issues.forEach((issue) => setErrors(issue.message));
        } else if (parsedForm.data?.key !== undefined && optionsName.includes(parsedForm.data.key)) {
            setErrors("This label was already used by another option");
        } else {
            setErrors("");
        }

        return parsedForm;
    };

    return (
        <Dialog
            fullWidth
            maxWidth="md"
            onClose={onClose}
            open={open}
            PaperProps={{
                component: "form",
                onSubmit: (event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();

                    const formData = new FormData(event.currentTarget);
                    const formJSON = Object.fromEntries(formData.entries());

                    const parsedForm = handleValidation(formJSON);
                    if (parsedForm.success) {
                        onSubmit(parsedForm.data);
                    }
                },
            }}
        >
            <DialogContent>
                <Stack spacing={2}>
                    <TextField
                        autoFocus
                        defaultValue=""
                        error={errors.length > 0}
                        fullWidth
                        helperText={errors}
                        id="key"
                        label="Label"
                        name="key"
                        onChange={(event) => {
                            handleValidation({ key: event.target.value });
                        }}
                        required
                    />
                    <TextField defaultValue="" fullWidth id="option" label="Value" name="option" />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="primary" startIcon={<Add />} type="submit" variant="contained">
                    {"Add"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const PluginsConfiguration = ({ me, snack }: DispatcherProps) => {
    const { model } = useModel();

    const [openModal, setOpenModal] = useState<boolean>(false);
    const [selectedPlugin, setSelectedPlugin] = useState<string | undefined>(undefined);

    const handleCloseModal = () => setOpenModal(false);
    const handleOpenModal = () => setOpenModal(true);

    const pluginsConfig = SRD.unwrap({}, (a) => a, model.pluginsConfig);

    const renderPlugins = SRD.match(
        {
            notAsked: () => <p>Let’s fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`${msg}. Please, reload this page.`}
                </Alert>
            ),
            success: (pluginsEnabled) => {
                const handleUpdateOption = (key: keyof PluginOptionType, value: string) => {
                    if (selectedPlugin) {
                        pluginsConfig[selectedPlugin][key] = value;
                    }
                };

                const handleRemoveOption = (fieldName: keyof PluginOptionType) => () => {
                    if (selectedPlugin) {
                        delete pluginsConfig[selectedPlugin][fieldName];
                        snack(`The option “${fieldName}” have been removed`);
                    }
                };

                const handleSubmitNewOption = (data: PluginOptionType) => {
                    if (selectedPlugin && data.key) {
                        pluginsConfig[selectedPlugin] = { ...pluginsConfig[selectedPlugin], [data.key]: data.option };
                        handleCloseModal();
                    }
                };

                const handleSavePlugins = async () => {
                    const response = await writeConfig(pluginsConfig);

                    void writeLog(me, "ConfigEditor", "save", "plugins");
                    if (response.status == 200) {
                        snack("The configuration have been saved. Reloading…", "warning");
                    } else {
                        snack("A problem occurs on the server.", "error");
                    }
                };

                if (pluginsEnabled.length == 0) {
                    return (
                        <Stack direction="column" justifyContent="center">
                            <Alert variant="filled" severity="info">
                                {"No plugin have been activated for this instance"}
                            </Alert>
                        </Stack>
                    );
                } else if (selectedPlugin === undefined) {
                    setSelectedPlugin(pluginsEnabled[0].name);
                }
                return (
                    <Stack spacing={{ xs: 2 }} useFlexGap>
                        <Stack component={Paper} direction="row" useFlexGap>
                            <Box sx={{ borderRight: "thin solid rgba(0, 0, 0, 0.12)", width: "100%", maxWidth: 250 }}>
                                <nav>
                                    <List sx={{ height: 400, overflow: "auto" }} disablePadding>
                                        {pluginsEnabled.map((plugin) => (
                                            <ListItemButton key={plugin.name} selected={plugin.name === selectedPlugin} onClick={() => setSelectedPlugin(plugin.name)}>
                                                <ListItemIcon>
                                                    <Extension />
                                                </ListItemIcon>
                                                <ListItemText primary={plugin.name} />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </nav>
                            </Box>

                            {selectedPlugin !== undefined && (
                                <Stack direction="column" spacing={{ xs: 2 }} sx={{ padding: 4, width: "100%", height: 400, overflow: "auto" }} useFlexGap>
                                    {
                                        // eslint-disable-next-line no-prototype-builtins
                                        pluginsConfig.hasOwnProperty(selectedPlugin) && (
                                            <Stack spacing={{ xs: 2 }} useFlexGap>
                                                {Object.entries(pluginsConfig[selectedPlugin]).map(([key, value]) => (
                                                    <TextField
                                                        key={key}
                                                        defaultValue=""
                                                        id={`field-${selectedPlugin}-${key}`}
                                                        label={key}
                                                        onChange={(event) => handleUpdateOption(key as keyof PluginOptionType, event.target.value)}
                                                        value={value}
                                                        InputProps={{
                                                            endAdornment: (
                                                                <InputAdornment position="start">
                                                                    <IconButton color="warning" edge="end" onClick={handleRemoveOption(key as keyof PluginOptionType)}>
                                                                        <DeleteForever />
                                                                    </IconButton>
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                ))}
                                            </Stack>
                                        )
                                    }

                                    <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                        <Button color="success" onClick={handleOpenModal} startIcon={<AddCircle />} variant="outlined">
                                            {"Add a new option"}
                                        </Button>
                                    </Stack>
                                </Stack>
                            )}
                        </Stack>

                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <Button onClick={handleSavePlugins} type="submit" variant="contained">
                                Save Plugins
                            </Button>
                        </Stack>

                        <PluginsDialogForm onClose={handleCloseModal} onSubmit={handleSubmitNewOption} open={openModal} plugin={selectedPlugin ? pluginsConfig[selectedPlugin] : undefined} />
                    </Stack>
                );
            },
        },
        model.pluginsEnabled,
    );

    return renderPlugins;
};

const emptyRepository = {
    identifier: null,
    data: {
        url: "",
        version: "",
        token: "",
    },
};

interface RepositoryFormType {
    identifier: null | string;
    data: {
        url?: string;
        version?: string;
        token?: string;
    };
}

const PluginsRepositoryDialog = ({ onClose, onSubmit, open, edit, selectedRepository, repositories }: PluginsRepositoryDialogProps) => {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [pluginsAvailable, setPluginsAvailable] = useState<string[]>([]);
    const [pluginsEnabled, setPluginsEnabled] = useState<string[]>([]);
    const [repository, setRepository] = useState<RepositoryFormType>(emptyRepository);
    const [tags, setTags] = useState<string[]>([]);

    const handleFieldUpdate = (key: string, value: string | string[]) => {
        if (key === "plugins" && Array.isArray(value)) {
            setPluginsEnabled(value);
        }
        setRepository({ identifier: repository.identifier, data: { ...repository.data, [key]: value } });
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const parsedForm = handleValidation(repository);
        if (parsedForm.success) {
            onSubmit(repository.identifier, repository.data);
        }
    };

    const handleValidation = (data: RepositoryFormType) => {
        const parsedForm = RepositorySchema.safeParse(data);

        if (!parsedForm.success) {
            const currentErrors: Record<string, string> = {};
            parsedForm.error.issues.forEach((issue) => {
                issue.path.forEach((path) => {
                    currentErrors[path] = issue.message;
                });
            });
            setErrors(currentErrors);
        } else {
            setErrors({});
        }

        return parsedForm;
    };

    useEffect(() => {
        setErrors({});
        setPluginsAvailable([]);
        setPluginsEnabled([]);
        setTags([]);

        if (selectedRepository !== null && selectedRepository !== undefined) {
            const data = repositories[selectedRepository];
            setRepository({ identifier: selectedRepository, data: data });
            setPluginsEnabled(data.plugins || []);
            getRepositoryTags(selectedRepository)
                .then((response) => {
                    if (response.status === 200) {
                        setTags(response.message);
                    }
                })
                .catch(() => console.error("Could not get repository tags"));
            getRepositoryPlugins(selectedRepository)
                .then((response) => {
                    if (response.status === 200) {
                        setPluginsAvailable(response.message);
                    }
                })
                .catch(() => console.error("Could not get repository plugins"));
        } else {
            setRepository(emptyRepository);
        }
    }, [selectedRepository, repositories]);

    return (
        <Dialog fullWidth maxWidth="md" onClose={onClose} open={open} PaperProps={{ component: "form", onSubmit: handleSubmit }}>
            <DialogTitle>{edit ? "Edit the Plugin Repository" : "Register a Plugin Repository"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField
                        autoFocus
                        error={errors.url !== undefined}
                        fullWidth
                        helperText={errors.url}
                        id="url"
                        label="Repository Git URL"
                        name="url"
                        onChange={(event) => handleFieldUpdate("url", event.target.value)}
                        required
                        value={repository.data.url}
                    />
                    {edit && (
                        <TextField
                            disabled={tags.length === 0}
                            error={errors.version !== undefined}
                            fullWidth
                            helperText={errors.version}
                            id="version"
                            label="Repository Version Tag"
                            name="version"
                            onChange={(event) => handleFieldUpdate("version", event.target.value)}
                            select
                            value={repository.data.version}
                        >
                            {tags.length > 0 &&
                                tags.map((tag) => (
                                    <MenuItem key={tag} value={tag}>
                                        {tag}
                                    </MenuItem>
                                ))}
                        </TextField>
                    )}
                    <PasswordField
                        error={errors.token !== undefined}
                        helperText={errors.token}
                        id="token"
                        label="Authentication Token"
                        onChange={(event) => handleFieldUpdate("token", event.target.value)}
                        value={repository.data.token}
                    />
                    {(pluginsAvailable.length > 1 || (pluginsAvailable.length === 1 && pluginsAvailable[0] !== repository.identifier)) && (
                        <FormGroup sx={{ gap: 2 }}>
                            <Divider>
                                <Chip color="info" label="Multi-Plugins Repository" size="small" />
                            </Divider>
                            <FormControl>
                                <InputLabel id="plugins-label">{"Plugins to activate in this Repository"}</InputLabel>
                                <Select
                                    error={errors.plugins !== undefined}
                                    fullWidth
                                    id="plugins"
                                    input={<OutlinedInput label="Plugins to activate in this Repository" />}
                                    labelId="plugins-label"
                                    multiple
                                    name="plugins"
                                    onChange={(event) => handleFieldUpdate("plugins", event.target.value)}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                            {selected.sort().map((value) => (
                                                <Chip key={value} label={value} />
                                            ))}
                                        </Box>
                                    )}
                                    value={pluginsEnabled}
                                >
                                    {pluginsAvailable.map((plugin) => (
                                        <MenuItem key={plugin} value={plugin}>
                                            <Checkbox checked={pluginsEnabled.indexOf(plugin) > -1} />
                                            <ListItemText primary={plugin} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </FormGroup>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="primary" startIcon={<Done />} type="submit" variant="contained">
                    Submit
                </Button>
            </DialogActions>
        </Dialog>
    );
};

type Order = "asc" | "desc";

const PluginsRepositories = (props: DispatcherProps) => {
    const { onDeleteRepository, onSubmitRepository, snack } = props;
    const { model } = useModel();

    const [modal, setModal] = useState<{
        open: boolean;
        edit?: boolean;
        selectedRepository?: string | null;
    }>({
        open: false,
    });

    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        selectedRepository?: string | null;
    }>({
        open: false,
    });

    const [filter, setFilter] = useState<string>("");
    const [order, setOrder] = useState<Order>("asc");
    const [orderBy, setOrderBy] = useState<keyof RepositoryType>("url");

    const handleCloseModal = () => {
        setModal({ ...modal, open: false });
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialog({ ...deleteDialog, open: false });
    };

    const renderRepositories = SRD.match(
        {
            notAsked: () => <p>Let’s fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`${msg}. Please, reload this page.`}
                </Alert>
            ),
            success: (repositories) => {
                const handleOpenModal = (edit: boolean, repositoryId: string | null = null) => {
                    setModal({ open: true, edit, selectedRepository: repositoryId });
                };

                const handleOpenDeleteDialog = (repositoryId: string) => {
                    setDeleteDialog({ open: true, selectedRepository: repositoryId });
                };

                const handleDeleteRepository = () => {
                    setDeleteDialog({ ...deleteDialog, open: false });
                    onDeleteRepository(deleteDialog.selectedRepository as string);
                };

                const handleFetchRepository = (repositoryId: string) => {
                    fetchRepository(repositoryId)
                        .then((response) => {
                            if (response.status == 200) {
                                snack("The repository have been successfully updated", "success");
                            } else {
                                snack(`An error occurs during fetching: ${response.message as string}`, "error");
                            }
                        })
                        .catch((error) => snack(error as string, "error"));
                };

                const handleSortedTable = (property: keyof RepositoryType) => {
                    const isAsc = orderBy === property && order === "asc";
                    setOrder(isAsc ? "desc" : "asc");
                    setOrderBy(property);
                };

                const handleSubmit = (identifier: string | null, data: RepositoryType) => {
                    handleCloseModal();
                    onSubmitRepository(identifier, data);
                };

                const sortedRepositories = Object.entries(repositories)
                    .slice()
                    .sort((a, b) => {
                        const left: string = a[1][orderBy] as string;
                        const right: string = b[1][orderBy] as string;
                        return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                    });
                return (
                    <Stack spacing={{ xs: 2 }} useFlexGap>
                        <Stack spacing={{ xs: 2 }} sx={{ height: 400 }} useFlexGap>
                            <TextField
                                inputProps={{ autoComplete: "off" }}
                                label="Filter repositories by URL"
                                id="filter-repositories"
                                onChange={(event) => {
                                    setFilter(event.target.value);
                                }}
                            />
                            <TableContainer component={Paper} sx={{ flex: 1 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                                <TableSortLabel active={orderBy === "url"} direction={order} onClick={() => handleSortedTable("url")}>
                                                    URL
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="center" style={{ fontWeight: "bold" }}>
                                                Tag
                                            </TableCell>
                                            <TableCell align="center" style={{ fontWeight: "bold" }}>
                                                Fetch
                                            </TableCell>
                                            <TableCell align="center" style={{ fontWeight: "bold" }}>
                                                Actions
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                        {sortedRepositories
                                            .filter(([_key, data]) => cleanUpText(data.url).includes(cleanUpText(filter)))
                                            .map(([key, data]) => (
                                                <TableRow key={key}>
                                                    <TableCell>
                                                        <Stack alignItems="center" direction="row" spacing={{ xs: 1 }} useFlexGap>
                                                            <Link href={data.url}>{data.url}</Link>
                                                            {data.plugins !== undefined && data.plugins.length > 0 && (
                                                                <Tooltip title={data.plugins.join(", ")}>
                                                                    <Chip
                                                                        color="info"
                                                                        label={data.plugins.length > 1 ? `${data.plugins.length} plugins` : "1 plugin"}
                                                                        size="small"
                                                                        variant="outlined"
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="center">{data.version && <Chip label={data.version} size="small" />}</TableCell>
                                                    <TableCell align="center">
                                                        <IconButton aria-label="fetch" color="primary" onClick={() => handleFetchRepository(key)} title="Fetch Repository">
                                                            <Download />
                                                        </IconButton>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <IconButton aria-label="edit" color="primary" onClick={() => handleOpenModal(true, key)} size="small" title={"Edit Repository"}>
                                                                <Edit />
                                                            </IconButton>
                                                            <IconButton aria-label="delete" color="error" onClick={() => handleOpenDeleteDialog(key)} size="small" title={"Delete Repository"}>
                                                                <DeleteForever />
                                                            </IconButton>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Stack>

                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <Button onClick={() => handleOpenModal(false)} variant="contained">
                                Add Repository
                            </Button>
                        </Stack>

                        <PluginsRepositoryDialog
                            onClose={handleCloseModal}
                            onSubmit={handleSubmit}
                            open={modal.open}
                            edit={modal.edit}
                            repositories={repositories}
                            selectedRepository={modal.selectedRepository}
                        />
                        <DeleteDialog
                            description={"This repository will be erased from this instance. Are you sure?"}
                            isOpen={deleteDialog.open}
                            onClose={handleCloseDeleteDialog}
                            onDelete={handleDeleteRepository}
                            title={"Delete Repository"}
                        />
                    </Stack>
                );
            },
        },
        model.repositories,
    );

    return renderRepositories;
};

const Dispatcher = (props: DispatcherProps) => {
    switch (props.selectedTab) {
        case "repositories":
            return <PluginsRepositories {...props} />;
        case "configuration":
            return <PluginsConfiguration {...props} />;
    }
};

const PluginsForm = () => {
    const { model, updateModel } = useModel();

    const [selectedTab, setSelectedTab] = useState<string>("repositories");

    const [snackOpen, setSnackOpen] = useState<boolean>(false);
    const [snackSeverity, setSnackSeverity] = useState<AlertColor>("success");
    const [snackMessage, setSnackMessage] = useState<string>("");

    const me = SRD.withDefault("", model.me);

    const handleSelectedTab = (_event: SyntheticEvent, newValue: string) => setSelectedTab(newValue);

    const handleSnackbar = (message: string, severity: AlertColor = "success") => {
        setSnackSeverity(severity);
        setSnackMessage(message);
        setSnackOpen(true);
    };

    const handleSnackbarClose = (_event: SyntheticEvent | Event, reason?: string) => {
        if (reason !== "clickaway") {
            setSnackOpen(false);
        }
    };

    const handleDeleteRepository = async (repositoryId: string) => {
        const response = await deleteRepository(repositoryId);
        if (response.status == 200) {
            await updateModelRepositories();
            handleSnackbar("The repository have been removed successfully", "success");
        } else {
            handleSnackbar("An error occurs during the repository deleting", "error");
        }
    };

    const handleSubmitRepository = async (identifier: string | null, data: RepositoryType) => {
        if (identifier === null) {
            identifier = ulid();
        }
        handleSnackbar("Updating in progress…", "warning");
        const response = (await writeRepository(identifier, data, true)) as Response;
        if (response.status == 200) {
            await updateModelRepositories();
            handleSnackbar("The repository have been successfully updated", "success");
        } else {
            handleSnackbar(`An error occurs: ${response.message as string}`, "error");
        }
    };

    const updateModelRepositories = async () => {
        try {
            const response1 = await readRepositories();
            updateModel({ type: "repositories", payload: success(response1) });
        } catch (e) {
            console.error("Error reading repositories. ", e);
        }
        try {
            const response2 = await getEnabledPlugins();
            updateModel({ type: "pluginsEnabled", payload: success(response2) });
        } catch (e) {
            console.error("Error getting enabled plugins. ", e);
        }
    };

    return SRD.match(
        {
            success: () => (
                <Stack sx={{ m: 2 }}>
                    <Snackbar autoHideDuration={2000} open={snackOpen} onClose={handleSnackbarClose}>
                        <Alert onClose={handleSnackbarClose} severity={snackSeverity} sx={{ width: "100%" }}>
                            {snackMessage}
                        </Alert>
                    </Snackbar>

                    <Tabs centered onChange={handleSelectedTab} sx={{ marginBottom: 2 }} value={selectedTab}>
                        <Tab label="Repositories" value="repositories" />
                        <Tab label="Configuration" value="configuration" />
                    </Tabs>

                    <Dispatcher me={me} onDeleteRepository={handleDeleteRepository} onSubmitRepository={handleSubmitRepository} selectedTab={selectedTab} snack={handleSnackbar} />
                </Stack>
            ),
            notAsked: () => <p>{"Let’s fetch some data!"}</p>,
            loading: () => (
                <Stack justifyContent="center" sx={{ m: 4 }}>
                    <CircularProgress />
                </Stack>
            ),
            failure: (msg: string) => (
                <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`${msg}. Please, reload this page.`}
                </Alert>
            ),
        },
        model.repositories,
    );
};

export { PluginsForm };

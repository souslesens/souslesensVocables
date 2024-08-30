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
} from "@mui/material";
import { Add, Extension, DeleteForever, AddCircle, Done, Download } from "@mui/icons-material";

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
    writeConfig,
    writeRepository,
} from "../Plugins";
import { Tool } from "../Tool";

import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { PasswordField } from "./PasswordField";
import { cleanUpText } from "../Utils";
import { Database } from "../Database";

type DispatcherProps = {
    me: string;
    onDeleteRepository: (repositoryId: string) => void;
    onSubmitRepository: (identifier: string | null, data: RepositoryType, toFetch: boolean) => void;
    selectedTab: string;
    snack: (message: string, severity: string) => void;
};

type PluginsDialogFormProps = {
    onClose: (e: Event) => void;
    onSubmit: (e: Event) => void;
    open: boolean;
    plugin: Tool;
};

type PluginsRepositoryDialogProps = {
    onClose: (e: Event) => void;
    onSubmit: (e: Event) => void;
    open: boolean;
};

const PluginsDialogForm = (props: PluginsDialogFormProps) => {
    const { onClose, onSubmit, open, plugin } = props;

    const [errors, setErrors] = useState("");

    const optionsName = Object.keys(plugin || {});

    const handleValidation = (data) => {
        const parsedForm = PluginOptionSchema.safeParse(data);

        if (parsedForm.data !== undefined && optionsName.includes(parsedForm.data.key)) {
            setErrors("This label was already used by another option");
        } else if (parsedForm.error !== undefined) {
            parsedForm.error.issues.forEach((issue) => setErrors(issue.message));
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
                    const formJSON = Object.fromEntries((formData as any).entries());

                    const parsedForm = handleValidation(formJSON);
                    if (errors.length === 0) {
                        onSubmit(parsedForm.data);
                    }
                },
            }}
        >
            <DialogContent>
                <Stack spacing={2}>
                    <TextField
                        autofocus
                        defaultValue=""
                        error={errors.length > 0}
                        fullWidth
                        helperText={errors}
                        id="key"
                        label="Label"
                        name="key"
                        onChange={(event: FormEvent<HTMLFormElement>) => {
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

const PluginsConfiguration = (props: DispatcherProps) => {
    const { me, snack } = props;
    const { model, updateModel } = useModel();

    const [openModal, setOpenModal] = useState<boolean>(false);
    const [selectedPlugin, setSelectedPlugin] = useState<Tool>(undefined);

    const handleCloseModal = () => setOpenModal(false);
    const handleOpenModal = () => setOpenModal(true);

    const handleUpdateOption = async (key: string, value: string) => {
        model.pluginsConfig.data[selectedPlugin][key] = value;
        setSelectedPlugin(selectedPlugin);
    };

    const handleRemoveOption = (fieldName: string) => () => {
        delete model.pluginsConfig.data[selectedPlugin][fieldName];
        snack(`The option “${fieldName}” have been removed`);
    };

    const handleSubmitNewOption = (data: PluginOptionType) => {
        model.pluginsConfig.data[selectedPlugin] = { ...model.pluginsConfig.data[selectedPlugin], [data.key]: data.option };
        handleCloseModal();
    };

    const handleSavePlugins = async () => {
        const response = await writeConfig(model.pluginsConfig.data);

        writeLog(me, "ConfigEditor", "save", "plugins");
        if (response.status == 200) {
            snack("The configuration have been saved. Reloading…", "warning");
        } else {
            snack("A problem occurs on the server.", "error");
        }
    };

    if (model.pluginsEnabled.data.length == 0) {
        return (
            <Stack direction="column" justifyContent="center">
                <Alert variant="filled" severity="info">
                    {"No plugin have been activated for this instance"}
                </Alert>
            </Stack>
        );
    } else if (selectedPlugin === undefined) {
        setSelectedPlugin(model.pluginsEnabled.data[0].name);
    }

    return (
        <Stack spacing={{ xs: 2 }} useFlexGap>
            <Stack component={Paper} direction="row" useFlexGap>
                <Box sx={{ borderRight: "thin solid rgba(0, 0, 0, 0.12)", width: "100%", maxWidth: 250 }}>
                    <nav>
                        <List sx={{ height: 400, overflow: "auto" }} disablePadding>
                            {model.pluginsEnabled.data.map((plugin) => (
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
                            model.pluginsConfig.data.hasOwnProperty(selectedPlugin) && (
                                <Stack spacing={{ xs: 2 }} useFlexGap>
                                    {Object.entries(model.pluginsConfig.data[selectedPlugin]).map(([key, value]) => (
                                        <TextField
                                            key={key}
                                            defaultValue=""
                                            id={`field-${selectedPlugin.name}-${key}`}
                                            label={key}
                                            onChange={(event) => handleUpdateOption(key, event.target.value)}
                                            value={value}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="start">
                                                        <IconButton color="warning" edge="end" onClick={handleRemoveOption(key)}>
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

            <PluginsDialogForm onClose={handleCloseModal} onSubmit={handleSubmitNewOption} open={openModal} plugin={model.pluginsConfig.data[selectedPlugin]} />
        </Stack>
    );
};

const emptyRepository = {
    identifier: null,
    data: {
        url: "",
        version: "",
        token: "",
    },
};

const PluginsRepositoryDialog = (props: PluginsRepositoryDialogProps) => {
    const { onClose, onSubmit, open } = props;
    const { model, updateModel } = useModel();

    const [edit, setEdit] = useState<boolean>(false);
    const [errors, setErrors] = useState({});
    const [pluginsAvailable, setPluginsAvailable] = useState([]);
    const [pluginsEnabled, setPluginsEnabled] = useState([]);
    const [repository, setRepository] = useState(emptyRepository);
    const [tags, setTags] = useState([]);

    const handleFieldUpdate = (key: string, value: string | [string]) => {
        if (key == "plugins") {
            setPluginsEnabled(value);
        } else {
            setRepository({ identifier: repository.identifier, data: { ...repository.data, [key]: value } });
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const formJSON = Object.fromEntries((formData as any).entries());

        if (pluginsAvailable.length > 1) {
            formJSON.plugins = pluginsEnabled;
        }

        const parsedForm = handleValidation(formJSON);
        if (Object.keys(errors).length === 0) {
            onSubmit(repository.identifier, parsedForm.data, formJSON.fetch === "on");
        }
    };

    const handleValidation = (data) => {
        const parsedForm = RepositorySchema.safeParse(data);

        if (parsedForm.error !== undefined) {
            const currentErrors = {};
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

        if (model.dialog !== null && model.dialog.data.selectedRepository !== null) {
            setEdit(model.dialog.data.edit);

            const selectedRepository = model.dialog.data.selectedRepository;
            const data = model.dialog.data.repositories[selectedRepository];
            setRepository({ identifier: selectedRepository, data: data });
            setPluginsEnabled(data.plugins || []);
            getRepositoryTags(selectedRepository).then((response) => {
                if (response.status === 200) {
                    setTags(response.message);
                }
            });
            getRepositoryPlugins(selectedRepository).then((response) => {
                if (response.status === 200) {
                    setPluginsAvailable(response.message);
                }
            });
        } else {
            setEdit(false);
            setRepository(emptyRepository);
        }
    }, [model.dialog]);

    return (
        <Dialog fullWidth maxWidth="md" onClose={onClose} open={open} PaperProps={{ component: "form", onSubmit: handleSubmit }}>
            <DialogTitle>{edit ? "Edit the Plugin Repository" : "Register a Plugin Repository"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField
                        autofocus
                        error={errors.url !== undefined}
                        fullWidth
                        helperText={errors.url}
                        id="url"
                        label="Repository Git URL"
                        name="url"
                        onChange={(event: SyntheticEvent | Event) => handleFieldUpdate("url", event.target.value)}
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
                            onChange={(event: SyntheticEvent | Event) => handleFieldUpdate("version", event.target.value)}
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
                        onChange={(event: SyntheticEvent | Event) => handleFieldUpdate("token", event.target.value)}
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
                                    fullWidth
                                    id="plugins"
                                    input={<OutlinedInput label="Plugins to activate in this Repository" />}
                                    labelId="plugins-label"
                                    multiple
                                    name="plugins"
                                    onChange={(event: SyntheticEvent | Event) => handleFieldUpdate("plugins", event.target.value)}
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
                    {"Submit"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const PluginsRepositories = (props: DispatcherProps) => {
    const { me, onDeleteRepository, onSubmitRepository, snack } = props;
    const { model, updateModel } = useModel();

    const [openModal, setOpenModal] = useState<boolean>(false);

    const [filter, setFilter] = useState<string>("");
    const [order, setOrder] = useState<Order>("asc");
    const [orderBy, setOrderBy] = useState<keyof Database>("url");

    const handleCloseModal = () => {
        updateModel({ type: "dialog", payload: null });
        setOpenModal(false);
    };

    const handleOpenModal = (mode: boolean, repositoryId?: string | null = null) => {
        updateModel({
            type: "dialog",
            payload: success({
                edit: mode,
                repositories: model.repositories.data,
                selectedRepository: repositoryId,
            }),
        });
        setOpenModal(true);
    };

    const handleFetchRepository = (repositoryId: string) => {
        fetchRepository(repositoryId)
            .then((response) => {
                if (response.status == 200) {
                    snack("The repository have been successfully updated", "success");
                } else {
                    snack("An error occurs during the repository fetching", "error");
                }
            })
            .catch((error) => snack(error, "error"));
    };

    const handleSortedTable = (property: keyof RepositoryType) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleSubmit = (identifier: string | null, data: RepositoryType, toFetch: boolean) => {
        setOpenModal(false);
        onSubmitRepository(identifier, data, toFetch);
    };

    const sortedRepositories = Object.entries(model.repositories.data)
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
                                .filter(([key, data]) => cleanUpText(data.url).includes(cleanUpText(filter)))
                                .map(([key, data]) => (
                                    <TableRow key={key}>
                                        <TableCell>
                                            <Stack alignItems="center" direction="row" spacing={{ xs: 1 }} useFlexGap>
                                                <Link href={data.url}>{data.url}</Link>
                                                {data.plugins !== undefined && data.plugins.length > 0 && (
                                                    <Tooltip title={data.plugins.join(", ")}>
                                                        <Chip color="info" label={data.plugins.length > 1 ? `${data.plugins.length} plugins` : "1 plugin"} size="small" variant="outlined" />
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center">{data.version && <Chip label={data.version} size="small" />}</TableCell>
                                        <TableCell align="center">
                                            <IconButton color="primary" onClick={() => handleFetchRepository(key)} title="Fetch Repository" variant="contained">
                                                <Download />
                                            </IconButton>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                <Button onClick={() => handleOpenModal(true, key)} variant="contained">
                                                    Edit
                                                </Button>
                                                <ButtonWithConfirmation label="Delete" msg={() => onDeleteRepository(key)} />
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

            <PluginsRepositoryDialog onClose={handleCloseModal} onSubmit={handleSubmit} open={openModal} />
        </Stack>
    );
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
    const [snackSeverity, setSnackSeverity] = useState<string>("success");
    const [snackMessage, setSnackMessage] = useState<string>("");

    const me = SRD.withDefault("", model.me);
    const config = SRD.withDefault({}, model.pluginsConfig);
    const plugins = SRD.withDefault([], model.pluginsEnabled);
    const repositories = SRD.withDefault({}, model.repositories);

    const handleSelectedTab = (event: SyntheticEvent, newValue: string) => setSelectedTab(newValue);

    const handleSnackbar = (message: string, severity = "success") => {
        setSnackSeverity(severity);
        setSnackMessage(message);
        setSnackOpen(true);
    };

    const handleSnackbarClose = async (event: SyntheticEvent | Event, reason?: string) => {
        if (reason !== "clickaway") {
            setSnackOpen(false);
        }
    };

    const handleDeleteRepository = (repositoryId: string) => {
        (async () => {
            const response = await deleteRepository(repositoryId);
            if (response.status == 200) {
                await updateModelRepositories();
                handleSnackbar("The repository have been removed successfully", "success");
            } else {
                handleSnackbar("An error occurs during the repository deleting", "error");
            }
        })();
    };

    const handleSubmitRepository = (identifier: string | null, data: RepositoryType, toFetch = true) => {
        if (identifier === null) {
            identifier = ulid();
        }

        (async () => {
            const response = await writeRepository(identifier, data, toFetch);
            if (response.status == 200) {
                await updateModelRepositories();
                handleSnackbar("The repository have been successfully updated", "success");
            } else {
                handleSnackbar("An error occurs during the repository updating", "error");
            }
        })();
    };

    const updateModelRepositories = async () => {
        let response = await readRepositories();
        updateModel({ type: "repositories", payload: success(response) });
        response = await getEnabledPlugins();
        updateModel({ type: "pluginsEnabled", payload: success(response) });
    };

    return SRD.match(
        {
            success: (content) => (
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
        model.repositories
    );
};

export { PluginsForm };

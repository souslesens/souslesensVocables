import * as Mui from "@mui/material";
import * as MuiIcons from "@mui/icons-material";
import * as React from "react";

import { RD, SRD, failure, loading, success } from "srd";
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
    readConfig,
    readRepositories,
    writeConfig,
    writeRepository,
} from "../Plugins";
import { Tool } from "../Tool";

import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { PasswordField } from "./PasswordField";
import { cleanUpText } from "../Utils";

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

    const [errors, setErrors] = React.useState("");

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
        <Mui.Dialog
            fullWidth
            maxWidth="md"
            onClose={onClose}
            open={open}
            PaperProps={{
                component: "form",
                onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
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
            <Mui.DialogContent>
                <Mui.Stack spacing={2}>
                    <Mui.TextField
                        autofocus
                        defaultValue=""
                        error={errors.length > 0}
                        fullWidth
                        helperText={errors}
                        id="key"
                        label="Label"
                        name="key"
                        onChange={(event: React.FormEvent<HTMLFormElement>) => {
                            handleValidation({ key: event.target.value });
                        }}
                        required
                    />
                    <Mui.TextField defaultValue="" fullWidth id="option" label="Value" name="option" />
                </Mui.Stack>
            </Mui.DialogContent>
            <Mui.DialogActions>
                <Mui.Button color="primary" startIcon={<MuiIcons.Add />} type="submit" variant="contained">
                    {"Add"}
                </Mui.Button>
            </Mui.DialogActions>
        </Mui.Dialog>
    );
};

const PluginsConfiguration = (props: DispatcherProps) => {
    const { me, snack } = props;
    const { model, updateModel } = useModel();

    const [openModal, setOpenModal] = React.useState<boolean>(false);
    const [selectedPlugin, setSelectedPlugin] = React.useState<Tool>(undefined);

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
            <Mui.Stack direction="column" justifyContent="center">
                <Mui.Alert variant="filled" severity="info">
                    {"No plugin have been activated for this instance"}
                </Mui.Alert>
            </Mui.Stack>
        );
    } else if (selectedPlugin === undefined) {
        setSelectedPlugin(model.pluginsEnabled.data[0].name);
    }

    return (
        <Mui.Stack spacing={{ xs: 2 }} useFlexGap>
            <Mui.Stack component={Mui.Paper} direction="row" useFlexGap>
                <Mui.Box sx={{ borderRight: "thin solid rgba(0, 0, 0, 0.12)", width: "100%", maxWidth: 250 }}>
                    <nav>
                        <Mui.List sx={{ height: 400, overflow: "auto" }} disablePadding>
                            {model.pluginsEnabled.data.map((plugin) => (
                                <Mui.ListItemButton selected={plugin.name === selectedPlugin} onClick={() => setSelectedPlugin(plugin.name)}>
                                    <Mui.ListItemIcon>
                                        <MuiIcons.Extension />
                                    </Mui.ListItemIcon>
                                    <Mui.ListItemText primary={plugin.name} />
                                </Mui.ListItemButton>
                            ))}
                        </Mui.List>
                    </nav>
                </Mui.Box>

                {selectedPlugin !== undefined && (
                    <Mui.Stack direction="column" spacing={{ xs: 2 }} sx={{ padding: 4, width: "100%", height: 400, overflow: "auto" }} useFlexGap>
                        {model.pluginsConfig.data.hasOwnProperty(selectedPlugin) && (
                            <Mui.Stack spacing={{ xs: 2 }} useFlexGap>
                                {Object.entries(model.pluginsConfig.data[selectedPlugin]).map(([key, value]) => (
                                    <Mui.TextField
                                        defaultValue=""
                                        id={`field-${selectedPlugin.name}-${key}`}
                                        label={key}
                                        onChange={(event) => handleUpdateOption(key, event.target.value)}
                                        value={value}
                                        InputProps={{
                                            endAdornment: (
                                                <Mui.InputAdornment position="start">
                                                    <Mui.IconButton color="warning" edge="end" onClick={handleRemoveOption(key)}>
                                                        <MuiIcons.DeleteForever />
                                                    </Mui.IconButton>
                                                </Mui.InputAdornment>
                                            ),
                                        }}
                                    />
                                ))}
                            </Mui.Stack>
                        )}

                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <Mui.Button color="success" onClick={handleOpenModal} startIcon={<MuiIcons.AddCircle />} variant="outlined">
                                {"Add a new option"}
                            </Mui.Button>
                        </Mui.Stack>
                    </Mui.Stack>
                )}
            </Mui.Stack>

            <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                <Mui.Button onClick={handleSavePlugins} type="submit" variant="contained">
                    Save Plugins
                </Mui.Button>
            </Mui.Stack>

            <PluginsDialogForm onClose={handleCloseModal} onSubmit={handleSubmitNewOption} open={openModal} plugin={model.pluginsConfig.data[selectedPlugin]} />
        </Mui.Stack>
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

    const [edit, setEdit] = React.useState<boolean>(false);
    const [errors, setErrors] = React.useState({});
    const [pluginsAvailable, setPluginsAvailable] = React.useState([]);
    const [pluginsEnabled, setPluginsEnabled] = React.useState([]);
    const [repository, setRepository] = React.useState(emptyRepository);
    const [tags, setTags] = React.useState([]);

    const handleFieldUpdate = (key: string, value: string | [string]) => {
        if (key == "plugins") {
            setPluginsEnabled(value);
        } else {
            setRepository({ identifier: repository.identifier, data: { ...repository.data, [key]: value } });
        }
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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

    React.useEffect(() => {
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
        <Mui.Dialog fullWidth maxWidth="md" onClose={onClose} open={open} PaperProps={{ component: "form", onSubmit: handleSubmit }}>
            <Mui.DialogTitle>{edit ? "Edit the Plugin Repository" : "Register a Plugin Repository"}</Mui.DialogTitle>
            <Mui.DialogContent>
                <Mui.Stack spacing={2} sx={{ pt: 1 }}>
                    <Mui.TextField
                        autofocus
                        error={errors.url !== undefined}
                        fullWidth
                        helperText={errors.url}
                        id="url"
                        label="Repository Git URL"
                        name="url"
                        onChange={(event: React.SyntheticEvent | Event) => handleFieldUpdate("url", event.target.value)}
                        required
                        value={repository.data.url}
                    />
                    {edit && (
                        <Mui.TextField
                            disabled={tags.length === 0}
                            error={errors.version !== undefined}
                            fullWidth
                            helperText={errors.version}
                            id="version"
                            label="Repository Version Tag"
                            name="version"
                            onChange={(event: React.SyntheticEvent | Event) => handleFieldUpdate("version", event.target.value)}
                            select
                            value={repository.data.version}
                        >
                            {tags.length > 0 &&
                                tags.map((tag) => (
                                    <Mui.MenuItem key={tag} value={tag}>
                                        {tag}
                                    </Mui.MenuItem>
                                ))}
                        </Mui.TextField>
                    )}
                    <PasswordField
                        error={errors.token !== undefined}
                        helperText={errors.token}
                        id="token"
                        label="Authentication Token"
                        onChange={(event: React.SyntheticEvent | Event) => handleFieldUpdate("token", event.target.value)}
                        value={repository.data.token}
                    />
                    {(pluginsAvailable.length > 1 || (pluginsAvailable.length === 1 && pluginsAvailable[0] !== repository.identifier)) && (
                        <Mui.FormGroup sx={{ gap: 2 }}>
                            <Mui.Divider>
                                <Mui.Chip color="info" label="Multi-Plugins Repository" size="small" />
                            </Mui.Divider>
                            <Mui.FormControl>
                                <Mui.InputLabel id="plugins-label">{"Plugins to activate in this Repository"}</Mui.InputLabel>
                                <Mui.Select
                                    fullWidth
                                    id="plugins"
                                    input={<Mui.OutlinedInput label="Plugins to activate in this Repository" />}
                                    labelId="plugins-label"
                                    multiple
                                    name="plugins"
                                    onChange={(event: React.SyntheticEvent | Event) => handleFieldUpdate("plugins", event.target.value)}
                                    renderValue={(selected) => (
                                        <Mui.Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                            {selected.sort().map((value) => (
                                                <Mui.Chip key={value} label={value} />
                                            ))}
                                        </Mui.Box>
                                    )}
                                    value={pluginsEnabled}
                                >
                                    {pluginsAvailable.map((plugin) => (
                                        <Mui.MenuItem key={plugin} value={plugin}>
                                            <Mui.Checkbox checked={pluginsEnabled.indexOf(plugin) > -1} />
                                            <Mui.ListItemText primary={plugin} />
                                        </Mui.MenuItem>
                                    ))}
                                </Mui.Select>
                            </Mui.FormControl>
                        </Mui.FormGroup>
                    )}
                </Mui.Stack>
            </Mui.DialogContent>
            <Mui.DialogActions>
                <Mui.Button color="primary" startIcon={<MuiIcons.Done />} type="submit" variant="contained">
                    {"Submit"}
                </Mui.Button>
            </Mui.DialogActions>
        </Mui.Dialog>
    );
};

const PluginsRepositories = (props: DispatcherProps) => {
    const { me, onDeleteRepository, onSubmitRepository, snack } = props;
    const { model, updateModel } = useModel();

    const [openModal, setOpenModal] = React.useState<boolean>(false);

    const [filter, setFilter] = React.useState<string>("");
    const [order, setOrder] = React.useState<Order>("asc");
    const [orderBy, setOrderBy] = React.useState<keyof Database>("url");

    const handleCloseModal = () => {
        updateModel({ type: "PluginRepositoriesDialogModal", payload: null });
        setOpenModal(false);
    };

    const handleOpenModal = (mode: boolean, repositoryId?: string | null = null) => {
        updateModel({
            type: "PluginRepositoriesDialogModal",
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
        <Mui.Stack spacing={{ xs: 2 }} useFlexGap>
            <Mui.Stack spacing={{ xs: 2 }} sx={{ height: 400 }} useFlexGap>
                <Mui.TextField
                    label="Filter repositories by URL"
                    id="filter-repositories"
                    onChange={(event) => {
                        setFilter(event.target.value);
                    }}
                />
                <Mui.TableContainer component={Mui.Paper} sx={{ flex: 1 }}>
                    <Mui.Table stickyHeader>
                        <Mui.TableHead>
                            <Mui.TableRow>
                                <Mui.TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                    <Mui.TableSortLabel active={orderBy === "url"} direction={order} onClick={() => handleSortedTable("url")}>
                                        URL
                                    </Mui.TableSortLabel>
                                </Mui.TableCell>
                                <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                    Tag
                                </Mui.TableCell>
                                <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                    Fetch
                                </Mui.TableCell>
                                <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                    Actions
                                </Mui.TableCell>
                            </Mui.TableRow>
                        </Mui.TableHead>

                        <Mui.TableBody sx={{ width: "100%", overflow: "visible" }}>
                            {sortedRepositories
                                .filter(([key, data]) => cleanUpText(data.url).includes(cleanUpText(filter)))
                                .map(([key, data]) => (
                                    <Mui.TableRow key={key}>
                                        <Mui.TableCell>
                                            <Mui.Stack alignItems="center" direction="row" spacing={{ xs: 1 }} useFlexGap>
                                                <Mui.Link href={data.url}>{data.url}</Mui.Link>
                                                {data.plugins !== undefined && data.plugins.length > 0 && (
                                                    <Mui.Tooltip title={data.plugins.join(", ")}>
                                                        <Mui.Chip color="info" label={data.plugins.length > 1 ? `${data.plugins.length} plugins` : "1 plugin"} size="small" variant="outlined" />
                                                    </Mui.Tooltip>
                                                )}
                                            </Mui.Stack>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center">{data.version && <Mui.Chip label={data.version} size="small" />}</Mui.TableCell>
                                        <Mui.TableCell align="center">
                                            <Mui.IconButton color="primary" onClick={() => handleFetchRepository(key)} title="Fetch Repository" variant="contained">
                                                <MuiIcons.Download />
                                            </Mui.IconButton>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center">
                                            <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                <Mui.Button onClick={() => handleOpenModal(true, key)} variant="contained">
                                                    Edit
                                                </Mui.Button>
                                                <ButtonWithConfirmation label="Delete" msg={() => onDeleteRepository(key)} />
                                            </Mui.Stack>
                                        </Mui.TableCell>
                                    </Mui.TableRow>
                                ))}
                        </Mui.TableBody>
                    </Mui.Table>
                </Mui.TableContainer>
            </Mui.Stack>

            <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                <Mui.Button onClick={() => handleOpenModal(false)} variant="contained">
                    Add Repository
                </Mui.Button>
            </Mui.Stack>

            <PluginsRepositoryDialog onClose={handleCloseModal} onSubmit={handleSubmit} open={openModal} />
        </Mui.Stack>
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

    const [selectedTab, setSelectedTab] = React.useState<string>("repositories");

    const [snackOpen, setSnackOpen] = React.useState<bool>(false);
    const [snackSeverity, setSnackSeverity] = React.useState<string>("success");
    const [snackMessage, setSnackMessage] = React.useState<string>("");

    const me = SRD.withDefault("", model.me);
    const config = SRD.withDefault({}, model.pluginsConfig);
    const plugins = SRD.withDefault([], model.pluginsEnabled);
    const repositories = SRD.withDefault({}, model.repositories);

    const handleSelectedTab = (event: React.SyntheticEvent, newValue: string) => setSelectedTab(newValue);

    const handleSnackbar = (message: string, severity: string = "success") => {
        setSnackSeverity(severity);
        setSnackMessage(message);
        setSnackOpen(true);
    };

    const handleSnackbarClose = async (event: React.SyntheticEvent | Event, reason?: string) => {
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

    const handleSubmitRepository = (identifier: string | null, data: RepositoryType, toFetch: boolean = true) => {
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
        updateModel({ type: "ServerRespondedWithRepositories", payload: success(response) });
        response = await getEnabledPlugins();
        updateModel({ type: "ServerRespondedWithPluginsEnabled", payload: success(response) });
    };

    return SRD.match(
        {
            success: (content) => (
                <Mui.Stack sx={{ m: 2 }}>
                    <Mui.Snackbar autoHideDuration={2000} open={snackOpen} onClose={handleSnackbarClose}>
                        <Mui.Alert onClose={handleSnackbarClose} severity={snackSeverity} sx={{ width: "100%" }}>
                            {snackMessage}
                        </Mui.Alert>
                    </Mui.Snackbar>

                    <Mui.Tabs centered onChange={handleSelectedTab} sx={{ marginBottom: 2 }} value={selectedTab}>
                        <Mui.Tab label="Repositories" value="repositories" />
                        <Mui.Tab label="Configuration" value="configuration" />
                    </Mui.Tabs>

                    <Dispatcher me={me} onDeleteRepository={handleDeleteRepository} onSubmitRepository={handleSubmitRepository} selectedTab={selectedTab} snack={handleSnackbar} />
                </Mui.Stack>
            ),
            notAsked: () => <p>{"Let’s fetch some data!"}</p>,
            loading: () => (
                <Mui.Stack justifyContent="center" sx={{ m: 4 }}>
                    <Mui.CircularProgress />
                </Mui.Stack>
            ),
            failure: (msg: string) => (
                <Mui.Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`${msg}. Please, reload this page.`}
                </Mui.Alert>
            ),
        },
        model.repositories
    );
};

export { PluginsForm };

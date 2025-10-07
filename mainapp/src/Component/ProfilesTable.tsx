import { useState, useMemo, useReducer, ChangeEvent, forwardRef, Ref, Dispatch, MouseEventHandler } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Modal,
    Paper,
    Select,
    SelectChangeEvent,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
    Tooltip,
    Typography,
    styled,
} from "@mui/material";

import { ChevronRight, Close, Done, Edit, ExpandMore } from "@mui/icons-material";
import { TreeView, TreeItem, TreeItemProps, TreeItemContentProps, useTreeItem } from "@mui/x-tree-view";

import clsx from "clsx";
import CsvDownloader from "react-csv-downloader";
import { useZorm, createCustomIssues } from "react-zorm";
import { ZodIssue } from "zod";

import { Msg, useModel } from "../Admin";
import { SRD } from "srd";
import { defaultProfile, saveProfile, Profile, deleteProfile, SourceAccessControl, ProfileSchema, ProfileSchemaCreate, useDatabases } from "../Profile";
import { ServerSource } from "../Source";
import { writeLog } from "../Log";
import { identity, style, joinWhenArray, cleanUpText } from "../Utils";
import { ulid } from "ulid";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { errorMessage } from "./errorMessage";
import { Datas } from "react-csv-downloader/dist/esm/lib/csv";

const ProfilesTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = useState(model.profilesInitialFilter);
    const [orderBy, setOrderBy] = useState<keyof Profile>("name");
    const [order, setOrder] = useState<Order>("asc");

    const me = SRD.withDefault("", model.me);

    type Order = "asc" | "desc";

    function handleRequestSort(property: keyof Profile) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const handleDeleteProfile = (profile: Profile, updateModel: Dispatch<Msg>) => {
        void deleteProfile(profile, updateModel);
        void writeLog(me, "ConfigEditor", "delete", profile.name);
    };

    const renderProfiles = SRD.match(
        {
            notAsked: () => <p>Let’s fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}
                </Alert>
            ),
            success: (gotProfiles: Profile[]) => {
                const datas = gotProfiles.map((profile) => {
                    const { allowedSourceSchemas, allowedTools, allowedDatabases, isShared, sourcesAccessControl, ...restOfProperties } = profile;
                    const processedData = {
                        ...restOfProperties,
                        allowedTools: joinWhenArray(allowedTools),
                        allowedDatabases: joinWhenArray(allowedDatabases),
                        isShared: JSON.stringify(isShared),
                        allowedSourceSchemas: allowedSourceSchemas.join(";"),
                        sourcesAccessControl: JSON.stringify(sourcesAccessControl),
                    };
                    const dataWithoutCarriageReturns = Object.fromEntries(
                        Object.entries(processedData).map(([key, value]) => {
                            if (typeof value === "string") {
                                return [key, value.replace("\n", " ")];
                            }
                            return [key, value];
                        }),
                    );
                    return { ...dataWithoutCarriageReturns };
                });
                const sortedProfiles: Profile[] = gotProfiles.slice().sort((a: Profile, b: Profile) => {
                    let left = "";
                    let right = "";

                    if (a[orderBy] instanceof Array && b[orderBy] instanceof Array) {
                        left = a[orderBy]?.toString() ?? "";
                        right = b[orderBy]?.toString() ?? "";
                    } else {
                        left = a[orderBy] as string;
                        right = b[orderBy] as string;
                    }

                    return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                });
                return (
                    <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <TextField
                            inputProps={{ autoComplete: "off" }}
                            label="Search Profiles by name"
                            id="filter profiles"
                            onChange={(event) => {
                                setFilteringChars(event.target.value);
                            }}
                            value={filteringChars}
                        />
                        <TableContainer sx={{ height: "400px" }} component={Paper}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>
                                                Name
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                            <TableSortLabel active={orderBy === "allowedTools"} direction={order} onClick={() => handleRequestSort("allowedTools")}>
                                                Allowed Tools
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                            <TableSortLabel active={orderBy === "isShared"} direction={order} onClick={() => handleRequestSort("isShared")}>
                                                Shared Users
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                            <TableSortLabel active={orderBy === "allowedSourceSchemas"} direction={order} onClick={() => handleRequestSort("allowedSourceSchemas")}>
                                                Allowed Sources
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                    {sortedProfiles
                                        .filter((profile) => cleanUpText(profile.name).includes(cleanUpText(filteringChars)))
                                        .map((profile) => {
                                            return (
                                                <TableRow key={profile.id}>
                                                    <TableCell>{profile.name}</TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            {profile.allowedTools.slice(0, 3).map((tool) => (
                                                                <Chip key={tool} label={tool} size="small" />
                                                            ))}
                                                            {profile.allowedTools.slice(3).length > 0 ? (
                                                                <Tooltip title={profile.allowedTools.slice(3).join(", ")}>
                                                                    <Chip label={`+ ${profile.allowedTools.slice(3).length}`} size="small" color="info" variant="outlined" />
                                                                </Tooltip>
                                                            ) : null}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            {profile.isShared ? <Done sx={{ width: 30, height: 30 }} /> : <Close sx={{ width: 30, height: 30 }} />}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            {profile.allowedSourceSchemas.map((source) => (
                                                                <Chip key={source} label={source} size="small" />
                                                            ))}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <ProfileForm profile={profile} me={me} />
                                                            <ButtonWithConfirmation label="Delete" msg={() => handleDeleteProfile(profile, updateModel)} />
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <CsvDownloader separator="&#9;" filename="profiles" extension=".tsv" datas={datas as Datas}>
                                <Button variant="outlined">Download CSV</Button>
                            </CsvDownloader>
                            <ProfileForm create={true} me={me} />
                        </Stack>
                    </Stack>
                );
            },
        },
        model.profiles,
    );

    return renderProfiles;
};

type ProfileEditionState = { modal: boolean; profileForm: Profile };

const enum Type {
    UserClickedModal,
    UserUpdatedField,
    UserUpdatedSourceAccessControl,
    UserClickedCheckAll,
}

const enum Mode {
    Creation,
    Edition,
}

export type Msg_ =
    | { type: Type.UserClickedModal; payload: { modal: boolean; profileForm?: Profile } }
    | { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string | string[] | boolean } }
    | { type: Type.UserUpdatedSourceAccessControl; payload: { treeStr: string; newValue: SourceAccessControl | null } }
    | { type: Type.UserClickedCheckAll; payload: { fieldname: string; value: boolean } };

const updateProfile = (profileEditionState: ProfileEditionState, msg: Msg_): ProfileEditionState => {
    const fieldToUpdate = msg.type === Type.UserClickedCheckAll || msg.type === Type.UserUpdatedField ? msg.payload.fieldname : "";

    switch (msg.type) {
        case Type.UserClickedModal:
            if (msg.payload.profileForm) {
                return { ...profileEditionState, modal: msg.payload.modal, profileForm: msg.payload.profileForm };
            } else {
                return { ...profileEditionState, modal: msg.payload.modal };
            }
        case Type.UserUpdatedField:
            return { ...profileEditionState, profileForm: { ...profileEditionState.profileForm, [fieldToUpdate]: msg.payload.newValue } };

        case Type.UserUpdatedSourceAccessControl: {
            const { treeStr, newValue } = msg.payload;
            let newSourcesAccessControls: Record<string, SourceAccessControl>;
            const previousSourcesAccessControl = profileEditionState.profileForm.sourcesAccessControl;

            if (newValue === null) {
                const { [treeStr]: value, ...otherSource } = previousSourcesAccessControl;
                newSourcesAccessControls = otherSource;
            } else {
                newSourcesAccessControls = {
                    ...profileEditionState.profileForm.sourcesAccessControl,
                    [msg.payload.treeStr]: newValue,
                };
            }

            return {
                ...profileEditionState,
                profileForm: {
                    ...profileEditionState.profileForm,
                    sourcesAccessControl: newSourcesAccessControls,
                },
            };
        }
        case Type.UserClickedCheckAll:
            return { ...profileEditionState, profileForm: { ...profileEditionState.profileForm, [fieldToUpdate]: msg.payload.value ? "ALL" : [] } };
    }
};

type ProfileFormProps = {
    me: string;
    profile?: Profile;
    create?: boolean;
};

const ProfileForm = ({ profile = defaultProfile(ulid()), create = false, me = "" }: ProfileFormProps) => {
    const [nodesClicked, setNodeToExpand] = useState<Array<string>>([]);
    const [manualExpand, setManualExpand] = useState(false);
    const { model, updateModel } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources);
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles);
    const [issues, setIssues] = useState<ZodIssue[]>([]);
    const [filter, setFilter] = useState<string>("");
    const allDatabases = useDatabases();
    const sources = useMemo(() => {
        return unwrappedSources;
    }, [unwrappedSources]);

    const schemaTypes = [...new Set(sources.map((source) => source.schemaType))];

    const config = SRD.withDefault(
        {
            auth: "",
            tools_available: [],
            defaultGroups: [],
            theme: {
                defaultTheme: "",
                selector: false,
            },
        },
        model.config,
    );
    const [profileModel, update] = useReducer(updateProfile, { modal: false, profileForm: profile });

    const handleOpen = () => update({ type: Type.UserClickedModal, payload: { modal: true, profileForm: profile } });
    const handleClose = () => {
        setNodeToExpand([]);
        update({ type: Type.UserClickedModal, payload: { modal: false } });
    };
    const handleFieldUpdate = (fieldname: string) => (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement> | SelectChangeEvent<string[]>) => {
        if (fieldname === "isShared") {
            update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: (event.target as HTMLInputElement).checked } });
        } else {
            update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } });
        }
    };

    const sourceFilter = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setFilter(event.target.value);
        setManualExpand(false);
    };
    const handleManualExpand = (nodeIds: string[]) => {
        setNodeToExpand(nodeIds);
        setManualExpand(true);
    };
    const profilesSchema = create ? ProfileSchemaCreate : ProfileSchema;
    const zo = useZorm("form", profilesSchema, { setupListeners: false, customIssues: issues });
    const handleSourceAccessControlUpdate = (src: SourceTreeNode) => (event: SelectChangeEvent) => {
        const treeStr = src.treeStr;

        // Get the parent treeStr
        let bf = "";
        const parentList = treeStr
            .split("/")
            .map((branch) => {
                const prt = bf === "" ? branch : [bf, branch].join("/");
                bf = prt;
                return prt;
            })
            .slice(0, -1);

        const currentSac = profileModel.profileForm.sourcesAccessControl;

        // get the nearest parent who have a value

        const parentListWithValue = Object.entries(currentSac)
            .map(([branch, _val]) => branch)
            .filter((branch) => {
                if (parentList.includes(branch)) {
                    return branch;
                }
            });

        const nearestParentWithValue =
            parentListWithValue.length > 0
                ? Object.entries(currentSac)
                      .map(([branch, _val]) => branch)
                      .filter((branch) => {
                          if (parentList.includes(branch)) {
                              return branch;
                          }
                      })
                      .reduce((a, b) => {
                          return a.length >= b.length ? a : b;
                      })
                : "";

        // update current value if the nearest parent have a different value
        if (currentSac[nearestParentWithValue] === event.target.value) {
            update({ type: Type.UserUpdatedSourceAccessControl, payload: { treeStr: treeStr, newValue: null } });
        } else {
            update({ type: Type.UserUpdatedSourceAccessControl, payload: { treeStr: treeStr, newValue: event.target.value as SourceAccessControl } });
        }

        // reset all children
        src.children.forEach((srcNode: SourceTreeNode) => {
            update({ type: Type.UserUpdatedSourceAccessControl, payload: { treeStr: srcNode.treeStr, newValue: null as SourceAccessControl | null } });
        });
    };

    function validateProfileName(profileName: string) {
        const issues = createCustomIssues(ProfileSchema);

        if (unwrappedProfiles.reduce((acc, p) => (acc ||= p.name === profileName), false)) {
            issues.name(`Profile name ${profileName} is already in use`);
        }

        return {
            issues: issues.toArray(),
        };
    }
    const saveProfiles = () => {
        void saveProfile(profileModel.profileForm, create ? Mode.Creation : Mode.Edition, updateModel, update);
        const mode = create ? "create" : "edit";
        void writeLog(me, "ConfigEditor", mode, profileModel.profileForm.name);
    };

    const getAvailableThemes = () => {
        return Object.keys(window.Config.slsvColorThemes).sort((a, b) => a.localeCompare(b));
    };

    const fieldsFromSource = (source: ServerSource) => {
        let fields = [source.schemaType];

        if (source.group) {
            fields = fields.concat(source.group.split("/"));
        }

        return fields.concat(source.name);
    };

    const generateSourcesTree = (filter: string) => {
        const filteredFields = new Set();
        sources.forEach((source) => {
            fieldsFromSource(source)
                .filter((item) => item.toLowerCase().includes(filter.toLowerCase()))
                .forEach((field) => {
                    filteredFields.add(field);
                    filteredFields.add(source.schemaType);
                    source.group.split("/").forEach((gr) => filteredFields.add(gr));
                });
        });
        const sourcesTree: SourceTreeNode[] = [];
        let index = 0;
        sources.forEach((source) => {
            let currentTree = sourcesTree;
            const tree: string[] = [];
            fieldsFromSource(source)
                .filter((item) => filteredFields.has(item))
                .forEach((field) => {
                    tree.push(field);
                    let root = currentTree.find((key) => key.name == field);
                    if (root === undefined) {
                        root = {
                            name: field,
                            children: [],
                            index: index,
                            source: source,
                            treeStr: tree.join("/"),
                        };
                        currentTree.push(root);
                    }
                    index = index + 1;
                    currentTree = root.children;
                });
        });
        return sourcesTree;
    };

    const displayFormTree = (sourcesTree: SourceTreeNode[]) => {
        if (!sourcesTree) {
            return;
        }

        return sourcesTree.map((source: SourceTreeNode) => {
            const sourcesAccessControlList = Object.entries(profileModel.profileForm.sourcesAccessControl);
            const availableSourcesAccessControl = sourcesAccessControlList.map(([sac, _val]) => {
                return sac;
            });

            // get all accessControl that match the tree
            const matchingAccessControls: string[] = availableSourcesAccessControl
                .map((path) => {
                    if (source.treeStr === path || source.treeStr.startsWith(`${path}/`)) {
                        return path;
                    } else {
                        return null;
                    }
                })
                .filter((elem): elem is string => elem != null);

            let accessControlValue = null;
            if (matchingAccessControls.length > 0) {
                // Get the longest accesscontrol
                const matchingAccessControl = matchingAccessControls.reduce((a, b) => {
                    return a.length >= b.length ? a : b;
                });
                // Get the value of this accessControl
                accessControlValue = profileModel.profileForm.sourcesAccessControl[matchingAccessControl];
            }

            const value = accessControlValue ? accessControlValue : "forbidden";

            return (
                <CustomTreeItem
                    nodeId={source.treeStr}
                    key={source.index.toString()}
                    label={
                        <Grid container alignItems="center" spacing={2}>
                            <Grid item xs>
                                <p style={{ margin: 0 }}>{source.name}</p>
                            </Grid>
                            <Grid item xs="auto">
                                <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                    <InputLabel id="select-sources-access-control">Access Control</InputLabel>
                                    <Select
                                        labelId="select-sources-access-control"
                                        id="select-sources-access-control-select"
                                        value={value}
                                        label="AccessControl"
                                        onChange={handleSourceAccessControlUpdate(source)}
                                    >
                                        <MenuItem value="forbidden">Forbidden</MenuItem>
                                        <MenuItem value="read">Read</MenuItem>
                                        <MenuItem value="readwrite">Read & Write</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    }
                >
                    {displayFormTree(source.children)}
                </CustomTreeItem>
            );
        });
    };

    const getAllNodeIds = (sources: JSX.Element[]) => {
        const nodeIds: string[] = [];
        sources.forEach((item: JSX.Element) => {
            const iProps = item.props as TreeItemProps;
            nodeIds.push(iProps.nodeId);
            if (iProps.children) {
                nodeIds.push(...getAllNodeIds(iProps.children as JSX.Element[]));
            }
        });
        return nodeIds;
    };

    function SourcesTreeView({ filter }: { filter: string }) {
        const treeviewSources = displayFormTree(generateSourcesTree(filter));
        let expanded = Array.from(nodesClicked);
        if (filter && treeviewSources && !manualExpand) {
            expanded = getAllNodeIds(treeviewSources);
        }
        return (
            <TreeView
                aria-label="Sources access control navigator"
                id="sources-access-treeview"
                defaultExpanded={expanded}
                onNodeToggle={(_event, nodeIds) => {
                    handleManualExpand(nodeIds);
                }}
                defaultCollapseIcon={<ExpandMore sx={{ width: 30, height: 30 }} />}
                defaultExpandIcon={<ChevronRight sx={{ width: 30, height: 30 }} />}
            >
                {treeviewSources}
            </TreeView>
        );
    }

    return (
        <>
            {create ? (
                <Button variant="contained" color="primary" onClick={handleOpen}>
                    Create Profile
                </Button>
            ) : (
                <IconButton aria-label="edit" color="primary" onClick={handleOpen} size="small" title="Edit">
                    <Edit />
                </IconButton>
            )}
            <Modal onClose={handleClose} open={profileModel.modal}>
                <Box
                    component="form"
                    ref={zo.ref}
                    onSubmit={(e) => {
                        const validation = zo.validate();
                        if (!validation.success) {
                            e.preventDefault();
                            console.error("error", e);
                            return;
                        }
                        e.preventDefault();
                        saveProfiles();
                    }}
                    sx={style}
                    style={{ maxHeight: "100%", overflow: "auto" }}
                >
                    <Stack spacing={4}>
                        <TextField
                            name={zo.fields.name()}
                            helperText={errorMessage(zo.errors.name)}
                            fullWidth
                            onChange={handleFieldUpdate("name")}
                            onBlur={() => {
                                zo.validate();
                                const isUniq = validateProfileName(profileModel.profileForm.name);
                                setIssues(isUniq.issues);
                            }}
                            value={profileModel.profileForm.name}
                            id={`name`}
                            label={"Name"}
                            variant="standard"
                            disabled={!create}
                        />
                        <FormControl>
                            <InputLabel id="allowedSourceSchemas-label">Allowed Source Schemas</InputLabel>
                            <Select
                                labelId="allowedSourceSchemas-label"
                                id="allowedSourceSchemas"
                                multiple
                                value={profileModel.profileForm.allowedSourceSchemas}
                                label="select-groups-label"
                                fullWidth
                                renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                onChange={handleFieldUpdate("allowedSourceSchemas")}
                            >
                                {schemaTypes.map((schemaType, i) => (
                                    <MenuItem key={schemaType} value={schemaType}>
                                        <Checkbox
                                            id={zo.fields.allowedSourceSchemas(i)("id")}
                                            name={zo.fields.allowedSourceSchemas(i)("name")}
                                            checked={profileModel.profileForm.allowedSourceSchemas.indexOf(schemaType) > -1}
                                        />
                                        {schemaType}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Box style={{ height: "300px", overflow: "auto" }}>
                            <FormControl>
                                <FormLabel id="default-source-access-control-label">Default source access control</FormLabel>
                                <TextField id="filter" label="Filter" onChange={sourceFilter} value={filter} variant="standard" />
                                <SourcesTreeView filter={filter} />
                            </FormControl>
                        </Box>
                        <FormControl>
                            <InputLabel id="allowedTools-label">Allowed tools</InputLabel>
                            <Select
                                labelId="allowedTools-label"
                                id="allowedTools"
                                multiple
                                value={profileModel.profileForm.allowedTools}
                                label="select-allowedTools-label"
                                renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                onChange={handleFieldUpdate("allowedTools")}
                            >
                                {config.tools_available.map((tool) => (
                                    <MenuItem key={tool} value={tool}>
                                        <Checkbox checked={profileModel.profileForm.allowedTools.includes(tool)} />
                                        {tool}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl>
                            <InputLabel id="allowedDatabases-label">Allowed databases</InputLabel>
                            <Select
                                labelId="allowedDatabases-label"
                                id="allowedDatabases"
                                multiple
                                value={profileModel.profileForm.allowedDatabases}
                                label="select-allowedDatabases-label"
                                renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                onChange={handleFieldUpdate("allowedDatabases")}
                            >
                                {allDatabases.map((database) => (
                                    <MenuItem key={database.id} value={database.id}>
                                        <Checkbox checked={profileModel.profileForm.allowedDatabases.includes(database.id)} />
                                        {database.database}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl>
                            <FormControlLabel control={<Checkbox checked={profileModel.profileForm.isShared} onChange={handleFieldUpdate("isShared")} />} label={"shared Users"} />
                        </FormControl>
                        <TextField defaultValue={profileModel.profileForm.theme ?? config.theme.defaultTheme} fullWidth id="theme" label="Theme" onChange={handleFieldUpdate("theme")} select>
                            {getAvailableThemes().map((theme) => (
                                <MenuItem key={theme} value={theme}>
                                    {theme}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button disabled={zo.validation?.success === false || zo.customIssues.length > 0} type="submit" variant="contained" color="primary">
                            Save Profile
                        </Button>
                    </Stack>
                </Box>
            </Modal>
        </>
    );
};

const CustomContent = forwardRef(function CustomContent(props: TreeItemContentProps, ref) {
    const { classes, className, label, nodeId, icon: iconProp, expansionIcon, displayIcon } = props;

    const { disabled, expanded, selected, focused, handleExpansion, handleSelection, preventSelection } = useTreeItem(nodeId);

    const icon = iconProp || expansionIcon || displayIcon;

    const handleMouseDown: MouseEventHandler<HTMLDivElement> = (event) => {
        preventSelection(event);
    };

    const handleExpansionClick: MouseEventHandler<HTMLDivElement> = (event) => {
        handleExpansion(event);
    };

    const handleSelectionClick: MouseEventHandler<HTMLDivElement> = (event) => {
        handleSelection(event);
    };

    return (
        <div
            className={clsx(className, classes.root, {
                [classes.expanded]: expanded,
                [classes.selected]: selected,
                [classes.focused]: focused,
                [classes.disabled]: disabled,
            })}
            onMouseDown={handleMouseDown}
            ref={ref as Ref<HTMLDivElement>}
        >
            <CustomExpansionArrow onClick={handleExpansionClick} className={classes.iconContainer}>
                {icon}
            </CustomExpansionArrow>
            <Typography onClick={handleSelectionClick} component="div" className={classes.label}>
                {label}
            </Typography>
        </div>
    );
});

const expansionArrowStyles = {
    "&:hover": { backgroundColor: "#E4F2FF !important" },
    padding: "1em",
};

const CustomExpansionArrow = styled("div")(expansionArrowStyles);
function CustomTreeItem(props: TreeItemProps) {
    return <TreeItem ContentComponent={CustomContent} {...props} />;
}

interface SourceTreeNode {
    name: string;
    children: SourceTreeNode[];
    index: number;
    source: ServerSource;
    treeStr: string;
}

export { ProfilesTable, Mode, Type };

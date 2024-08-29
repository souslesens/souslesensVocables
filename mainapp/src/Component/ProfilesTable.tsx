/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as Mui from "@mui/material";
import * as MuiColors from "@mui/material/colors";
import * as MuiIcons from "@mui/icons-material";
import * as MuiStyles from "@mui/material/styles";
import * as React from "react";
import * as z from "zod";

import { TreeView, TreeItem, TreeItemProps, treeItemClasses, TreeItemContentProps, useTreeItem } from "@mui/x-tree-view";

import clsx from "clsx";
import CsvDownloader from "react-csv-downloader";
import { useZorm, createCustomIssues } from "react-zorm";
import { ZodIssue } from "zod";

import { useModel } from "../Admin";
import { SRD } from "srd";
import { defaultProfile, saveProfile, Profile, deleteProfile, SourceAccessControl, ProfileSchema, ProfileSchemaCreate } from "../Profile";
import { ServerSource } from "../Source";
import { writeLog } from "../Log";
import { identity, style, joinWhenArray, cleanUpText } from "../Utils";
import { ulid } from "ulid";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { errorMessage } from "./errorMessage";

const ProfilesTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = React.useState("");
    const [orderBy, setOrderBy] = React.useState<keyof Profile>("name");
    const [order, setOrder] = React.useState<Order>("asc");

    const me = SRD.withDefault("", model.me);

    type Order = "asc" | "desc";

    function handleRequestSort(property: keyof Profile) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const handleDeleteProfile = async (profile: Profile, updateModel) => {
        deleteProfile(profile, updateModel);
        writeLog(me, "ConfigEditor", "delete", profile.name);
    };

    const renderProfiles = SRD.match(
        {
            // eslint-disable-next-line react/no-unescaped-entities
            notAsked: () => <p>Let’s fetch some data!</p>,
            loading: () => (
                <Mui.Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <Mui.CircularProgress />
                </Mui.Box>
            ),
            failure: (msg: string) => (
                <Mui.Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    ,<p>{`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}</p>
                </Mui.Box>
            ),
            success: (gotProfiles: Profile[]) => {
                const datas = gotProfiles.map((profile) => {
                    const { allowedSourceSchemas, forbiddenTools, allowedTools, sourcesAccessControl, ...restOfProperties } = profile;
                    const processedData = {
                        ...restOfProperties,
                        forbiddenTools: joinWhenArray(forbiddenTools),
                        allowedTools: joinWhenArray(allowedTools),
                        allowedSourceSchemas: allowedSourceSchemas.join(";"),
                        sourcesAccessControl: JSON.stringify(sourcesAccessControl),
                    };
                    const dataWithoutCarriageReturns = Object.fromEntries(
                        Object.entries(processedData).map(([key, value]) => {
                            if (typeof value === "string") {
                                return [key, value.replace("\n", " ")];
                            }
                            return [key, value];
                        })
                    );
                    return { ...dataWithoutCarriageReturns };
                });
                const sortedProfiles: Profile[] = gotProfiles.slice().sort((a: Profile, b: Profile) => {
                    let left = "";
                    let right = "";

                    if (a[orderBy] instanceof Array) {
                        left = a[orderBy].toString();
                        right = b[orderBy].toString();
                    } else {
                        left = a[orderBy] as string;
                        right = b[orderBy] as string;
                    }

                    return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                });
                return (
                    <Mui.Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <Mui.TextField
                            label="Search Profiles by name"
                            id="filter profiles"
                            onChange={(event) => {
                                setFilteringChars(event.target.value);
                            }}
                        />
                        <Mui.TableContainer sx={{ height: "400px" }} component={Mui.Paper}>
                            <Mui.Table stickyHeader>
                                <Mui.TableHead>
                                    <Mui.TableRow>
                                        <Mui.TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <Mui.TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>
                                                Name
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                            <Mui.TableSortLabel active={orderBy === "allowedSourceSchemas"} direction={order} onClick={() => handleRequestSort("allowedSourceSchemas")}>
                                                Allowed Sources
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Actions
                                        </Mui.TableCell>
                                    </Mui.TableRow>
                                </Mui.TableHead>
                                <Mui.TableBody sx={{ width: "100%", overflow: "visible" }}>
                                    {sortedProfiles
                                        .filter((profile) => cleanUpText(profile.name).includes(cleanUpText(filteringChars)))
                                        .map((profile) => {
                                            return (
                                                <Mui.TableRow key={profile.id}>
                                                    <Mui.TableCell>{profile.name}</Mui.TableCell>
                                                    <Mui.TableCell align="center">
                                                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            {profile.allowedSourceSchemas.map((source) => (
                                                                <Mui.Chip label={source} size="small" />
                                                            ))}
                                                        </Mui.Stack>
                                                    </Mui.TableCell>
                                                    <Mui.TableCell align="center">
                                                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <ProfileForm profile={profile} me={me} />
                                                            <ButtonWithConfirmation label="Delete" msg={() => handleDeleteProfile(profile, updateModel)} />
                                                        </Mui.Stack>
                                                    </Mui.TableCell>
                                                </Mui.TableRow>
                                            );
                                        })}
                                </Mui.TableBody>
                            </Mui.Table>
                        </Mui.TableContainer>
                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <CsvDownloader separator="&#9;" filename="profiles" extension=".tsv" datas={datas as Datas}>
                                <Mui.Button variant="outlined">Download CSV</Mui.Button>
                            </CsvDownloader>
                            <ProfileForm create={true} me={me} />
                        </Mui.Stack>
                    </Mui.Stack>
                );
            },
        },
        model.profiles
    );

    return renderProfiles;
};

type ProfileEditionState = { modal: boolean; profileForm: Profile };

const enum Type {
    UserClickedModal,
    UserUpdatedField,
    UserUpdatedSourceAccessControl,
    ResetProfile,
    UserClickedCheckAll,
}

const enum Mode {
    Creation,
    Edition,
}

type Msg_ =
    | { type: Type.UserClickedModal; payload: boolean }
    | { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string } }
    | { type: Type.UserUpdatedSourceAccessControl; payload: { treeStr: string; newValue: SourceAccessControl | null } }
    | { type: Type.ResetProfile; payload: Profile }
    | { type: Type.UserClickedCheckAll; payload: { fieldname: string; value: boolean } };

const updateProfile = (profileEditionState: ProfileEditionState, msg: Msg_): ProfileEditionState => {
    const fieldToUpdate: any = msg.type === Type.UserClickedCheckAll || msg.type === Type.UserUpdatedField ? msg.payload.fieldname : null;
    switch (msg.type) {
        case Type.UserClickedModal:
            return { ...profileEditionState, modal: msg.payload };

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

        case Type.ResetProfile:
            return { ...profileEditionState, profileForm: msg.payload };
    }
};

type ProfileFormProps = {
    me: string;
    profile?: Profile;
    create?: boolean;
};

const ProfileForm = ({ profile = defaultProfile(ulid()), create = false, me = "" }: ProfileFormProps) => {
    const [nodesClicked, setNodeToExpand] = React.useState<Array<string>>([]);
    const { model, updateModel } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources);
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles);
    const [issues, setIssues] = React.useState<ZodIssue[]>([]);
    const sources = React.useMemo(() => {
        return unwrappedSources;
    }, [unwrappedSources]);

    const schemaTypes = [...new Set(sources.map((source) => source.schemaType))];

    const config = SRD.withDefault({ auth: "", tools_available: [] }, model.config);
    const [profileModel, update] = React.useReducer(updateProfile, { modal: false, profileForm: profile });

    // tools is all available tools (described in mainconfig.json) + tools that are found in forbiddenTools + ALL
    const tools: string[] = ["ALL", ...profileModel.profileForm.forbiddenTools, ...config.tools_available].filter((val, idx, array) => {
        return array.indexOf(val) === idx;
    });

    React.useEffect(() => {
        update({ type: Type.ResetProfile, payload: profile });
    }, [profileModel.modal]);
    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true });
    const handleClose = () => {
        setNodeToExpand([]);
        update({ type: Type.UserClickedModal, payload: false });
    };
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
        update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } });

    const profilesSchema = create ? ProfileSchemaCreate : ProfileSchema;
    const zo = useZorm("form", profilesSchema, { setupListeners: false, customIssues: issues });
    const handleSourceAccessControlUpdate = (src: SourceTreeNode) => (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleCheckedAll = (fieldname: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
        update({ type: Type.UserClickedCheckAll, payload: { fieldname: fieldname, value: event.target.checked } });

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
        writeLog(me, "ConfigEditor", mode, profileModel.profileForm.name);
    };

    const getAvailableThemes = () => {
        return Object.keys(Config.slsvColorThemes).sort((a, b) => a.localeCompare(b));
    };

    const fieldsFromSource = (source: ServerSource) => {
        let fields = [source.schemaType];

        if (source.group) {
            fields = fields.concat(source.group.split("/"));
        }

        return fields.concat(source.name);
    };

    const generateSourcesTree = () => {
        const sourcesTree: SourceTreeNode[] = [];

        let index = 0;
        sources.forEach((source) => {
            let currentTree = sourcesTree;
            const tree: string[] = [];
            fieldsFromSource(source).forEach((field) => {
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
                        <Mui.Grid container alignItems="center" spacing={2}>
                            <Mui.Grid item xs>
                                <p style={{ margin: 0 }}>{source.name}</p>
                            </Mui.Grid>
                            <Mui.Grid item xs="auto">
                                <Mui.FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                    <Mui.InputLabel id="select-sources-access-control">Access Control</Mui.InputLabel>
                                    <Mui.Select
                                        labelId="select-sources-access-control"
                                        id="select-sources-access-control-select"
                                        value={value}
                                        label="AccessControl"
                                        onChange={handleSourceAccessControlUpdate(source)}
                                    >
                                        <Mui.MenuItem value="forbidden">Forbidden</Mui.MenuItem>
                                        <Mui.MenuItem value="read">Read</Mui.MenuItem>
                                        <Mui.MenuItem value="readwrite">Read & Write</Mui.MenuItem>
                                    </Mui.Select>
                                </Mui.FormControl>
                            </Mui.Grid>
                        </Mui.Grid>
                    }
                >
                    {displayFormTree(source.children)}
                </CustomTreeItem>
            );
        });
    };

    function SourcesTreeView() {
        const treeviewSources = displayFormTree(generateSourcesTree());
        return (
            <TreeView
                aria-label="Sources access control navigator"
                id="sources-access-treeview"
                defaultExpanded={Array.from(nodesClicked)}
                onNodeToggle={(_event, nodeIds) => {
                    setNodeToExpand(nodeIds);
                }}
                defaultCollapseIcon={<MuiIcons.ExpandMore sx={{ width: 30, height: 30 }} />}
                defaultExpandIcon={<MuiIcons.ChevronRight sx={{ width: 30, height: 30 }} />}
            >
                {treeviewSources}
            </TreeView>
        );
    }

    return (
        <>
            <Mui.Button variant="contained" color="primary" onClick={handleOpen}>
                {create ? "Create Profile" : "Edit"}
            </Mui.Button>
            <Mui.Modal onClose={handleClose} open={profileModel.modal}>
                <Mui.Box
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
                    <Mui.Stack spacing={4}>
                        <Mui.TextField
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
                        <Mui.FormControl>
                            <Mui.InputLabel id="allowedSourceSchemas-label">Allowed Source Schemas</Mui.InputLabel>
                            <Mui.Select
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
                                    <Mui.MenuItem key={schemaType} value={schemaType}>
                                        <Mui.Checkbox
                                            id={zo.fields.allowedSourceSchemas(i)("id")}
                                            name={zo.fields.allowedSourceSchemas(i)("name")}
                                            checked={profileModel.profileForm.allowedSourceSchemas.indexOf(schemaType) > -1}
                                        />
                                        {schemaType}
                                    </Mui.MenuItem>
                                ))}
                            </Mui.Select>
                        </Mui.FormControl>
                        <Mui.Box style={{ maxHeight: "300px", overflow: "auto" }}>
                            <Mui.FormControl>
                                <Mui.FormLabel id="default-source-access-control-label">Default source access control</Mui.FormLabel>
                                <SourcesTreeView />
                            </Mui.FormControl>
                        </Mui.Box>
                        <Mui.FormGroup>
                            <Mui.FormControlLabel
                                control={<Mui.Checkbox onChange={handleCheckedAll("allowedTools")} checked={profileModel.profileForm.allowedTools === "ALL"} />}
                                label="Allow all tools"
                            />

                            <Mui.FormControl style={{ display: profileModel.profileForm.allowedTools === "ALL" ? "none" : "" }} disabled={profileModel.profileForm.allowedTools === "ALL"}>
                                <Mui.InputLabel id="allowedTools-label">Allowed tools</Mui.InputLabel>
                                <Mui.Select
                                    labelId="allowedTools-label"
                                    id="allowedTools"
                                    multiple
                                    value={!Array.isArray(profileModel.profileForm.allowedTools) ? [] : profileModel.profileForm.allowedTools}
                                    label="select-allowedTools-label"
                                    renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                    onChange={handleFieldUpdate("allowedTools")}
                                >
                                    {tools.map((tool) => (
                                        <Mui.MenuItem key={tool} value={tool}>
                                            {tool}
                                        </Mui.MenuItem>
                                    ))}
                                </Mui.Select>
                            </Mui.FormControl>
                        </Mui.FormGroup>
                        <Mui.FormControl>
                            <Mui.InputLabel id="forbiddenTools-label">Forbidden tools</Mui.InputLabel>
                            <Mui.Select
                                labelId="forbiddenTools-label"
                                id="forbiddenTools"
                                multiple
                                value={!Array.isArray(profileModel.profileForm.forbiddenTools) ? [] : profileModel.profileForm.forbiddenTools}
                                label="select-forbiddenTools-label"
                                fullWidth
                                renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                onChange={handleFieldUpdate("forbiddenTools")}
                            >
                                {tools.map((tool) => (
                                    <Mui.MenuItem key={tool} value={tool}>
                                        <Mui.Checkbox checked={profileModel.profileForm.forbiddenTools.indexOf(tool) > -1} />
                                        {tool}
                                    </Mui.MenuItem>
                                ))}
                            </Mui.Select>
                        </Mui.FormControl>
                        <Mui.TextField
                            defaultValue={profileModel.profileForm.theme ?? model.config.data.theme.defaultTheme}
                            fullWidth
                            id="theme"
                            label="Theme"
                            onChange={handleFieldUpdate("theme")}
                            select
                        >
                            {getAvailableThemes().map((theme) => (
                                <Mui.MenuItem value={theme}>{theme}</Mui.MenuItem>
                            ))}
                        </Mui.TextField>
                        <Mui.Button disabled={zo.validation?.success === false || zo.customIssues.length > 0} type="submit" variant="contained" color="primary">
                            Save Profile
                        </Mui.Button>
                    </Mui.Stack>
                </Mui.Box>
            </Mui.Modal>
        </>
    );
};

const CustomContent = React.forwardRef(function CustomContent(props: TreeItemContentProps, ref) {
    const { classes, className, label, nodeId, icon: iconProp, expansionIcon, displayIcon } = props;

    const { disabled, expanded, selected, focused, handleExpansion, handleSelection, preventSelection } = useTreeItem(nodeId);

    const icon = iconProp || expansionIcon || displayIcon;

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        preventSelection(event);
    };

    const handleExpansionClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        handleExpansion(event);
    };

    const handleSelectionClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
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
            ref={ref as React.Ref<HTMLDivElement>}
        >
            <CustomExpansionArrow onClick={handleExpansionClick} className={classes.iconContainer}>
                {icon}
            </CustomExpansionArrow>
            <Mui.Typography onClick={handleSelectionClick} component="div" className={classes.label}>
                {label}
            </Mui.Typography>
        </div>
    );
});

const expansionArrowStyles = {
    "&:hover": { backgroundColor: "#E4F2FF !important" },
    padding: "1em",
};

const CustomExpansionArrow = MuiStyles.styled("div")(expansionArrowStyles);
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

export { ProfilesTable, Mode, Msg_, Type };

import {
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    InputLabel,
    FormLabel,
    MenuItem,
    Modal,
    Select,
    TextField,
    Box,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    Paper,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    RadioGroup,
    Radio,
} from "@mui/material";
import { useModel } from "../Admin";
import * as React from "react";
import { SRD } from "srd";
import { defaultProfile, saveProfile, Profile, deleteProfile, SourceAccessControl } from "../Profile";
import { identity, style, joinWhenArray } from "../Utils";
import { ulid } from "ulid";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import Autocomplete from "@mui/material/Autocomplete";
import CsvDownloader from "react-csv-downloader";

const ProfilesTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = React.useState("");
    const renderProfiles = SRD.match(
        {
            // eslint-disable-next-line react/no-unescaped-entities
            notAsked: () => <p>Let's fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    ,<p>{`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}</p>
                </Box>
            ),
            success: (gotProfiles: Profile[]) => {
                const datas = gotProfiles.map((profile) => {
                    const { allowedSourceSchemas, forbiddenTools, allowedTools, sourcesAccessControl, blender, ...restOfProperties } = profile;
                    const processedData = {
                        ...restOfProperties,
                        forbiddenTools: joinWhenArray(forbiddenTools),
                        allowedTools: joinWhenArray(allowedTools),
                        allowedSourceSchemas: allowedSourceSchemas.join(";"),
                        sourcesAccessControl: JSON.stringify(sourcesAccessControl),
                    };
                    return { ...processedData };
                });
                return (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <Stack>
                            <CsvDownloader filename="profiles.csv" datas={datas} />
                            <Autocomplete
                                disablePortal
                                id="filter profiles"
                                options={gotProfiles.map((profile) => profile.name)}
                                sx={{ width: 300 }}
                                onInputChange={(event, newInputValue) => {
                                    setFilteringChars(newInputValue);
                                }}
                                renderInput={(params) => <TextField {...params} label="Search Profiles by name" />}
                            />
                            <Box sx={{ justifyContent: "center", display: "flex" }}>
                                <TableContainer sx={{ height: "400px" }} component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell style={{ fontWeight: "bold" }}>Name</TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>Allowed Sources</TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                            {gotProfiles
                                                .filter((profile) => profile.name.includes(filteringChars))
                                                .map((profile) => {
                                                    return (
                                                        <TableRow key={profile.id}>
                                                            <TableCell>{profile.name}</TableCell>
                                                            <TableCell>{profile.allowedSourceSchemas.join(", ")}</TableCell>
                                                            <TableCell>
                                                                <ProfileForm profile={profile} />
                                                                <ButtonWithConfirmation label="Delete" msg={() => deleteProfile(profile, updateModel)} />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                                <ProfileForm create={true} />
                            </Box>
                        </Stack>
                    </Box>
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
    UserUpdatedBlenderLevel,
}

const enum Mode {
    Creation,
    Edition,
}

type Msg_ =
    | { type: Type.UserClickedModal; payload: boolean }
    | { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string } }
    | { type: Type.UserUpdatedSourceAccessControl; payload: { sourceId: string; newValue: SourceAccessControl | "default" } }
    | { type: Type.ResetProfile; payload: Profile }
    | { type: Type.UserClickedCheckAll; payload: { fieldname: string; value: boolean } }
    | { type: Type.UserUpdatedBlenderLevel; payload: number };

const updateProfile = (profileEditionState: ProfileEditionState, msg: Msg_): ProfileEditionState => {
    const fieldToUpdate: any = msg.type === Type.UserClickedCheckAll || msg.type === Type.UserUpdatedField ? msg.payload.fieldname : null;
    switch (msg.type) {
        case Type.UserClickedModal:
            return { ...profileEditionState, modal: msg.payload };

        case Type.UserUpdatedField:
            return { ...profileEditionState, profileForm: { ...profileEditionState.profileForm, [fieldToUpdate]: msg.payload.newValue } };

        case Type.UserUpdatedSourceAccessControl: {
            const { sourceId, newValue } = msg.payload;
            const previousSourcesAccessControl = profileEditionState.profileForm.sourcesAccessControl;
            let newSourcesAccessControls: Record<string, SourceAccessControl>;

            if (newValue === "default") {
                const { [sourceId]: value, ...otherSource } = previousSourcesAccessControl;
                newSourcesAccessControls = otherSource;
            } else {
                newSourcesAccessControls = {
                    ...profileEditionState.profileForm.sourcesAccessControl,
                    [msg.payload.sourceId]: newValue,
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

        case Type.UserUpdatedBlenderLevel:
            return { ...profileEditionState, profileForm: { ...profileEditionState.profileForm, blender: { contextMenuActionStartLevel: msg.payload } } };

        case Type.ResetProfile:
            return { ...profileEditionState, profileForm: msg.payload };
    }
};

type ProfileFormProps = {
    profile?: Profile;
    create?: boolean;
};

const ProfileForm = ({ profile = defaultProfile(ulid()), create = false }: ProfileFormProps) => {
    const { model, updateModel } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources);
    const sources = React.useMemo(() => {
        return unwrappedSources.sort((a, b) => a.name.localeCompare(b.name));
    }, [unwrappedSources]);
    const schemaTypes = [...new Set(sources.map((source) => source.schemaType))];
    const tools: string[] = ["ALL", "sourceBrowser", "sourceMatcher", "evaluate", "ancestors", "lineage", "SPARQL", "ADLmappings", "ADLbrowser", "Standardizer", "SQLquery"];
    const [profileModel, update] = React.useReducer(updateProfile, { modal: false, profileForm: profile });
    React.useEffect(() => {
        update({ type: Type.ResetProfile, payload: profile });
    }, [profileModel.modal]);
    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true });
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false });
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
        update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } });

    const handleSourceAccessControlUpdate = React.useMemo(() => {
        return Object.fromEntries(
            sources.map((source) => [
                source.id,
                (event: React.ChangeEvent<HTMLInputElement>) =>
                    update({ type: Type.UserUpdatedSourceAccessControl, payload: { sourceId: source.id, newValue: event.target.value as SourceAccessControl | "default" } }),
            ])
        );
    }, [sources]);

    const handleCheckedAll = (fieldname: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
        update({ type: Type.UserClickedCheckAll, payload: { fieldname: fieldname, value: event.target.checked } });
    const handleNewBlenderNumber = (event: React.ChangeEvent<HTMLInputElement>) => update({ type: Type.UserUpdatedBlenderLevel, payload: parseInt(event.target.value.replace(/\D/g, "")) });

    const saveProfiles = () => {
        // const updateProfiles = unwrappedProfiles.map(p => p.name === profile.name ? profileModel.profileForm : p)
        // const addProfile = [...unwrappedProfiles, profileModel.profileForm]
        // updateModel({ type: 'UserClickedSaveChanges', payload: {} });
        // putProfiles(create ? addProfile : updateProfiles)
        //     .then((person) => updateModel({ type: 'ServerRespondedWithProfiles', payload: success(person) }))
        //     .then(() => update({ type: Type.UserClickedModal, payload: false }))
        //     .then(() => update({ type: Type.ResetProfile, payload: create ? Mode.Creation : Mode.Edition }))
        //     .catch((err) => updateModel({ type: 'ServerRespondedWithProfiles', payload: failure(err.msg) }));
        void saveProfile(profileModel.profileForm, create ? Mode.Creation : Mode.Edition, updateModel, update);
    };

    return (
        <>
            <Button variant="contained" color="primary" onClick={handleOpen}>
                {create ? "Create Profile" : "Edit"}
            </Button>
            <Modal onClose={handleClose} open={profileModel.modal}>
                <Box component="form" sx={style}>
                    <Stack spacing={4}>
                        <TextField fullWidth onChange={handleFieldUpdate("name")} value={profileModel.profileForm.name} id={`name`} label={"Name"} variant="standard" />
                        <TextField
                            fullWidth
                            onChange={handleNewBlenderNumber}
                            value={profileModel.profileForm.blender.contextMenuActionStartLevel.toString()}
                            id={`blender`}
                            label={"Blender Level"}
                            variant="standard"
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
                                {schemaTypes.map((schemaType) => (
                                    <MenuItem key={schemaType} value={schemaType}>
                                        {schemaType}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl>
                            <FormLabel id="default-source-access-control-label">Default source access control</FormLabel>
                            <SourceAccessControlInput
                                name="default-source-access-control"
                                value={profileModel.profileForm.defaultSourceAccessControl}
                                onChange={handleFieldUpdate("defaultSourceAccessControl")}
                                allowDefault={false}
                            />
                        </FormControl>
                        <Box style={{ overflow: "auto", maxHeight: "10em" }}>
                            {sources.map((source) => (
                                <FormControl key={source.id}>
                                    <FormLabel id={source.id + "-source-access-control-label"}>{source.name}</FormLabel>
                                    <SourceAccessControlInput
                                        name={source.id + "-source-access-control"}
                                        value={profileModel.profileForm.sourcesAccessControl[source.id] ?? "default"}
                                        onChange={handleSourceAccessControlUpdate[source.id]}
                                        allowDefault={true}
                                    />
                                </FormControl>
                            ))}
                        </Box>
                        <FormGroup>
                            <FormControlLabel control={<Checkbox onChange={handleCheckedAll("allowedTools")} checked={profileModel.profileForm.allowedTools === "ALL"} />} label="Allow all tools" />

                            <FormControl style={{ display: profileModel.profileForm.allowedTools === "ALL" ? "none" : "" }} disabled={profileModel.profileForm.allowedTools === "ALL"}>
                                <InputLabel id="allowedTools-label">Allowed tools</InputLabel>
                                <Select
                                    labelId="allowedTools-label"
                                    id="allowedTools"
                                    multiple
                                    value={!Array.isArray(profileModel.profileForm.allowedTools) ? [] : profileModel.profileForm.allowedTools}
                                    label="select-allowedTools-label"
                                    renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                    onChange={handleFieldUpdate("allowedTools")}
                                >
                                    {tools.map((tool) => (
                                        <MenuItem key={tool} value={tool}>
                                            {tool}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </FormGroup>
                        <FormControl>
                            <InputLabel id="forbiddenTools-label">Forbidden tools</InputLabel>
                            <Select
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
                                    <MenuItem key={tool} value={tool}>
                                        {tool}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button variant="contained" color="primary" onClick={saveProfiles}>
                            Save Profile
                        </Button>
                    </Stack>
                </Box>
            </Modal>
        </>
    );
};

interface SourceAccessControlInputProps {
    name: string;
    value: SourceAccessControl | "default";
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    allowDefault: boolean;
}

const SourceAccessControlInput: React.FC<SourceAccessControlInputProps> = React.memo(function ({ name, value, onChange, allowDefault }) {
    return (
        <RadioGroup row aria-labelledby={name} value={value} onChange={onChange} name={name}>
            {allowDefault ? <FormControlLabel value="default" control={<Radio />} label="Defaults" /> : null}
            <FormControlLabel value="forbidden" control={<Radio />} label="Forbidden" />
            <FormControlLabel value="read" control={<Radio />} label="Read" />
            <FormControlLabel value="readwrite" control={<Radio />} label="Read & Write" />
        </RadioGroup>
    );
});

export { ProfilesTable, Mode, Msg_, Type };

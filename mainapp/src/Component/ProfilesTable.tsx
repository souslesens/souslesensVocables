import {
    Box, CircularProgress, ButtonGroup, Grid, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack
} from '@mui/material';
import { useModel } from '../Admin';
import { User } from '../User';
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { defaultProfile, Profile, putProfiles } from '../Profile';
import { Button, Checkbox, FormControl, FormControlLabel, FormGroup, InputLabel, MenuItem, Modal, Select, TextField, TextFieldProps } from '@material-ui/core';
import { identity, style } from '../Utils';
import { ulid } from 'ulid';
import { MAX_PAGE_SIZE } from '@mui/x-data-grid';
import { ButtonWithConfirmation } from './ButtonWithConfirmation';
import Autocomplete from '@mui/material/Autocomplete';

const ProfilesTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = React.useState("")

    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles)

    const deleteProfile = (profile: Profile) => {

        const updatedProfiles = unwrappedProfiles.filter(prevProfiles => prevProfiles.name !== profile.name);
        console.log("deleted")

        putProfiles(updatedProfiles)
            .then((profiles) => updateModel({ type: 'ServerRespondedWithProfiles', payload: success(profiles) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithProfiles', payload: failure(err.msg) }));

    }

    const renderProfiles =
        SRD.match({
            notAsked: () => <p>Let's fetch some data!</p>,
            loading: () =>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />

                </Box>,
            failure: (msg: string) =>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    ,<p>{`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}</p>

                </Box>,
            success: (gotProfiles: Profile[]) =>

                <Box
                    sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <Stack>
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
                        <Box sx={{ justifyContent: 'center', display: 'flex' }}>
                            <TableContainer sx={{ height: '400px' }} component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow >
                                            <TableCell style={{ fontWeight: 'bold' }}>Name</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>Allowed Sources</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody sx={{ width: '100%', overflow: 'visible' }}>{
                                        gotProfiles
                                            .filter((profile) => profile.name.includes(filteringChars))
                                            .map(profile => {
                                                return (<TableRow key={profile.name}>
                                                    <TableCell>
                                                        {profile.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {profile.allowedSourceSchemas.join(', ')
                                                        }
                                                    </TableCell>
                                                    <TableCell>

                                                        <ProfileForm profile={profile} />
                                                        <ButtonWithConfirmation label='Delete' msg={() => deleteProfile(profile)} />

                                                    </TableCell>

                                                </TableRow>);
                                            })}</TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <ProfileForm create={true} />

                        </Box>
                    </Stack >

                </Box >


        }, model.profiles)

    return (renderProfiles)
}

type ProfileEditionState = { modal: boolean, profileForm: Profile }

const initProfileEditionState: ProfileEditionState = { modal: false, profileForm: defaultProfile(ulid()), }

enum Type {
    UserClickedModal,
    UserUpdatedField,
    ResetProfile,
    UserClickedCheckAll,
    UserUpdatedBlenderLevel
}

enum Mode { Creation, Edition }

type Msg_ =
    { type: Type.UserClickedModal, payload: boolean }
    | { type: Type.UserUpdatedField, payload: { fieldname: string, newValue: string } }
    | { type: Type.ResetProfile, payload: Mode }
    | { type: Type.UserClickedCheckAll, payload: { fieldname: string, value: boolean } }
    | { type: Type.UserUpdatedBlenderLevel, payload: number }

const updateProfile = (profileEditionState: ProfileEditionState, msg: Msg_): ProfileEditionState => {
    console.log(Type[msg.type], msg.payload)
    const { model } = useModel();
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles)
    switch (msg.type) {
        case Type.UserClickedModal:
            return { ...profileEditionState, modal: msg.payload }

        case Type.UserUpdatedField:
            const fieldToUpdate = msg.payload.fieldname
            return { ...profileEditionState, profileForm: { ...profileEditionState.profileForm, [fieldToUpdate]: msg.payload.newValue } }


        case Type.UserClickedCheckAll:
            const _fieldToUpdate = msg.payload.fieldname
            return { ...profileEditionState, profileForm: { ...profileEditionState.profileForm, [_fieldToUpdate]: msg.payload.value ? "ALL" : [] } }

        case Type.UserUpdatedBlenderLevel:
            return { ...profileEditionState, profileForm: { ...profileEditionState.profileForm, ["blender"]: { contextMenuActionStartLevel: msg.payload } } }

        case Type.ResetProfile:
            switch (msg.payload) {
                case Mode.Creation:
                    console.log("resetSourceCreationMode")
                    return { ...profileEditionState, profileForm: defaultProfile(ulid()) }
                case Mode.Edition:
                    const getUnmodifiedProfiles = unwrappedProfiles.reduce((acc, value) => profileEditionState.profileForm.id === value.id ? value : acc, defaultProfile(ulid()))
                    const resetSourceForm = msg.payload ? profileEditionState.profileForm : getUnmodifiedProfiles

                    return { ...profileEditionState, profileForm: msg.payload ? profileEditionState.profileForm : resetSourceForm }
            }
    }

}

type ProfileFormProps = {
    profile?: Profile,
    create?: boolean
}

const ProfileForm = ({ profile = defaultProfile(ulid()), create = false }: ProfileFormProps) => {

    const { model, updateModel } = useModel()
    const unwrappedSources = SRD.unwrap([], identity, model.sources)
    const schemaTypes = [...new Set(unwrappedSources.map(source => source.schemaType))]
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles)
    const tools: string[] = ["ALL", "sourceBrowser", "sourceMatcher", "evaluate", "ancestors", "lineage", "SPARQL", "ADLmappings", "ADLbrowser", "Standardizer", "SQLquery"]
    const [profileModel, update] = React.useReducer(updateProfile, { modal: false, profileForm: profile })


    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true })
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false })

    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } })
    const handleCheckedAll = (fieldname: string) => (event: React.ChangeEvent<HTMLInputElement>) => update({ type: Type.UserClickedCheckAll, payload: { fieldname: fieldname, value: event.target.checked } })
    const handleNewBlenderNumber = (event: React.ChangeEvent<HTMLInputElement>) => update({ type: Type.UserUpdatedBlenderLevel, payload: parseInt(event.target.value.replace(/\D/g, "")) })

    const shouldDisplayMultiselect = () => Array.isArray(profileModel.profileForm.allowedTools)
    const saveProfiles = () => {

        const updateProfiles = unwrappedProfiles.map(p => p.name === profile.name ? profileModel.profileForm : p)
        const addProfile = [...unwrappedProfiles, profileModel.profileForm]
        updateModel({ type: 'UserClickedSaveChanges', payload: {} });
        putProfiles(create ? addProfile : updateProfiles)
            .then((person) => updateModel({ type: 'ServerRespondedWithProfiles', payload: success(person) }))
            .then(() => update({ type: Type.UserClickedModal, payload: false }))
            .then(() => update({ type: Type.ResetProfile, payload: create ? Mode.Creation : Mode.Edition }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithProfiles', payload: failure(err.msg) }));
    };





    return (<>
        <Button variant='contained' color='primary' onClick={handleOpen}>{create ? "Create Profile" : "Edit"}</Button>
        <Modal onClose={handleClose} open={profileModel.modal}>
            <Box component='form' sx={style}>
                <Stack spacing={4}>
                    <TextField fullWidth onChange={handleFieldUpdate("name")}

                        value={profileModel.profileForm.name}
                        id={`name`}
                        label={"Name"}
                        variant="standard" />
                    <TextField fullWidth onChange={handleNewBlenderNumber}

                        value={profileModel.profileForm.blender.contextMenuActionStartLevel.toString()}
                        id={`blender`}
                        label={"Blender Level"}
                        variant="standard" />
                    <FormControl>
                        <InputLabel id="allowedSourceSchemas-label">Allowed Source Schemas</InputLabel>
                        <Select
                            labelId="allowedSourceSchemas-label"
                            id="allowedSourceSchemas"
                            multiple
                            value={profileModel.profileForm.allowedSourceSchemas}
                            label="select-groups-label"
                            fullWidth
                            renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                            onChange={handleFieldUpdate("allowedSourceSchemas")}
                        >
                            {schemaTypes.map(schemaType => <MenuItem
                                key={schemaType}
                                value={schemaType}

                            >
                                {schemaType}
                            </MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormGroup>
                        <FormControlLabel control={<Checkbox onChange={handleCheckedAll("allowedSources")} checked={profileModel.profileForm.allowedSources === "ALL"} />} label="Allow all sources" />
                        <FormControl style={{ display: profileModel.profileForm.allowedSources === "ALL" ? 'none' : '' }} disabled={profileModel.profileForm.allowedSources === "ALL"} >

                            <InputLabel id="allowedSources-label">Allowed Sources</InputLabel>
                            <Select
                                labelId="allowedSources-label"
                                id="allowedSources"
                                multiple
                                value={!Array.isArray(profileModel.profileForm.allowedSources) ? [] : profileModel.profileForm.allowedSources}
                                label="select-allowedSources-label"
                                fullWidth
                                renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                                onChange={handleFieldUpdate("allowedSources")}
                            >
                                {unwrappedSources.map(source => <MenuItem
                                    key={source.name}
                                    value={source.name}

                                >
                                    {source.name}
                                </MenuItem>)}
                            </Select>


                        </FormControl>
                    </FormGroup>
                    <FormControl>
                        <InputLabel id="forbidenSources-label">Forbiden Sources</InputLabel>
                        <Select
                            labelId="forbidenSources-label"
                            id="forbidenSources"
                            multiple
                            value={profileModel.profileForm.forbiddenSources}
                            label="select-forbiddenSources-label"
                            fullWidth
                            renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                            onChange={handleFieldUpdate("forbiddenSources")}
                        >
                            {unwrappedSources.map(source => <MenuItem
                                key={source.name}
                                value={source.name}

                            >
                                {source.name}
                            </MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormGroup  >
                        <FormControlLabel control={<Checkbox onChange={handleCheckedAll("allowedTools")} checked={profileModel.profileForm.allowedTools === "ALL"} />} label="Allow all tools" />

                        <FormControl style={{ display: profileModel.profileForm.allowedTools === "ALL" ? 'none' : '' }} disabled={profileModel.profileForm.allowedTools === "ALL"} >
                            <InputLabel id="allowedTools-label">Allowed tools</InputLabel>
                            <Select
                                labelId="allowedTools-label"
                                id="allowedTools"
                                multiple
                                value={!Array.isArray(profileModel.profileForm.allowedTools) ? [] : profileModel.profileForm.allowedTools}
                                label="select-allowedTools-label"
                                renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                                onChange={handleFieldUpdate("allowedTools")}
                            >
                                {tools.map(tool => <MenuItem
                                    key={tool}
                                    value={tool}

                                >
                                    {tool}
                                </MenuItem>)}
                            </Select>
                        </FormControl></FormGroup>
                    <FormControl>
                        <InputLabel id="forbiddenTools-label">Forbidden tools</InputLabel>
                        <Select
                            labelId="forbiddenTools-label"
                            id="forbiddenTools"
                            multiple
                            value={!Array.isArray(profileModel.profileForm.forbiddenTools) ? [] : profileModel.profileForm.forbiddenTools}
                            label="select-forbiddenTools-label"
                            fullWidth
                            renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                            onChange={handleFieldUpdate("forbiddenTools")}
                        >
                            {tools.map(tool => <MenuItem
                                key={tool}
                                value={tool}

                            >
                                {tool}
                            </MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button variant="contained" color='primary' onClick={saveProfiles}>Save Profile</Button>

                </Stack>
            </Box>
        </Modal></>)
}

export default ProfilesTable
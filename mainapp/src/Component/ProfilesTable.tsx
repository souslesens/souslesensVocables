import {
    Box, CircularProgress, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack
} from '@mui/material';
import { useModel } from '../Admin';
import { User } from '../User';
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { defaultProfile, Profile, putProfiles } from '../Profile';
import { Button, FormControl, InputLabel, MenuItem, Modal, Select, TextField } from '@material-ui/core';
import { identity, style } from '../Utils';
import { ulid } from 'ulid';

const ProfilesTable = () => {
    const { model, updateModel } = useModel();
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
            success: (gotUsers: Profile[]) =>

                <Box
                    sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <Stack>
                        <Box sx={{ justifyContent: 'center', display: 'flex' }}>
                            <TableContainer component={Paper}>
                                <Table sx={{ width: '100%' }}>
                                    <TableHead>
                                        <TableRow >
                                            <TableCell style={{ fontWeight: 'bold' }}>Name</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>Allowed Sources</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>{gotUsers.map(profile => {
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
                                                <Button color="secondary" onClick={() => deleteProfile(profile)}>Delete</Button>
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
    ResetProfile
}

enum Mode { Creation, Edition }

type Msg_ =
    { type: Type.UserClickedModal, payload: boolean }
    | { type: Type.UserUpdatedField, payload: { fieldname: string, newValue: string } }
    | { type: Type.ResetProfile, payload: Mode }


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
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles)

    const [profileModel, update] = React.useReducer(updateProfile, { modal: false, profileForm: profile })


    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true })
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false })
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } })

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
            <Box sx={style}>
                <Stack spacing={4}>
                    <TextField fullWidth onChange={handleFieldUpdate("name")}

                        value={profileModel.profileForm.name}
                        id={`name`}
                        label={"Name"}
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
                            {unwrappedSources.map(source => <MenuItem
                                key={source.name}
                                value={source.name}

                            >
                                {source.name}
                            </MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button variant="contained" color='primary' onClick={saveProfiles}>Save Profile</Button>

                </Stack>
            </Box>
        </Modal></>)
}

export default ProfilesTable
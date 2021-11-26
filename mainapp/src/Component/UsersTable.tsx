import {
    Box, CircularProgress, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack
} from '@mui/material';
import { useModel } from '../Admin';
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { Button, FormControl, InputLabel, MenuItem, Modal, Select, TextField } from '@material-ui/core';
import { identity, style } from '../Utils';
import { newUser, putUsers, User } from '../User';
import { ulid } from 'ulid';
import { ButtonWithConfirmation } from './ButtonWithConfirmation';
import Autocomplete from '@mui/material/Autocomplete';
const UsersTable = () => {
    const { model, updateModel } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.users)
    const [filteringChars, setFilteringChars] = React.useState("")
    const deleteUser = (user: User) => {

        const updatedUsers = unwrappedSources.filter(prevUser => prevUser.id !== user.id);
        console.log("deleted")

        putUsers("/users", updatedUsers)
            .then((users) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(users) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }));

    }

    const renderUsers =
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
            success: (gotUsers: User[]) =>

                <Box
                    sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <Stack spacing={2}>
                        <Autocomplete
                            disablePortal
                            id="search-users"
                            options={gotUsers.map((user) => user.login)}
                            sx={{ width: 300 }}
                            onInputChange={(event, newInputValue) => {
                                setFilteringChars(newInputValue);
                            }}
                            renderInput={(params) => <TextField {...params} label="Search Users by login" />}
                        />
                        <Box id="table-container" sx={{ justifyContent: 'center', display: 'flex', width: '600' }}>
                            <TableContainer sx={{ maxHeight: '400px' }} component={Paper}>
                                <Table sx={{ width: '100%' }}>
                                    <TableHead>
                                        <TableRow style={{ fontWeight: "bold" }}>
                                            <TableCell style={{ fontWeight: 'bold' }}>Source</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>Name</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>groups</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody sx={{ width: '100%', overflow: 'visible' }}>{
                                        gotUsers
                                            .filter(user => user.login.includes(filteringChars))
                                            .map(user => {
                                                return (<TableRow key={user.id}>
                                                    <TableCell >
                                                        {user.login}
                                                    </TableCell>
                                                    <TableCell>
                                                        {user.groups.join(', ')
                                                        }
                                                    </TableCell>
                                                    <TableCell>

                                                        <Box sx={{ display: 'flex' }}>
                                                            <UserForm maybeuser={user} />
                                                            <ButtonWithConfirmation disabled={user.source == "json" ? false : true} label='Delete' msg={() => deleteUser(user)} />                                                </Box>
                                                    </TableCell>

                                                </TableRow>);
                                            })}</TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <UserForm create={true} />

                        </Box>
                    </Stack >

                </Box >


        }, model.users)

    return (renderUsers)
}


type UserEditionState = { modal: boolean, userForm: User }

const initSourceEditionState: UserEditionState = { modal: false, userForm: newUser(ulid()) }

enum Type {
    UserClickedModal,
    UserUpdatedField,
    ResetUser
}
enum Mode { Creation, Edition }

type Msg_ =
    { type: Type.UserClickedModal, payload: boolean }
    | { type: Type.UserUpdatedField, payload: { fieldname: string, newValue: string } }
    | { type: Type.ResetUser, payload: Mode }

const updateUser = (userEditionState: UserEditionState, msg: Msg_): UserEditionState => {
    console.log(Type[msg.type], msg.payload)
    const { model } = useModel()
    const unwrappedUsers = SRD.unwrap([], identity, model.users)

    switch (msg.type) {

        case Type.UserClickedModal:

            return { ...userEditionState, modal: msg.payload }

        case Type.UserUpdatedField:
            const fieldToUpdate = msg.payload.fieldname

            return { ...userEditionState, userForm: { ...userEditionState.userForm, [fieldToUpdate]: msg.payload.newValue } }

        case Type.ResetUser:
            switch (msg.payload) {
                case Mode.Creation:
                    return { ...userEditionState, userForm: newUser(ulid()) }
                case Mode.Edition:
                    const getUnmodifiedUsers = unwrappedUsers.reduce((acc, value) => userEditionState.userForm.id === value.id ? value : acc, newUser(ulid()))
                    const resetSourceForm = msg.payload ? userEditionState.userForm : getUnmodifiedUsers

                    return { ...userEditionState, userForm: msg.payload ? userEditionState.userForm : resetSourceForm }
            }

    }
}

type UserFormProps = {
    maybeuser?: User,
    create?: boolean
}

const UserForm = ({ maybeuser: maybeUser, create = false }: UserFormProps) => {

    const user = maybeUser ? maybeUser : newUser(ulid())
    const { model, updateModel } = useModel()
    const unwrappedUsers = SRD.unwrap([], identity, model.users)
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles)

    const [userModel, update] = React.useReducer(updateUser, { modal: false, userForm: user })

    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true })
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false })
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } })


    const saveSources = () => {

        const updateUsers = unwrappedUsers.map(s => s.login === user.login ? userModel.userForm : s)
        const addUser = [...unwrappedUsers, userModel.userForm]
        updateModel({ type: 'UserClickedSaveChanges', payload: {} });
        putUsers("/users", create ? addUser : updateUsers)
            .then((users) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(users) }))
            .then(() => update({ type: Type.UserClickedModal, payload: false }))
            .then(() => update({ type: Type.ResetUser, payload: create ? Mode.Creation : Mode.Edition }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }));
    };

    const creationVariant = (edition: any, creation: any) => create ? creation : edition

    const config = SRD.unwrap({ auth: "json" }, identity, model.config);

    const createEditButton = <Button color="primary" variant='contained' onClick={handleOpen}>{create ? "Create User" : "Edit"}</Button>

    return (<>
        {create ? config.auth == "json" ? createEditButton : null : createEditButton}
        <Modal onClose={handleClose} open={userModel.modal}>
            <Box sx={style}>
                <Stack spacing={4}>
                    <h2>{`Edit ${user.login}`}</h2>
                    <TextField fullWidth onChange={handleFieldUpdate("login")}

                        value={userModel.userForm.login}
                        id={`login`}
                        label={"Login"}
                        variant="standard"
                        disabled={user.source == "json" ? false : true} />
                    <TextField fullWidth onChange={handleFieldUpdate("password")}

                        value={userModel.userForm.password}
                        id={`password`}
                        type='password'
                        label={"Password"}
                        variant="standard"
                        disabled={user.source == "json" ? false : true} />
                    <FormControl>
                        <InputLabel id="select-groups-label">Groups</InputLabel>
                        <Select
                            labelId="select-groups-label"
                            id="select-groups"
                            multiple
                            value={userModel.userForm.groups}
                            label="select-groups-label"
                            fullWidth
                            renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                            onChange={handleFieldUpdate("groups")}
                        >
                            {unwrappedProfiles.map(profile => <MenuItem
                                key={profile.name}
                                value={profile.name}

                            >
                                {profile.name}
                            </MenuItem>)}
                        </Select>
                    </FormControl>

                    <Button color="primary" variant="contained" onClick={saveSources}>Save User</Button>

                </Stack>
            </Box>
        </Modal></>)
};

export default UsersTable


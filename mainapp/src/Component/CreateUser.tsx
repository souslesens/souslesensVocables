import {
    accordionActionsClasses, TextField,
    Modal, Box, Tabs, Tab, Button, CircularProgress, Chip, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, dividerClasses, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, Stack
} from '@mui/material';
import { Msg, useModel } from '../Admin';
import { newUser, restoreUsers, putUsers, deleteUser, User } from '../User';
import * as React from "react";
import * as ReactDOM from "react-dom";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { ulid } from 'ulid';
import { identity } from '../Utils';
import UserForm from './UserForm';

const CreateUser = (props: { modal: boolean; updateModel: React.Dispatch<Msg>; setModal: React.Dispatch<React.SetStateAction<boolean>>; }) => {
    const { model, updateModel } = useModel();
    const newUserID = ulid()
    const [user, setNewUser] = React.useState(newUser(newUserID));
    const profiles = SRD.unwrap([], identity, model.profiles)
    const users = SRD.unwrap([], identity, model.users)

    React.useEffect(() => {
        setNewUser(newUser(newUserID))
    }, [])

    const saveUser = () => {

        updateModel({ type: 'UserClickedSaveChanges', payload: {} })
        putUsers('/users', [...users, user])
            .then((person) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .then(() => props.setModal(false))
            .then(() => setNewUser(newUser(ulid())))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }))
    }


    return (
        <>
            <Box mb={4}><Button color="success" variant="contained" onClick={() => props.setModal(true)}>Add user</Button></Box>
            {//newFunction(props, setNewUser, user, profiles, saveUser, deletedUser)
            }
            <UserForm
                modal={props.modal}
                updateModel={props.updateModel}
                setModal={props.setModal}
                setNewUser={setNewUser}
                user={user}
                profiles={profiles}
                saveUser={saveUser}
                deletedUser={deleteUser(users, user, updateModel, props.setModal)} />
        </>
    )
}

export default CreateUser
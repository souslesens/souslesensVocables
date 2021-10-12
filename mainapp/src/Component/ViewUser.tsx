import {
    accordionActionsClasses, TextField,
    Modal, Box, Tabs, Tab, Button, CircularProgress, Chip, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, dividerClasses, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, Stack
} from '@mui/material';
import { Msg, useModel } from '../Admin';
import { restoreUsers, saveUser, deleteUser, User } from '../User';
import * as React from "react";
import * as ReactDOM from "react-dom";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import UserForm from './UserForm';
import { identity } from '../Utils';

type UserProps = { user: User }

const ViewUser: React.FC<UserProps> = ({ user }) => {

    const { model, updateModel } = useModel();

    const [localUser, setNewUser] = React.useState(user);

    const [isModalOpen, setModal] = React.useState(false);

    const restoredUsers = restoreUsers(updateModel, setModal)

    const handleOpen = () => setModal(true);


    const users: User[] = SRD.unwrap([], identity, model.users)

    const profiles: string[] = SRD.unwrap([], identity, model.profiles)


    return (<>

        <Button variant="outlined" size="medium" onClick={handleOpen}>{`Edit`}</Button>
        <UserForm
            modal={isModalOpen}
            updateModel={updateModel}
            setModal={setModal}
            setNewUser={setNewUser}
            user={localUser}
            profiles={profiles}
            saveUser={saveUser(updateModel, users, user, localUser, setModal)}
            deletedUser={deleteUser(users, user, updateModel, setModal)} />

    </>)
};
export default ViewUser
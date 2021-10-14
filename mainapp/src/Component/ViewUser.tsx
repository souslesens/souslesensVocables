import {
    Button
} from '@mui/material';
import { Msg, useModel } from '../Admin';
import { restoreUsers, saveUser, deleteUser, User } from '../User';
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import UserForm from './UserForm';
import { identity } from '../Utils';
import { Profile } from '../Profile';

type UserProps = { user: User }

const ViewUser: React.FC<UserProps> = ({ user }) => {

    const { model, updateModel } = useModel();

    const [localUser, setNewUser] = React.useState(user);

    const [isModalOpen, setModal] = React.useState(false);

    const restoredUsers = restoreUsers(updateModel, setModal)

    const handleOpen = () => setModal(true);


    const users: User[] = SRD.unwrap([], identity, model.users)

    const profiles: Profile[] = SRD.unwrap([], identity, model.profiles)


    return (<>

        <Button variant="contained" color="primary" size="medium" onClick={handleOpen}>{`Edit`}</Button>
        <UserForm
            modal={isModalOpen}
            setModal={setModal}
            setNewUser={setNewUser}
            user={localUser}
            saveUser={saveUser(updateModel, users, user, localUser, setModal)}
            deletedUser={deleteUser(users, user, updateModel, setModal)} />

    </>)
};
export default ViewUser
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

type ProfileProps = { profile: Profile }

const ViewUser: React.FC<ProfileProps> = ({ profile: user }) => {

    const { model, updateModel } = useModel();

    const [localProfile, setNewProfile] = React.useState(user);

    const [isModalOpen, setModal] = React.useState(false);

    const restoredUsers = restoreUsers(updateModel, setModal)

    const handleOpen = () => setModal(true);


    const users: User[] = SRD.unwrap([], identity, model.users)

    const profiles: Profile[] = SRD.unwrap([], identity, model.profiles)


    return (<>

        <Button variant="outlined" size="medium" onClick={handleOpen}>{`Edit`}</Button>


    </>)
};
export default ViewUser
import { Msg } from '../Admin';
import { User } from '../User';
import * as React from "react";
declare type UserFormProps = {
    modal: boolean;
    updateModel: React.Dispatch<Msg>;
    setModal: React.Dispatch<React.SetStateAction<boolean>>;
    setNewUser: React.Dispatch<React.SetStateAction<User>>;
    user: User;
    profiles: string[];
    saveUser: () => void;
    deletedUser: () => void;
};
declare const UserForm: React.FC<UserFormProps>;
export default UserForm;

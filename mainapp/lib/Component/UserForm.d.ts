import { User } from '../User';
import * as React from "react";
declare type UserFormProps = {
    modal: boolean;
    setModal: React.Dispatch<React.SetStateAction<boolean>>;
    setNewUser: React.Dispatch<React.SetStateAction<User>>;
    user: User;
    saveUser: () => void;
    deletedUser: () => void;
};
declare const UserForm: React.FC<UserFormProps>;
export default UserForm;

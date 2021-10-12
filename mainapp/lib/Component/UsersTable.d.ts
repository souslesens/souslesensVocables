import { User } from '../User';
import * as React from "react";
import { RD } from 'srd';
declare type UsersProps = {
    users: RD<string, User[]>;
};
declare const UsersTable: React.FC<UsersProps>;
export default UsersTable;

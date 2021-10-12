import { Msg } from '../Admin';
import * as React from "react";
declare const CreateUser: (props: {
    modal: boolean;
    updateModel: React.Dispatch<Msg>;
    setModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => JSX.Element;
export default CreateUser;

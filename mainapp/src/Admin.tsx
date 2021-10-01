import * as React from "react";
import * as ReactDOM from "react-dom";
import { accordionActionsClasses, Button, dividerClasses } from '@mui/material';
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { User, getUsers } from './User'
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

type Msg =
    { type: 'UserClickedOpenModale', payload: boolean }
    | { type: 'ServerRespondedWithUsers', payload: RD<string, User[]> }
    | { type: 'UserUpdatedField', key: string, fieldName: string, newValue: string }


type Model = {
    users: RD<string, User[]>,
    isModaleOpen: boolean
}

const initialModel: Model =
{
    users: notAsked(),
    isModaleOpen: false
}

const identity = (a: any): any => a
//const arrayToDict = (arr: User[]): Record<string, User> => {
//  return arr.reduce((acc, val) =>...acc, [val.key]: identity(val), {})
//}

function update(model: Model, action: Msg): Model {
    const unwrapedUsers = SRD.unwrap([], identity, model.users)
    switch (action.type) {
        case 'UserClickedOpenModale':
            return { ...model, isModaleOpen: action.payload }
        case 'ServerRespondedWithUsers':
            return { ...model, users: action.payload }
        case 'UserUpdatedField':
            return { ...model, users: model.users }
        default:
            return model
    }
}

const Admin = () => {

    const [model, updatedModel] = React.useReducer(update, initialModel)
    const handleOpen = () => updatedModel({ type: 'UserClickedOpenModale', payload: true });
    const handleClose = () => updatedModel({ type: 'UserClickedOpenModale', payload: false });

    React.useEffect(() => {
        updatedModel({ type: 'ServerRespondedWithUsers', payload: loading() })
        getUsers('/users')
            .then((person) => updatedModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .catch((err) => updatedModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }))
    }, [])



    function viewUser(user: User) {
        const fields = Object.keys(user)
        return (
            <>
                <li><Button onClick={handleOpen}>{user.login}</Button></li>
                <Modal
                    open={model.isModaleOpen}
                    onClose={handleClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <Box component="form"
                        sx={style}
                        noValidate
                        autoComplete="off">
                        <TextField value={user.login} id="login" label="Login" variant="standard" />
                        <TextField value={user.password} id="password" label="mdp" variant="standard" />
                        <Button onClick={handleOpen} variant="contained">Save changes</Button>
                    </Box>
                </Modal>
            </>
        )
    }

    function viewUsers(gotUsers: User[]): JSX.Element {
        return (
            <ul>{gotUsers.map(el => viewUser(el))}
            </ul>)

    }

    return <>
        {SRD.match({
            notAsked: () => 'Nothing asked',
            loading: () => 'Loading...',
            failure: (msg) => `Il y a un problème: ${msg}`,
            success: gotUsers =>
                <div>
                    {viewUsers(gotUsers)}
                </div>
        }, model.users)}
    </>
}


export default Admin


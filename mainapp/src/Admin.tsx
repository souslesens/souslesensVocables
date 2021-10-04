import * as React from "react";
import * as ReactDOM from "react-dom";
import { accordionActionsClasses, Button, dividerClasses } from '@mui/material';
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { User, getUsers, putUsers } from './User'
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';



type Msg =
    { type: 'UserClickedOpenModale', payload: boolean }
    | { type: 'ServerRespondedWithUsers', payload: RD<string, User[]> }
    | { type: 'UserUpdatedField', payload: UpadtedFieldPayload }
    | { type: 'UserClickedSaveChanges', payload: {} }

type UpadtedFieldTag =
    { key: string, fieldName: string }

type UpadtedFieldPayload =
    { key: string, fieldName: string, newValue: string }

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


function update(model: Model, msg: Msg): Model {
    const unwrappedUsers: User[] = SRD.unwrap([], identity, model.users)
    switch (msg.type) {
        case 'UserClickedOpenModale':
            return { ...model, isModaleOpen: msg.payload }

        case 'ServerRespondedWithUsers':
            return { ...model, users: msg.payload }

        case 'UserUpdatedField':
            const fieldToUpdate = msg.payload.fieldName
            const updatedUsers = unwrappedUsers.map(u => u.key === msg.payload.key ? { ...u, [fieldToUpdate]: msg.payload.newValue } : u)
            return { ...model, users: SRD.of(updatedUsers) }

        default:
            return model
    }
}

const Admin = () => {

    const [model, updateModel] = React.useReducer(update, initialModel)
    const handleOpen = () => updateModel({ type: 'UserClickedOpenModale', payload: true });
    const handleClose = () => updateModel({ type: 'UserClickedOpenModale', payload: false });
    const handleNewInput = ({ key, fieldName }: UpadtedFieldTag) => (event: React.ChangeEvent<HTMLInputElement>) => updateModel({ type: 'UserUpdatedField', payload: { key: key, fieldName: fieldName, newValue: event.target.value } })
    const unwrappedUsers: User[] = SRD.unwrap([], identity, model.users)

    React.useEffect(() => {
        updateModel({ type: 'ServerRespondedWithUsers', payload: loading() })
        getUsers('/users')
            .then((person) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }))
    }, [])

    const saveUsers = () => {
        updateModel({ type: 'UserClickedSaveChanges', payload: {} })
        putUsers('/users', unwrappedUsers)
            .then((person) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }))
    }



    function viewUser(user: User) {
        const fields = Object.keys(user)
        return (
            <>
                <li><Button onClick={handleOpen}>{user.login}</Button></li>


                {fields.map(field => <TextField onChange={handleNewInput({ key: user.key, fieldName: field })}
                    //@ts-ignore
                    value={user[field]}
                    id={`id-${field}`}
                    label={field}
                    variant="standard" />)
                }




            </>
        )
    }

    function viewUsers(gotUsers: User[]): JSX.Element {
        return (
            <>
                <ul>{gotUsers.map(el => viewUser(el))}

                </ul>
                <Button onClick={saveUsers} variant="contained">Save changes</Button>
            </>)

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


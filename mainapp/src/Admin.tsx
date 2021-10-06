import * as React from "react";
import * as ReactDOM from "react-dom";
import { accordionActionsClasses, Button, Chip, dividerClasses, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { User, getUsers, putUsers } from './User'
import { getProfiles } from './Profiles'
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

type Model = {
    users: RD<string, User[]>,
    isModaleOpen: boolean,
    profiles: RD<string, string[]>
}

type RenderFormProps = {
    fields: string[]
    , user: User
}

type RenderFieldProps = {
    field: string,
    user: User
}



type UpadtedFieldTag =
    { key: string, fieldName: string }

type UpadtedFieldPayload =
    { key: string, fieldName: string, newValue: string }


const initialModel: Model =
{
    users: loading(),
    isModaleOpen: false,
    profiles: loading()
}

type Msg =
    { type: 'UserClickedOpenModale', payload: boolean }
    | { type: 'ServerRespondedWithUsers', payload: RD<string, User[]> }
    | { type: 'ServerRespondedWithProfiles', payload: RD<string, string[]> }
    | { type: 'UserUpdatedField', payload: UpadtedFieldPayload }
    | { type: 'UserUpdatedRoles', payload: { key: string, roles: string | string[] } }
    | { type: 'UserClickedSaveChanges', payload: {} }

const identity = <Type,>(a: Type): Type => a;

function update(model: Model, msg: Msg): Model {
    const unwrappedUsers: User[] = SRD.unwrap([], identity, model.users)
    console.log(msg);
    switch (msg.type) {
        case 'UserClickedOpenModale':
            return { ...model, isModaleOpen: msg.payload }

        case 'ServerRespondedWithUsers':
            return { ...model, users: msg.payload }

        case 'ServerRespondedWithProfiles':
            return { ...model, profiles: msg.payload }

        case 'UserUpdatedField':
            const fieldToUpdate = msg.payload.fieldName
            const updatedUsers = unwrappedUsers.map(u => u.key === msg.payload.key ? { ...u, [fieldToUpdate]: msg.payload.newValue } : u)
            return { ...model, users: SRD.of(updatedUsers) }
        case 'UserUpdatedRoles':
            const updatedUserRole = unwrappedUsers.map(u => u.key === msg.payload.key ? { ...u, groups: typeof msg.payload.roles === 'string' ? msg.payload.roles.split(',') : msg.payload.roles } : u)
            console.log({ "prev": unwrappedUsers });
            console.log({ "next": updatedUserRole });
            return { ...model, users: SRD.of(updatedUserRole) }


        default:
            return model
    }
}


const Admin = () => {

    const [model, updateModel] = React.useReducer(update, initialModel)

    const handleOpen = () => updateModel({ type: 'UserClickedOpenModale', payload: true });

    const handleClose = () => updateModel({ type: 'UserClickedOpenModale', payload: false });

    const handleNewRoleInput = (key: string) => (event: SelectChangeEvent<string[]>) => updateModel({ type: 'UserUpdatedRoles', payload: { key: key, roles: event.target.value } });

    const handleNewInput = ({ key, fieldName }: UpadtedFieldTag) => (event: React.ChangeEvent<HTMLInputElement>) => updateModel({ type: 'UserUpdatedField', payload: { key: key, fieldName: fieldName, newValue: event.target.value } })

    const unwrappedUsers: User[] = SRD.unwrap([], identity, model.users)

    //TODO: combine both fetch with promise.all() or something like that

    React.useEffect(() => {
        updateModel({ type: 'ServerRespondedWithProfiles', payload: loading() })
        getProfiles('/profiles')
            .then((profiles) => updateModel({ type: 'ServerRespondedWithProfiles', payload: success(profiles) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithProfiles', payload: failure(err.msg) }))
    }, [])

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

    type ViewUserProps = { user: User }

    const ViewUser: React.FC<ViewUserProps> = ({ user }) => {
        const fields: string[] = Object.keys(user)
        return (<>
            <Button onClick={handleOpen}>{user.login}</Button>
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
                    <RenderForm fields={fields} user={user} />
                </Box>
            </Modal>
            )
        </>)
    };

    const RenderForm: React.FC<RenderFormProps> = (props) => {
        return (<>{props.fields.map(field =>
            <FormControl sx={{ m: 1, minWidth: 100 }}>
                <RenderFieldAppropriatly user={props.user} field={field} />
                <Button onClick={handleOpen} variant="contained">Save changes</Button>
            </FormControl>)}</>
        )
    };

    const RenderFieldAppropriatly: React.FC<RenderFieldProps> = (props) => {
        switch (props.field) {
            case "key":
                return <div></div>
            case "groups":
                return (
                    SRD.match({
                        notAsked: () => <div>'Nothing asked'</div>,
                        loading: () => <div>'Loading...'</div>,
                        failure: (msg) => <div>`Il y a un problème: ${msg}`</div>,
                        success: gotProfiles =>
                            <>
                                <InputLabel id="select-groups-label">Groups</InputLabel>
                                <Select
                                    labelId="select-groups-label"
                                    id="select-groups"
                                    multiple
                                    value={props.user.groups}
                                    defaultValue={props.user.groups}
                                    label="groups"
                                    renderValue={(selected => selected.join(', '))}
                                    onChange={handleNewRoleInput(props.user.key)}
                                >
                                    {gotProfiles.map(profile =>
                                        <MenuItem
                                            key={profile}
                                            value={profile}

                                        >
                                            {profile}
                                        </MenuItem>)}
                                </Select>
                            </>

                    }, model.profiles)
                )
            default:
                return (<TextField onChange={handleNewInput({ key: props.user.key, fieldName: props.field })}
                    //@ts-ignore
                    value={user[field]}
                    id={`id-${props.field}-${props.user.key}`}
                    label={props.field}
                    variant="standard" />)

        }
    }

    type ViewUsersProps = {
        users: User[]
    }

    const ViewUsers: React.FC<ViewUsersProps> = ({ users }): JSX.Element => {
        return (
            <>
                <ul>{users.map(el => <ViewUser user={el}></ViewUser>)}</ul>
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
                    <ViewUsers users={gotUsers} />
                </div>
        }, model.users)}
    </>
}

{//<li><Button onClick={handleOpen}>{user.login}</Button></li>
}
export default Admin

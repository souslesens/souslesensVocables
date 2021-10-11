import * as React from "react";
import * as ReactDOM from "react-dom";
import { accordionActionsClasses, Button, Chip, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, dividerClasses, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, Stack } from '@mui/material';
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { User as User, getUsers, putUsers } from './User'
import { getProfiles } from './Profiles'
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { ULID, ulid } from "ulid";

//import DeleteIcon from '@mui/icons-material/Delete';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800,
    height: 500,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,

};

type Model = {
    users: RD<string, User[]>,
    profiles: RD<string, string[]>,
    isModalOpen: boolean
}


type UpadtedFieldPayload =
    { key: string, fieldName: string, newValue: string }


const initialModel: Model =
{
    users: loading(),
    profiles: loading(),
    isModalOpen: false
}

type Msg =
    { type: 'ServerRespondedWithUsers', payload: RD<string, User[]> }
    | { type: 'ServerRespondedWithProfiles', payload: RD<string, string[]> }
    | { type: 'UserUpdatedField', payload: UpadtedFieldPayload }
    | { type: 'UserUpdatedRoles', payload: { key: string, roles: string | string[] } }
    | { type: 'UserClickedSaveChanges', payload: {} }
    | { type: 'UserChangedModalState', payload: boolean }
    | { type: 'UserClickedAddUser', payload: string }


const identity = <Type,>(a: Type): Type => a;

const newUser = (key: string): User => { return ({ key: key, login: '', password: '', groups: [] }) }

function update(model: Model, msg: Msg): Model {
    const unwrappedUsers: User[] = SRD.unwrap([], identity, model.users)
    console.log(msg);
    switch (msg.type) {

        case 'ServerRespondedWithUsers':
            return { ...model, users: msg.payload }

        case 'ServerRespondedWithProfiles':
            return { ...model, profiles: msg.payload }

        case 'UserClickedSaveChanges':
            return { ...model, isModalOpen: false }

        case 'UserClickedAddUser':
            console.log(`userCreated ${msg.payload}`)
            return { ...model, users: SRD.of([...unwrappedUsers, newUser(msg.payload)]) }

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


const ModelContext = React.createContext<{ model: Model; updateModel: React.Dispatch<Msg> } | null>(null);

function useModel() {
    const modelContext = React.useContext(ModelContext)
    if (modelContext === null) {
        throw new Error("I can't initialize model and updateModel for some reason")
    }
    return modelContext
};

const Admin = () => {

    const [model, updateModel] = React.useReducer(update, initialModel)
    const [modal, setModal] = React.useState(false)
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



    return <ModelContext.Provider value={{ model, updateModel }}>
        {SRD.match({
            notAsked: () => 'Nothing asked',
            loading: () => 'Loading...',
            failure: (msg) => `Il y a un problème: ${msg}`,
            success: gotUsers =>

                <Box
                    sx={{ display: 'flex', justifyContent: 'center', p: 4 }}

                >
                    <Stack>
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CreateUser modal={modal} updateModel={updateModel} setModal={setModal} /></Box>

                        <Users users={gotUsers} />
                    </Stack>


                </Box>


        }, model.users)}
    </ModelContext.Provider >
}

const CreateUser = (props: { modal: boolean; updateModel: React.Dispatch<Msg>; setModal: React.Dispatch<React.SetStateAction<boolean>>; }) => {
    const { model, updateModel } = useModel()
    const newUserID = ulid()
    const [user, setNewUser] = React.useState(newUser(newUserID));
    const profiles = SRD.unwrap([], identity, model.profiles)
    const users = SRD.unwrap([], identity, model.users)

    React.useEffect(() => {
        setNewUser(newUser(newUserID))
    }, [])

    const saveUser = () => {

        updateModel({ type: 'UserClickedSaveChanges', payload: {} })
        putUsers('/users', [...users, user])
            .then((person) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .then(() => props.setModal(false))
            .then(() => setNewUser(newUser(ulid())))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }))
    }


    return (
        <>
            <Box mb={4}><Button color="success" variant="contained" onClick={() => props.setModal(true)}>Add user</Button></Box>
            {//newFunction(props, setNewUser, user, profiles, saveUser, deletedUser)
            }
            <UserForm
                modal={props.modal}
                updateModel={props.updateModel}
                setModal={props.setModal}
                setNewUser={setNewUser}
                user={user}
                profiles={profiles}
                saveUser={saveUser}
                deletedUser={deleteUser(users, user, updateModel, props.setModal)} />
        </>
    )
}

type UserProps = { user: User }

const User: React.FC<UserProps> = ({ user }) => {

    const { model, updateModel } = useModel();

    const [localUser, setNewUser] = React.useState(user);

    const [isModalOpen, setModal] = React.useState(false);

    const restoredUsers = restoreUsers(updateModel, setModal)

    const handleOpen = () => setModal(true);


    const users: User[] = SRD.unwrap([], identity, model.users)

    const profiles: string[] = SRD.unwrap([], identity, model.profiles)


    return (<>

        <Button variant="outlined" size="medium" onClick={handleOpen}>{`Edit ${user.login}`}</Button>
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

type UserFormProps = {
    modal: boolean,
    updateModel: React.Dispatch<Msg>,
    setModal: React.Dispatch<React.SetStateAction<boolean>>,
    setNewUser: React.Dispatch<React.SetStateAction<User>>,
    user: User,
    profiles: string[],
    saveUser: () => void,
    deletedUser: () => void
}

const UserForm: React.FC<UserFormProps> = ({ modal, setModal, updateModel, setNewUser, user, profiles, saveUser, deletedUser }) => {
    return <Modal open={modal}
        onClose={restoreUsers(updateModel, setModal)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description">
        <Box sx={style}>
            <Stack spacing={4}>
                <h2>{`Edit ${user.login}`}</h2>
                <TextField fullWidth onChange={(event) => setNewUser({ ...user, login: event.target.value })}
                    //@ts-ignore
                    value={user.login}
                    id={`id-login-${user.key}`}
                    label={"login"}
                    variant="standard" />

                <TextField fullWidth onChange={(event) => setNewUser({ ...user, password: event.target.value })}
                    //@ts-ignore
                    value={user.password}
                    id={`id-password-${user.key}`}
                    label={"password"}
                    variant="standard" />
                <FormControl>
                    <InputLabel id="select-groups-label">Groups</InputLabel>
                    <Select
                        labelId="select-groups-label"
                        id="select-groups"
                        multiple
                        value={user.groups}
                        defaultValue={user.groups}
                        label="select-groups-label"
                        fullWidth
                        renderValue={(selected) => typeof selected === 'string' ? selected : selected.join(', ')}
                        onChange={(event) => setNewUser({ ...user, groups: sanitizeValue(event.target.value) })}
                    >
                        {profiles.map(profile => <MenuItem
                            key={profile}
                            value={profile}

                        >
                            {profile}
                        </MenuItem>)}
                    </Select>
                </FormControl>




                <Button onClick={saveUser} variant="contained">Save changes</Button>
                <Button onClick={deletedUser} variant="contained" color="error">Delete User</Button>

            </Stack>
        </Box>
    </Modal >;
}

function deleteUser(users: User[], user: User, updateModel: React.Dispatch<Msg>, setModal: React.Dispatch<React.SetStateAction<boolean>> = () => console.log("modal closed")) {
    const updatedUsers = users.filter(prevUsers => prevUsers.key !== user.key);
    console.log(`user ${user.key} deleted`)
    console.log(updatedUsers)
    return () => {
        putUsers('/users', updatedUsers)
            .then((users) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(users) }))
            .then(() => setModal(false))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }));
    };
}

function saveUser(updateModel: React.Dispatch<Msg>, users: User[], user: User, localUser: User, setModal: React.Dispatch<React.SetStateAction<boolean>>) {
    return () => {

        updateModel({ type: 'UserClickedSaveChanges', payload: {} });
        putUsers('/users', users.map(u => u.key === user.key ? localUser : u))
            .then((person) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .then(() => setModal(false))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }));
    };
}

function restoreUsers(updateModel: React.Dispatch<Msg>, setModal: React.Dispatch<React.SetStateAction<boolean>>) {
    console.log("restore user")
    return () => {

        getUsers('/users')
            .then((person) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .then(() => setModal(false))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }));
    };
}



type UsersProps = {
    users: User[],
}

const Users: React.FC<UsersProps> = ({ users }): JSX.Element => {
    const { model, updateModel } = useModel();
    return (
        <Box sx={{ justifyContent: 'center', display: 'flex' }}>
            <TableContainer component={Paper}>
                <Table sx={{ width: '100%' }}>
                    <TableHead>
                        <TableRow >
                            <TableCell>Login</TableCell>
                            <TableCell>Groups</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>{users.map(user => (<TableRow key={user.key}>
                        <TableCell>
                            {user.login}
                        </TableCell>
                        <TableCell>
                            {user.groups.join(', ')}
                        </TableCell>
                        <TableCell>
                            <ButtonGroup>
                                <User key={user.key} user={user}></User>
                                {//<Button onClick={() => deleteUser(users, user, updateModel)} variant='contained' color='error'>Delete User</Button>
                                }
                            </ButtonGroup>

                        </TableCell>

                    </TableRow>))}</TableBody>
                </Table>
            </TableContainer>
        </Box>
        //<Stack spacing={2}>{users.map(el => <User key={el.key} user={el}></User>)}</Stack>


    )

}




function sanitizeValue(value: string | string[]): string[] {
    return (typeof value === 'string' ? value.split(',') : value);
}


export default Admin



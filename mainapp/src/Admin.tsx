import * as React from "react";
import { Tabs, Tab } from '@mui/material';
import { SRD, RD, loading, failure, success } from 'srd'
import { User as User, getUsers, newUser } from './User'
import { getProfiles } from './Profile'
import Box from '@mui/material/Box';
import { identity } from './Utils';
import UsersTable from './Component/UsersTable';
import ProfilesTable from './Component/ProfilesTable';





type Model = {
    users: RD<string, User[]>,
    profiles: RD<string, string[]>,
    isModalOpen: boolean,
    currentEditionTab: EditionTab
}

type EditionTab
    = 'UsersEdition' | 'ProfilesEdition' | 'SourcesEdition'

const editionTabToNumber = (editionTab: EditionTab) => {
    switch (editionTab) {
        case 'UsersEdition': return 0
        case 'ProfilesEdition': return 1
        case 'SourcesEdition': return 2
        default: 0
    }
}

const editionTabToString = (editionTab: number): EditionTab => {
    switch (editionTab) {
        case 0: return 'UsersEdition'
        case 1: return 'ProfilesEdition'
        case 2: return 'SourcesEdition'
        default: return 'UsersEdition'
    }
}

type UpadtedFieldPayload =
    { key: string, fieldName: string, newValue: string }


const initialModel: Model =
{
    users: loading(),
    profiles: loading(),
    isModalOpen: false,
    currentEditionTab: 'ProfilesEdition'
}

const ModelContext = React.createContext<{ model: Model; updateModel: React.Dispatch<Msg> } | null>(null);

function useModel() {
    const modelContext = React.useContext(ModelContext)
    if (modelContext === null) {
        throw new Error("I can't initialize model and updateModel for some reason")
    }
    return modelContext
};

type Msg =
    { type: 'ServerRespondedWithUsers', payload: RD<string, User[]> }
    | { type: 'ServerRespondedWithProfiles', payload: RD<string, string[]> }
    | { type: 'UserUpdatedField', payload: UpadtedFieldPayload }
    | { type: 'UserUpdatedRoles', payload: { key: string, roles: string | string[] } }
    | { type: 'UserClickedSaveChanges', payload: {} }
    | { type: 'UserChangedModalState', payload: boolean }
    | { type: 'UserClickedAddUser', payload: string }
    | { type: 'UserClickedNewTab', payload: number }



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

        case 'UserClickedNewTab':
            return { ...model, currentEditionTab: editionTabToString(msg.payload) }


        default:
            return model
    }
}


const Admin = () => {

    const [model, updateModel] = React.useReducer(update, initialModel)

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
        <Box sx={{ width: '100%', bgcolor: 'Background.paper' }}>
            <Tabs onChange={(event: React.SyntheticEvent, newValue: number) => updateModel({ type: 'UserClickedNewTab', payload: newValue })} value={editionTabToNumber(model.currentEditionTab)} centered>
                <Tab label="Users" />
                <Tab label="Profiles" />
                <Tab label="Sources" />
            </Tabs>
        </Box>
        <Dispatcher model={model} />

    </ModelContext.Provider >
}

const Dispatcher = (props: { model: Model }) => {
    switch (props.model.currentEditionTab) {
        case 'UsersEdition':
            return <UsersTable users={props.model.users} />
        case 'ProfilesEdition':
            return <ProfilesTable />
        case 'SourcesEdition':
            return <div>Sources Edition</div>
        default:
            return <div>Problem</div>
    }
}




export default Admin

export { Msg, useModel }

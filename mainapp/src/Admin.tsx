import * as React from "react";
import { Tabs, Tab } from '@mui/material';
import { SRD, RD, loading, failure, success } from 'srd'
import { User as User, getUsers, newUser } from './User'
import { getProfiles } from './Profile'
import Box from '@mui/material/Box';
import { identity } from './Utils';
import ProfilesTable from './Component/ProfilesTable';
import { Profile } from './Profile';
import SourcesTable from './Component/SourcesTable';
import UsersTableBis from './Component/UsersTable';
import { Source, getSources } from "./Source";
import { Config, getConfig } from "./Config";



type Model = {
    users: RD<string, User[]>,
    profiles: RD<string, Profile[]>,
    sources: RD<string, Source[]>,
    config: RD<string, Config>,
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
    { id: string, fieldName: string, newValue: string }


const initialModel: Model =
{
    users: loading(),
    profiles: loading(),
    sources: loading(),
    config: loading(),
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
    | { type: 'ServerRespondedWithProfiles', payload: RD<string, Profile[]> }
    | { type: 'ServerRespondedWithSources', payload: RD<string, Source[]> }
    | { type: 'ServerRespondedWithConfig', payload: RD<string, Config> }
    | { type: 'UserUpdatedField', payload: UpadtedFieldPayload }
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

        case 'ServerRespondedWithSources':
            return { ...model, sources: msg.payload }

        case 'ServerRespondedWithConfig':
            return { ...model, config: msg.payload }

        case 'UserClickedSaveChanges':
            return { ...model, isModalOpen: false }

        case 'UserClickedAddUser':
            console.log(`userCreated ${msg.payload}`)
            return { ...model, users: SRD.of([...unwrappedUsers, newUser(msg.payload)]) }

        case 'UserUpdatedField':
            const fieldToUpdate = msg.payload.fieldName
            const updatedUsers = unwrappedUsers.map(u => u.id === msg.payload.id ? { ...u, [fieldToUpdate]: msg.payload.newValue } : u)
            return { ...model, users: SRD.of(updatedUsers) }


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
        getProfiles('/profiles')
            .then((profiles) => updateModel({ type: 'ServerRespondedWithProfiles', payload: success(profiles) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithProfiles', payload: failure(err.msg) }))
    }, [])

    React.useEffect(() => {
        getUsers('/users')
            .then((person) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }))
    }, [])

    React.useEffect(() => {
        getSources()
            .then((sources) => updateModel({ type: 'ServerRespondedWithSources', payload: success(sources) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithSources', payload: failure(err.msg) }))
    }, [])

    React.useEffect(() => {
        getConfig()
            .then((config) => updateModel({ type: 'ServerRespondedWithConfig', payload: success(config) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithConfig', payload: failure(err.msg) }))
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
            return <UsersTableBis />
        case 'ProfilesEdition':
            return <ProfilesTable />
        case 'SourcesEdition':
            return <SourcesTable />
        default:
            return <div>Problem</div>
    }
}




export default Admin

export { Msg, useModel }

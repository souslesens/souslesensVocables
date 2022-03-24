import React from "react";
import { SRD } from "srd";
import { useModel } from "../Admin";
import { defaultProfile, Profile } from "../Profile";
import { defaultSource, Source } from "../Source";
import { newUser, User } from "../User";
import { exhaustiveCheck, identity } from "../Utils";
import { ulid } from "ulid";

//TODO: WRAP PROFILES, SOURCES AND USERS LOGIC IN ONE COMPONENT INSTEAD OF 3 DUPLICATES

enum Mode {
    Creation,
    Edition,
}

enum Type {
    UserClickedModal,
    UserUpdatedField,
    ResetRessource,
}

type RessourceEditionState = { modal: boolean; ressourceForm: Ressource };

type Msg_ = { type: Type.UserClickedModal; payload: boolean } | { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string } } | { type: Type.ResetRessource; payload: Mode };

const updateRessource = (ressourceState: RessourceEditionState, msg: Msg_): RessourceEditionState => {
    console.log(Type[msg.type], msg.payload);
    const { model } = useModel();
    const unwrappedUsers = SRD.unwrap([], identity, model.users);

    switch (msg.type) {
        case Type.UserClickedModal:
            return { ...ressourceState, modal: msg.payload };

        case Type.UserUpdatedField:
            const fieldToUpdate = msg.payload.fieldname;

            return { ...ressourceState, ressourceForm: { ...ressourceState.ressourceForm, [fieldToUpdate]: msg.payload.newValue } };

        case Type.ResetRessource:
            switch (msg.payload) {
                case Mode.Creation:
                    return { ...ressourceState, ressourceForm: newUser(ulid()) };
                case Mode.Edition:
                    const getUnmodifiedRessources = unwrappedUsers.reduce((acc, value) => (ressourceState.ressourceForm.id === value.id ? value : acc), newUser(ulid()));
                    const resetSourceForm = msg.payload ? ressourceState.ressourceForm : getUnmodifiedRessources;

                    return { ...ressourceState, ressourceForm: msg.payload ? ressourceState.ressourceForm : resetSourceForm };
            }
    }
};

type Ressource = User | Source | Profile;

type RessourceFormProps = {
    maybeRessource?: Ressource;
    mode?: Mode.Creation | Mode.Edition;
    children: JSX.Element[];
};

const defaultRessource = (ressource: Ressource) => {
    switch (ressource._type) {
        case "user":
            return newUser(ulid());
        case "profile":
            return defaultProfile(ulid());
        case "source":
            return defaultSource(ulid());
        default:
            return exhaustiveCheck;
    }
};

const Ressource = ({ maybeRessource, children, mode = Mode.Edition }: RessourceFormProps) => {
    const ressource = maybeRessource ? maybeRessource : newUser(ulid());
    const { model, updateModel } = useModel();
    const unwrappedRessources = SRD.unwrap([], identity, model.users);
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles);

    const [ressourceModel, update] = React.useReducer(updateRessource, { modal: false, ressourceForm: ressource });

    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true });
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false });
    //const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update({ type: Type.RessourceUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } })

    const saveSources = () => {
        //const updateRessources = unwrappedRessources.map(s => s.login === ressource.login ? ressourceModel.ressourceForm : s)
        const addRessource = [...unwrappedRessources, ressourceModel.ressourceForm];
        updateModel({ type: "UserClickedSaveChanges", payload: {} });
        {
            //putRessources("/ressources", create ? addRessource : updateRessources)
            //.then((ressources) => updateModel({ type: 'ServerRespondedWithRessources', payload: success(ressources) }))
            //.then(() => update({ type: Type.UserClickedModal, payload: false }))
            //.then(() => update({ type: Type.ResetRessource, payload: create ? Mode.Creation : Mode.Edition }))
            //.catch((err) => updateModel({ type: 'ServerRespondedWithRessources', payload: failure(err.msg) }));
        }
    };

    return <>{children}</>;
};

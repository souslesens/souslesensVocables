import {
    Box, CircularProgress, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack
} from '@mui/material';
import { useModel } from '../Admin';
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { Source, putSources, defaultSource } from '../Source';
import { Button, FormControl, InputLabel, MenuItem, Modal, Select, TextField } from '@material-ui/core';
import { style } from './UserForm';
import { identity } from '../Utils';


const SourcesTable = () => {
    const { model, updateModel } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources)

    const deleteSource = (source: Source) => {

        const updatedSources = unwrappedSources.filter(prevProfiles => prevProfiles.name !== source.name);
        console.log("deleted")

        putSources(updatedSources)
            .then((sources) => updateModel({ type: 'ServerRespondedWithSources', payload: success(sources) }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithSources', payload: failure(err.msg) }));

    }

    const renderSources =
        SRD.match({
            notAsked: () => <p>Let's fetch some data!</p>,
            loading: () =>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />

                </Box>,
            failure: (msg: string) =>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    ,<p>{`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}</p>

                </Box>,
            success: (gotSources: Source[]) =>

                <Box
                    sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <Stack>
                        <Box sx={{ justifyContent: 'center', display: 'flex' }}>
                            <TableContainer component={Paper}>
                                <Table sx={{ width: '100%' }}>
                                    <TableHead>
                                        <TableRow >
                                            <TableCell>Name</TableCell>
                                            <TableCell>graphUro</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>{gotSources.map(source => {
                                        return (<TableRow key={source.name}>
                                            <TableCell>
                                                {source.name}
                                            </TableCell>
                                            <TableCell>
                                                {source.graphUri}
                                            </TableCell>
                                            <TableCell>
                                                <SourceForm source={source} />
                                                <Button onClick={() => deleteSource(source)}>Delete</Button>
                                            </TableCell>

                                        </TableRow>);
                                    })}</TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <SourceForm create={true} />

                        </Box>
                    </Stack >

                </Box >


        }, model.sources)

    return (renderSources)
}

type SourceEditionState = { modal: boolean, sourceForm: Source }

const initSourceEditionState: SourceEditionState = { modal: false, sourceForm: defaultSource }

enum Type {
    UserClickedModal,
    UserUpdatedField
}

type Msg_ =
    { type: Type.UserClickedModal, payload: boolean }
    | { type: Type.UserUpdatedField, payload: { fieldname: string, newValue: string } }

const updateSource = (model: SourceEditionState, msg: Msg_): SourceEditionState => {
    console.log(Type[msg.type], msg.payload)
    switch (msg.type) {
        case Type.UserClickedModal:
            return { ...model, modal: msg.payload }
        case Type.UserUpdatedField:
            const fieldToUpdate = msg.payload.fieldname
            return { ...model, sourceForm: { ...model.sourceForm, [fieldToUpdate]: msg.payload.newValue } }

    }

}

type SourceFormProps = {
    source?: Source,
    create?: boolean
}

const SourceForm = ({ source = defaultSource, create = false }: SourceFormProps) => {

    const { model, updateModel } = useModel()
    const unwrappedSources = SRD.unwrap([], identity, model.sources)
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles)

    const [sourceModel, update] = React.useReducer(updateSource, { modal: false, sourceForm: source })


    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true })
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false })
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } })

    const saveSources = () => {

        const updateSources = unwrappedSources.map(p => p.name === source.name ? sourceModel.sourceForm : p)
        const addSources = [...unwrappedSources, sourceModel.sourceForm]
        updateModel({ type: 'UserClickedSaveChanges', payload: {} });
        putSources(create ? addSources : updateSources)
            .then((person) => updateModel({ type: 'ServerRespondedWithSources', payload: success(person) }))
            .then(() => update({ type: Type.UserClickedModal, payload: false }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithSources', payload: failure(err.msg) }));
    };





    return (<>
        <Button variant='outlined' onClick={handleOpen}>{create ? "Create User" : "Edit"}</Button>
        <Modal onClose={handleClose} open={sourceModel.modal}>
            <Box sx={style}>
                <Stack>
                    <TextField fullWidth onChange={handleFieldUpdate("name")}

                        value={sourceModel.sourceForm.name}
                        id={`name`}
                        label={"Name"}
                        variant="standard" />

                    <Button variant="contained" onClick={saveSources}>Save Profile</Button>

                </Stack>
            </Box>
        </Modal></>)
}

export default SourcesTable
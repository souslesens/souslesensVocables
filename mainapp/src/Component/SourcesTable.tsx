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

        const updatedSources = unwrappedSources.filter(prevSources => prevSources.name !== source.name);
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
                        <Box id="table-container" sx={{ justifyContent: 'center', display: 'flex', overflowX: 'hidden', overflowY: 'auto', height: '400' }}>
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
                                                {//source.graphUri}
                                                }
                                            </TableCell>
                                            <TableCell>

                                                <Box sx={{ display: 'flex' }}><SourceForm source={source} />
                                                    <Button color='secondary' onClick={() => deleteSource(source)}>Delete</Button>
                                                </Box>
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

const updateSource = (sourceEditionState: SourceEditionState, msg: Msg_): SourceEditionState => {
    console.log(Type[msg.type], msg.payload)
    const { model } = useModel()
    const unwrappedSources = SRD.unwrap([], identity, model.sources)

    switch (msg.type) {

        case Type.UserClickedModal:
            const getUnmodifiedSource = unwrappedSources.reduce((acc, value) => sourceEditionState.sourceForm.id === value.id ? value : acc, defaultSource)
            const resetSourceForm = msg.payload ? sourceEditionState.sourceForm : getUnmodifiedSource

            return { ...sourceEditionState, modal: msg.payload, sourceForm: msg.payload ? sourceEditionState.sourceForm : resetSourceForm }

        case Type.UserUpdatedField:
            const fieldToUpdate = msg.payload.fieldname

            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, [fieldToUpdate]: msg.payload.newValue } }

    }

}

type SourceFormProps = {
    source?: Source,
    create?: boolean
}

const SourceForm = ({ source = defaultSource, create = false }: SourceFormProps) => {

    const { model, updateModel } = useModel()
    const unwrappedSources = SRD.unwrap([], identity, model.sources)

    const [sourceModel, update] = React.useReducer(updateSource, { modal: false, sourceForm: source })


    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true })
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false })
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } })

    const saveSources = () => {

        const updateSources = unwrappedSources.map(s => s.name === source.name ? sourceModel.sourceForm : s)
        const addSources = [...unwrappedSources, sourceModel.sourceForm]
        updateModel({ type: 'UserClickedSaveChanges', payload: {} });
        putSources(create ? addSources : updateSources)
            .then((person) => updateModel({ type: 'ServerRespondedWithSources', payload: success(person) }))
            .then(() => update({ type: Type.UserClickedModal, payload: false }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithSources', payload: failure(err.msg) }));
    };

    const creationVariant = (edition: any, creation: any) => create ? creation : edition

    return (<>
        <Button color="primary" variant='contained' onClick={handleOpen}>{create ? "Create Source" : "Edit"}</Button>
        <Modal onClose={handleClose} open={sourceModel.modal}>
            <Box sx={style}>
                <Stack>
                    <TextField fullWidth onChange={handleFieldUpdate("name")}

                        value={sourceModel.sourceForm.name}
                        id={`name`}
                        label={"Name"}
                        variant="standard" />

                    <Button color="primary" variant="contained" onClick={saveSources}>Save Profile</Button>

                </Stack>
            </Box>
        </Modal></>)
}

export default SourcesTable
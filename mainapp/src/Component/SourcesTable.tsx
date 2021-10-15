import {
    Box, CircularProgress, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack
} from '@mui/material';
import { useModel } from '../Admin';
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { Source, putSources, defaultSource } from '../Source';
import { Button, FormControl, InputLabel, MenuItem, Modal, Select, TextField } from '@material-ui/core';
import { identity, style } from '../Utils';
import { ulid } from 'ulid';


const SourcesTable = () => {
    const { model, updateModel } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources)

    const deleteSource = (source: Source) => {

        const updatedSources = unwrappedSources.filter(prevSources => prevSources.id !== source.id);
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
                        <Box id="table-container" sx={{ justifyContent: 'center', height: '400', display: 'flex' }}>
                            <TableContainer sx={{ height: '400' }} component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell style={{ fontWeight: 'bold' }}>Name</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>graphUri</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody sx={{ width: '100%', overflow: 'clip' }}>{gotSources.map(source => {
                                        return (<TableRow key={source.name}>
                                            <TableCell>
                                                {source.name}
                                            </TableCell>
                                            <TableCell>
                                                {typeof source.graphUri === 'string' ? source.graphUri : source.graphUri.join(', ')}

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

const initSourceEditionState: SourceEditionState = { modal: false, sourceForm: defaultSource(ulid()) }

enum Type {
    UserClickedModal,
    UserUpdatedField,
    ResetSource
}

enum Mode { Creation, Edition }

type Msg_ =
    { type: Type.UserClickedModal, payload: boolean }
    | { type: Type.UserUpdatedField, payload: { fieldname: string, newValue: string } }
    | { type: Type.ResetSource, payload: Mode }


const updateSource = (sourceEditionState: SourceEditionState, msg: Msg_): SourceEditionState => {
    console.log(Type[msg.type], msg.payload)
    const { model } = useModel()
    const unwrappedSources = SRD.unwrap([], identity, model.sources)

    switch (msg.type) {

        case Type.UserClickedModal:
            return { ...sourceEditionState, modal: msg.payload }

        case Type.UserUpdatedField:
            const fieldToUpdate = msg.payload.fieldname

            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, [fieldToUpdate]: msg.payload.newValue } }

        case Type.ResetSource:
            switch (msg.payload) {
                case Mode.Creation:
                    console.log("resetSourceCreationMode")
                    return { ...sourceEditionState, sourceForm: defaultSource(ulid()) }
                case Mode.Edition:
                    const getUnmodifiedSources = unwrappedSources.reduce((acc, value) => sourceEditionState.sourceForm.id === value.id ? value : acc, defaultSource(ulid()))
                    const resetSourceForm = msg.payload ? sourceEditionState.sourceForm : getUnmodifiedSources

                    return { ...sourceEditionState, sourceForm: msg.payload ? sourceEditionState.sourceForm : resetSourceForm }
            }

    }

}

type SourceFormProps = {
    source?: Source,
    create?: boolean
}

const SourceForm = ({ source = defaultSource(ulid()), create = false }: SourceFormProps) => {

    const { model, updateModel } = useModel()
    const unwrappedSources = SRD.unwrap([], identity, model.sources)

    const [sourceModel, update] = React.useReducer(updateSource, { modal: false, sourceForm: source })


    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true })
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false })
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } })

    const saveSources = () => {

        const updateSources = unwrappedSources.map(s => s.name === source.name ? sourceModel.sourceForm : s)
        const addSources = [...unwrappedSources, sourceModel.sourceForm]

        putSources(create ? addSources : updateSources)
            .then((sources) => updateModel({ type: 'ServerRespondedWithSources', payload: success(sources) }))
            .then(() => update({ type: Type.UserClickedModal, payload: false }))
            .then(() => update({ type: Type.ResetSource, payload: create ? Mode.Creation : Mode.Edition }))
            .catch((err) => updateModel({ type: 'ServerRespondedWithSources', payload: failure(err.msg) }));
    };

    const creationVariant = (edition: any, creation: any) => create ? creation : edition

    return (<>
        <Button color="primary" variant='contained' onClick={handleOpen}>{create ? "Create Source" : "Edit"}</Button>
        <Modal onClose={handleClose} open={sourceModel.modal}>
            <Box sx={style}>
                <Stack spacing={4}>
                    <TextField fullWidth onChange={handleFieldUpdate("name")}

                        value={sourceModel.sourceForm.name}
                        id={`name`}
                        label={"Name"}
                        variant="standard" />

                    <Button color="primary" variant="contained" onClick={saveSources}>Save Source</Button>

                </Stack>
            </Box>
        </Modal></>)
}

export default SourcesTable
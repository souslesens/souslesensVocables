import {
    RadioGroup, Box, CircularProgress, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack, SliderValueLabel
} from '@mui/material';
import { useModel } from '../Admin';
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { Source, saveSource, putSources, defaultSource, DataSource, deleteSource } from '../Source';
import { Button, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, Grid, InputLabel, MenuItem, Modal, Radio, Select, TextField } from '@material-ui/core';
import { identity, style } from '../Utils';
import { ulid } from 'ulid';
import { ButtonWithConfirmation } from './ButtonWithConfirmation';
import Autocomplete from '@mui/material/Autocomplete';

const SourcesTable = () => {
    const { model, updateModel } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources)

    const [filteringChars, setFilteringChars] = React.useState("")
    // const deleteSource = (source: Source) => {

    //     const updatedSources = unwrappedSources.filter(prevSources => prevSources.id !== source.id);
    //     console.log("deleted")

    //     putSources(updatedSources)
    //         .then((sources) => updateModel({ type: 'ServerRespondedWithSources', payload: success(sources) }))
    //         .catch((err) => updateModel({ type: 'ServerRespondedWithSources', payload: failure(err.msg) }));

    // }

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
                        <Autocomplete
                            disablePortal
                            id="search-sources"
                            options={gotSources.map((source) => source.name)}
                            sx={{ width: 300 }}
                            onInputChange={(event, newInputValue) => {
                                setFilteringChars(newInputValue);
                            }}
                            renderInput={(params) => <TextField {...params} label="Search Sources by name" />}
                        />    <Box id="table-container" sx={{ justifyContent: 'center', height: '400px', display: 'flex' }}>
                            <TableContainer sx={{ height: '400px' }} component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell style={{ fontWeight: 'bold' }}>Name</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>graphUri</TableCell>
                                            <TableCell style={{ fontWeight: 'bold' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody sx={{ width: '100%', overflow: 'visible' }}>{
                                        gotSources
                                            .filter((source) => source.name.includes(filteringChars))
                                            .map(source => {
                                                return (<TableRow key={source.name}>
                                                    <TableCell >
                                                        {source.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {source.graphUri}

                                                    </TableCell>
                                                    <TableCell>

                                                        <Box sx={{ display: 'flex' }}><SourceForm source={source} />
                                                            <ButtonWithConfirmation label='Delete' msg={() => deleteSource(source, updateModel)} />
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

const enum Type {
    UserClickedModal,
    UserUpdatedField,
    ResetSource,
    UserAddedGraphUri,
    UserClickedCheckBox,
    UserUpdatedPredicates,
    UserClickedAddDataSource,
    UserUpdatedDataSource,
    UserUpdatedsparql_server
}

const enum Mode { Creation, Edition }

type Msg_ =
    { type: Type.UserClickedModal, payload: boolean }
    | { type: Type.UserUpdatedField, payload: { fieldname: string, newValue: string } }
    | { type: Type.ResetSource, payload: Mode }
    | { type: Type.UserAddedGraphUri, payload: string }
    | { type: Type.UserClickedCheckBox, payload: { checkboxName: string, value: boolean } }
    | { type: Type.UserUpdatedPredicates, payload: { broaderPredicate: string, lang: string } }
    | { type: Type.UserClickedAddDataSource, payload: boolean }
    | { type: Type.UserUpdatedDataSource, payload: { type: string[], table_schema: string, connection: string, dbName: string, local_dictionary: { table: string, labelColumn: string, idColumn: string } } }
    | { type: Type.UserUpdatedsparql_server, payload: { url: string, method: string, headers: string[] } }


const updateSource = (sourceEditionState: SourceEditionState, msg: Msg_): SourceEditionState => {
    const { model } = useModel()
    const unwrappedSources = SRD.unwrap([], identity, model.sources)

    switch (msg.type) {

        case Type.UserClickedModal:
            return { ...sourceEditionState, modal: msg.payload }

        case Type.UserUpdatedField:
            const fieldToUpdate = msg.payload.fieldname

            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, [fieldToUpdate]: msg.payload.newValue } }

        case Type.UserAddedGraphUri:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, graphUri: msg.payload } }

        case Type.UserClickedAddDataSource:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, dataSource: msg.payload ? { type: [], table_schema: "", connection: "", dbName: "", local_dictionary: { table: "", labelColumn: "", idColumn: "" } } : null } }

        case Type.UserClickedCheckBox:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, [msg.payload.checkboxName]: msg.payload.value } }

        case Type.UserUpdatedPredicates:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, ["predicates"]: msg.payload } }

        case Type.UserUpdatedDataSource:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, ["dataSource"]: msg.payload } }

        case Type.UserUpdatedsparql_server:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, ["sparql_server"]: msg.payload } }

        case Type.ResetSource:
            switch (msg.payload) {
                case Mode.Creation:
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
    const schemaTypes = [...new Set(unwrappedSources.map(source => source.schemaType))]

    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true })
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false })
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } })
    const _handleFieldUpdate = (event: React.ChangeEvent<HTMLInputElement>) => update({ type: Type.UserAddedGraphUri, payload: event.target.value })

    const handleSparql_serverUpdate = (fieldName: string) => (event: React.ChangeEvent<HTMLTextAreaElement>) =>
        update({
            type: Type.UserUpdatedsparql_server,
            payload: { ...sourceModel.sourceForm.sparql_server, [fieldName]: fieldName === "headers" ? event.target.value.replace(/\s+/g, '').split(',') : event.target.value }
        })
    // const saveSources = () => {

    //     const updateSources = unwrappedSources.map(s => s.name === source.name ? sourceModel.sourceForm : s)
    //     const addSources = [...unwrappedSources, sourceModel.sourceForm]

    //     putSources(create ? addSources : updateSources)
    //         .then((sources) => updateModel({ type: 'ServerRespondedWithSources', payload: success(sources) }))
    //         .then(() => update({ type: Type.UserClickedModal, payload: false }))
    //         .then(() => update({ type: Type.ResetSource, payload: create ? Mode.Creation : Mode.Edition }))
    //         .catch((err) => updateModel({ type: 'ServerRespondedWithSources', payload: failure(err.msg) }));
    // };

    const creationVariant = (edition: any, creation: any) => create ? creation : edition

    return (<>
        <Button color="primary" variant='contained' onClick={handleOpen}>{create ? "Create Source" : "Edit"}</Button>
        <Modal onClose={handleClose} open={sourceModel.modal}>
            <Box component='form' sx={style}>
                <Grid container spacing={4} >
                    <Grid item xs={6}><TextField fullWidth onChange={handleFieldUpdate("name")}

                        value={sourceModel.sourceForm.name}
                        id={`name`}
                        label={"Name"}
                        variant="standard" />
                    </Grid>
                    <Grid item xs={6}><TextField fullWidth onChange={_handleFieldUpdate}

                        value={sourceModel.sourceForm.graphUri}
                        id={`graphUris`}
                        label={"graph' Uris"}
                        variant="standard" />
                    </Grid>
                    <Grid item xs={6}><TextField fullWidth onChange={handleSparql_serverUpdate("method")}

                        value={sourceModel.sourceForm.sparql_server.method}
                        id={`sparql_server_Method`}
                        label={"Sparql server method"}
                        variant="standard" />
                    </Grid>
                    <Grid item xs={6}><TextField fullWidth onChange={handleSparql_serverUpdate("url")}

                        value={sourceModel.sourceForm.sparql_server.url}
                        id={`sparql_server_url`}
                        label={"Sparql server url"}
                        variant="standard" />
                    </Grid>
                    <Grid item xs={6}><TextField fullWidth onChange={handleSparql_serverUpdate("headers")}

                        value={sourceModel.sourceForm.sparql_server.headers}
                        id={`sparql_server_headers`}
                        label={"Sparql server headers"}
                        variant="standard" />
                    </Grid>
                    <Grid item xs={6}><TextField fullWidth onChange={handleFieldUpdate("topClassFilter")}

                        value={sourceModel.sourceForm.topClassFilter}
                        id={`topClassFilter`}
                        label={"Top Class filter"}
                        variant="standard" />
                    </Grid>

                    <Grid item xs={6}><FormControl>
                        <InputLabel id="controller">Controller</InputLabel>
                        <Select
                            labelId="controller"
                            id="controller-select"
                            value={sourceModel.sourceForm.controller}
                            label="select-controller"
                            fullWidth
                            style={{ width: '400px' }}

                            renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                            onChange={handleFieldUpdate("controller")}
                        >
                            {["Sparql_OWL", "Sparql_SKOS", "Sparql_INDIVIDUALS"].map(schemaType => <MenuItem
                                key={schemaType}
                                value={schemaType}

                            >
                                {schemaType}
                            </MenuItem>)}
                        </Select>
                    </FormControl>
                    </Grid>
                    <Grid item xs={6}><TextField fullWidth onChange={handleFieldUpdate("group")}

                        value={sourceModel.sourceForm.group}
                        id={`group`}
                        label={"Group"}
                        variant="standard" />
                    </Grid>

                    <Grid item xs={6}><FormControl>
                        <InputLabel id="imports-label">Imports</InputLabel>
                        <Select
                            labelId="imports-label"
                            id="imports"
                            value={sourceModel.sourceForm.imports}
                            label="imports-label"
                            fullWidth
                            multiple
                            style={{ width: '400px' }}

                            renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                            onChange={handleFieldUpdate("imports")}
                        >
                            {unwrappedSources.map(source => <MenuItem
                                key={source.name}
                                value={source.name}

                            >
                                {source.name}
                            </MenuItem>)}
                        </Select>
                    </FormControl>
                    </Grid>
                    <Grid item xs={6}><FormControl>
                        <InputLabel id="schemaType-label">Schema's Type</InputLabel>
                        <Select
                            labelId="schemaType-label"
                            id="schemaType"
                            value={sourceModel.sourceForm.schemaType}
                            label="select-schemaTyoe-label"
                            fullWidth
                            style={{ width: '400px' }}

                            renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                            onChange={handleFieldUpdate("schemaType")}
                        >
                            {schemaTypes.map(schemaType => <MenuItem
                                key={schemaType}
                                value={schemaType}

                            >
                                {schemaType}
                            </MenuItem>)}
                        </Select>
                    </FormControl>
                    </Grid>
                    <FormGivenSchemaType update={update} model={sourceModel} />



                    <Grid item xs={12} style={{ textAlign: 'center' }}><Button color="primary" variant="contained" onClick={(() => saveSource(sourceModel.sourceForm, create ? Mode.Creation : Mode.Edition, updateModel, update))}>Save Source</Button></Grid>
                </Grid>


            </Box>
        </Modal></>)
}

const FormGivenSchemaType = (props: { model: SourceEditionState, update: React.Dispatch<Msg_> }) => {
    const handleCheckbox = (checkboxName: string) => (event: React.ChangeEvent<HTMLInputElement>) => props.update({ type: Type.UserClickedCheckBox, payload: { checkboxName: checkboxName, value: event.target.checked } })
    const handlePredicateUpdate = (fieldName: string) => (event: React.ChangeEvent<HTMLTextAreaElement>) => props.update({ type: Type.UserUpdatedPredicates, payload: { ...props.model.sourceForm.predicates, [fieldName]: event.target.value } })
    const handleDataSourceUpdate = (fieldName: string) => (event: React.ChangeEvent<HTMLTextAreaElement>) => props.update({ type: Type.UserUpdatedDataSource, payload: props.model.sourceForm.dataSource ? { ...props.model.sourceForm.dataSource, [fieldName]: event.target.value } : { type: [], table_schema: "string", connection: "string", dbName: "string", local_dictionary: { table: "string", labelColumn: "string", idColumn: "string" } } })

    const handleAddDataSource = (event: React.ChangeEvent<HTMLInputElement>) => props.update({ type: Type.UserClickedAddDataSource, payload: event.target.checked })
    const dataSource = props.model.sourceForm.dataSource

    switch (props.model.sourceForm.schemaType) {
        case "SKOS":
            return (<>
                <Grid item xs={3}><FormControlLabel control={<Checkbox checked={props.model.sourceForm.editable} onChange={handleCheckbox("editable")} />} label="Is this source editable?" /></Grid>
                <Grid item xs={3}><FormControlLabel control={<Checkbox checked={props.model.sourceForm.isDraft} onChange={handleCheckbox("isDraft")} />} label="Is it a draft?" /></Grid>
                <Grid item xs={6}><TextField fullWidth onChange={handlePredicateUpdate("broaderPredicate")}
                    value={props.model.sourceForm.predicates.broaderPredicate}
                    id={`broaderPredicate`}
                    label={"Broader Predicate"}
                    variant="standard" /></Grid>
                <Grid item xs={6}><TextField fullWidth onChange={handlePredicateUpdate("lang")}
                    value={props.model.sourceForm.predicates.lang}
                    id={`predicateLang`}
                    label={"Language"}
                    variant="standard" /></Grid>
            </>)
        case "KNOWLEDGE_GRAPH":
            return ((<>
                <Grid item xs={3}><FormControlLabel control={<Checkbox checked={props.model.sourceForm.dataSource ? true : false} onChange={handleAddDataSource} />} label="Do you want to add a data source ?" /></Grid>

                <Grid item xs={6}><FormControl>
                    <InputLabel id="dataSource-type">DataSource's type</InputLabel>
                    <Select
                        labelId="dataSource-type"
                        id="dataSource"
                        value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.type : []}
                        label="Data source's type"
                        fullWidth
                        multiple
                        style={{ width: '400px' }}

                        renderValue={(selected: string | string[]) => typeof selected === 'string' ? selected : selected.join(', ')}
                        onChange={handleDataSourceUpdate("type")}
                    >
                        {["sql.sqlserver"].map(type => <MenuItem
                            key={type}
                            value={type}

                        >
                            {type}
                        </MenuItem>)}
                    </Select>
                </FormControl>
                </Grid>
                <Grid item xs={6}><TextField fullWidth onChange={handleDataSourceUpdate("connection")}
                    value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.connection : ""}
                    id={`connection`}
                    label={"Connection"}
                    variant="standard"
                    style={{ display: !dataSource ? "none" : "" }} />
                </Grid>
                <Grid item xs={6}><TextField fullWidth onChange={handleDataSourceUpdate("dbName")}
                    value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.dbName : ""}
                    id={`dbName`}
                    label={"Data Base's Name"}
                    variant="standard"
                    style={{ display: !dataSource ? "none" : "" }}
                /></Grid>
                <Grid item xs={6}><TextField fullWidth onChange={handleDataSourceUpdate("table_schema")}
                    value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.table_schema : ""}
                    id={`table_schema`}
                    label={"Table Schema"}
                    style={{ display: !dataSource ? "none" : "" }}
                    variant="standard" /></Grid>
            </>))
        default:
            return <div></div>
    }
}
export { SourcesTable, Msg_, Type, Mode }

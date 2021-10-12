import {
    Box, CircularProgress, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack
} from '@mui/material';
import { useModel } from '../Admin';
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { Source } from '../Source';

const SourcesTable = () => {
    const { model, updateModel } = useModel();
    const renderProfiles =
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
                                            <TableCell>Controller</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>{gotSources.map(source => (<TableRow key={source.name}>
                                        <TableCell>
                                            {source.name}
                                        </TableCell>
                                        <TableCell>
                                            {source.controller}
                                        </TableCell>
                                        <TableCell>
                                            <ButtonGroup>


                                            </ButtonGroup>

                                        </TableCell>

                                    </TableRow>))}</TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>

                        </Box>
                    </Stack>

                </Box>


        }, model.sources)

    return (renderProfiles)
}


export default SourcesTable
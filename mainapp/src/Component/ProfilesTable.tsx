import {
    Box, CircularProgress, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, Stack
} from '@mui/material';
import { useModel } from '../Admin';
import { User } from '../User';
import * as React from "react";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'

const ProfilesTable = () => {
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
            success: (gotUsers: User[]) =>

                <Box
                    sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <Stack>
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
                                    <TableBody>{gotUsers.map(user => (<TableRow key={user.key}>
                                        <TableCell>
                                            {user.login}
                                        </TableCell>
                                        <TableCell>
                                            {user.groups.join(', ')}
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


        }, model.users)

    return (renderProfiles)
}


export default ProfilesTable
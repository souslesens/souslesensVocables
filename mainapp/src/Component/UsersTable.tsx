import {
    accordionActionsClasses, TextField,
    Modal, Box, Tabs, Tab, Button, CircularProgress, Chip, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, dividerClasses, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, Stack
} from '@mui/material';
import { Msg, useModel } from '../Admin';
import { deleteUser, restoreUsers, User } from '../User';
import * as React from "react";
import * as ReactDOM from "react-dom";
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import CreateUser from './CreateUser';
import ViewUser from './ViewUser';

type UsersProps = {
    users: RD<string, User[]>,
}

const UsersTable: React.FC<UsersProps> = ({ users }): JSX.Element => {
    const { model, updateModel } = useModel();
    const [modal, setModal] = React.useState(false)
    const renderUsers = SRD.match({
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
                sx={{ display: 'flex', justifyContent: 'center', p: 4 }}
            >
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
                                            <ViewUser key={user.key} user={user} />
                                            <Button onClick={deleteUser(gotUsers, user, updateModel)} color="error">Delete</Button>
                                            {//<Button onClick={() => deleteUser(users, user, updateModel)} variant='contained' color='error'>Delete User</Button>
                                            }
                                        </ButtonGroup>

                                    </TableCell>

                                </TableRow>))}</TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CreateUser modal={modal} updateModel={updateModel} setModal={setModal} />
                    </Box>
                </Stack>

            </Box>


    }, model.users)


    return (renderUsers

        //<Stack spacing={2}>{users.map(el => <User key={el.key} user={el}></User>)}</Stack>

    )

}

export default UsersTable
import {
    accordionActionsClasses, TextField,
    Modal, Box, Tabs, Tab, Button, CircularProgress, Chip, ButtonGroup, Table, TableBody, TableCell, Paper, TableContainer, TableHead, TableRow, dividerClasses, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, Stack
} from '@mui/material';
import { Msg, useModel } from '../Admin';
import { restoreUsers, User } from '../User';
import * as React from "react";
import * as ReactDOM from "react-dom";

type UserFormProps = {
    modal: boolean,
    updateModel: React.Dispatch<Msg>,
    setModal: React.Dispatch<React.SetStateAction<boolean>>,
    setNewUser: React.Dispatch<React.SetStateAction<User>>,
    user: User,
    profiles: string[],
    saveUser: () => void,
    deletedUser: () => void
}
const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800,
    height: 500,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,

};

const UserForm: React.FC<UserFormProps> = ({ modal, setModal, setNewUser, user, profiles, saveUser, deletedUser }) => {
    const { updateModel } = useModel();
    return <Modal open={modal}
        onClose={restoreUsers(updateModel, setModal)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description">
        <Box sx={style}>
            <Stack spacing={4}>
                <h2>{`Edit ${user.login}`}</h2>
                <TextField fullWidth onChange={(event) => setNewUser({ ...user, login: event.target.value })}

                    value={user.login}
                    id={`id-login-${user.key}`}
                    label={"login"}
                    variant="standard" />

                <TextField fullWidth onChange={(event) => setNewUser({ ...user, password: event.target.value })}
                    value={user.password}
                    id={`id-password-${user.key}`}
                    label={"password"}
                    variant="standard" />
                <FormControl>
                    <InputLabel id="select-groups-label">Groups</InputLabel>
                    <Select
                        labelId="select-groups-label"
                        id="select-groups"
                        multiple
                        value={user.groups}
                        defaultValue={user.groups}
                        label="select-groups-label"
                        fullWidth
                        renderValue={(selected) => typeof selected === 'string' ? selected : selected.join(', ')}
                        onChange={(event) => setNewUser({ ...user, groups: sanitizeValue(event.target.value) })}
                    >
                        {profiles.map(profile => <MenuItem
                            key={profile}
                            value={profile}

                        >
                            {profile}
                        </MenuItem>)}
                    </Select>
                </FormControl>




                <Button onClick={saveUser} variant="contained">Save changes</Button>
                <Button onClick={deletedUser} variant="contained" color="error">Delete User</Button>

            </Stack>
        </Box>
    </Modal >;
}

function sanitizeValue(value: string | string[]): string[] {
    return (typeof value === 'string' ? value.split(',') : value);
}

export default UserForm
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Button, dividerClasses } from '@mui/material';
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { User, getUsers } from './User'
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

//type Dispatcher = 'UserClickedOpenModale' | 


const Admin = () => {
    const [users, setUser] = React.useState<RD<string, User[]>>(notAsked())

    React.useEffect(() => {
        setUser(loading())
        getUsers('/users')
            .then((person) => setUser(success(person)))
            .catch((err) => setUser(failure(err.msg)))
    }, [])

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    return <>
        {SRD.match({
            notAsked: () => 'Nothing asked',
            loading: () => 'Loading...',
            failure: (msg) => `Il y a un problème: ${msg}`,
            success: gotUsers =>
                <div>
                    <ul>{gotUsers.map(el =>
                        < li > <Button onClick={handleOpen}>{el.login}</Button> <Modal
                            open={open}
                            onClose={handleClose}
                            aria-labelledby="modal-modal-title"
                            aria-describedby="modal-modal-description"
                        >
                            <Box component="form"
                                sx={style}
                                noValidate
                                autoComplete="off">
                                <TextField defaultValue={el.login} id="standard-basic" label="Login" variant="standard" />
                                <TextField defaultValue={el.password} id="standard-basic" label="Login" variant="standard" />
                                <Button onClick={handleOpen} variant="contained">Save changes</Button>
                            </Box>
                        </Modal> </li>)}
                    </ul>

                </div>
        }, users)}
    </>
}


export default Admin


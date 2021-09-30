import * as React from "react";
import * as ReactDOM from "react-dom";
import { Button, dividerClasses } from '@mui/material';
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { User, getUsers } from './User'


const Admin = () => {
    const [user, setUser] = React.useState<RD<string, User[]>>(notAsked())

    React.useEffect(() => {
        setUser(loading())
        getUsers('/users')
            .then((person) => setUser(success(person)))
            .catch((err) => setUser(failure(err.msg)))
    }, [])
    console.log(user)

    return <>
        {SRD.match({
            notAsked: () => 'Nothing asked',
            loading: () => 'Loading...',
            failure: (msg) => `Il y a un problème: ${msg}`,
            success: user => `${user.map(el => el.login)}`
        }, user)}
    </>
}

export default Admin


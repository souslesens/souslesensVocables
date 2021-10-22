
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import Admin from "./Admin";
import { User, getUsers } from './User';


ReactDOM.render(<Admin />, document.getElementById("mount-app-here"));


import * as React from "react";
declare type AppProps = {
    users: User[];
};
declare type User = {
    key: string;
    login: string;
    password: string;
    groups: [Group];
};
declare type Group = 'admin' | 'regular';
declare const App: React.FC<AppProps>;
export default App;

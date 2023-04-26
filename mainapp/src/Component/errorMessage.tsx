import * as React from "react";
import { ErrorGetter } from "react-zorm/dist/types";

export function errorMessage(zormError: ErrorGetter): React.ReactNode {
    return zormError((e) => <p style={{ color: "red" }}>{e.message}</p>);
}

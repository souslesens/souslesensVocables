import { ReactNode } from "react";

export function errorMessage(zormError: (f: (e: { message: string }) => ReactNode) => ReactNode): ReactNode {
    return zormError((e) => <p style={{ color: "red" }}>{e.message}</p>);
}

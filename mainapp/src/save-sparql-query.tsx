import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";

import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import Yasgui from "@triply/yasgui";

declare global {
    interface Window {
        SPARQL_endpoint: {
            createSaveQueryApp: (sparqlServerUrl: string) => void;
        };
    }
}

type Props = {
    sparqlServerUrl: string;
};

export default function SaveSparqlQueryFormApp({ sparqlServerUrl }: Props) {
    const [open, setOpen] = useState(false);

    const toggleOpen = () => {
        setOpen(!open);
    };

    useEffect(() => {
        const htmlElem = document.getElementById("yasgui");
        if (htmlElem !== null) {
            new Yasgui(htmlElem, {
                ...Yasgui.defaults,
                requestConfig: {
                    endpoint: `/api/v1/yasguiQuery?url=${sparqlServerUrl}&method=POST&t=${new Date().getTime()}`,
                },
                copyEndpointOnNewTab: false,
            });
        }
    }, []);

    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 400,
        bgcolor: "background.paper",
        borderRadius: "5px",
        boxShadow: 24,
        pt: 2,
        px: 4,
        pb: 3,
    };

    return (
        <>
            <Button variant="outlined" onClick={toggleOpen}>
                Save Query
            </Button>
            <div id="yasgui"></div>
            <Modal open={open} onClose={toggleOpen}>
                <Box sx={style}>
                    <Typography id="save-query-modal-title" variant="h6" component="h2">
                        Save SPARQL query into a userData
                    </Typography>
                    <Typography id="save-query-modal-description" sx={{ mt: 2 }}>
                        Duis mollis, est non commodo luctus, nisi erat porttitor ligula.
                    </Typography>
                </Box>
            </Modal>
        </>
    );
}

window.SPARQL_endpoint.createSaveQueryApp = function createApp(sparqlServerUrl: string) {
    const container = document.getElementById("mount-save-sparql-query-app-here");
    const root = createRoot(container!);
    root.render(<SaveSparqlQueryFormApp sparqlServerUrl={sparqlServerUrl} />);
    return root.unmount.bind(root);
};

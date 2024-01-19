import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";

import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Stack from "react-bootstrap/Stack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";


interface UploadFormData {
    displayForm: "database" | "file" | "";
    currentSource: string;
    selectedDatabase: string;
    selectedFiles: string[];
    
}

declare global {
    interface Window {
        CreateSLSVsource_bot: {
            createDataBaseSourceMappings: () => void;
            createCsvSourceMappings: () => void;
            uploadFormData: UploadFormData;
            createApp: (uploadFormData: UploadFormData) => void;
            
        };
    }
}

export default function App(uploadFormData: UploadFormData) {
  
   
    // Use Graph Management variables necessary in Uploading module
    const [currentOperation, setCurrentOperation] = useState<string | null>(null);
    const [replaceGraph, setReplaceGraph] = useState<boolean>(true);
    const [uploadfile, setUploadFile] = useState<File[]>([]);

    useEffect(() => {
       
    }, []);

    const handleReplaceGraphCheckbox = async (event: React.MouseEvent<HTMLInputElement>) => {
        setReplaceGraph(event.currentTarget.value == "false");
    };
    const uploadFileHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUploadStatus("");
        if (event.currentTarget.files === null) {
            return;
        }
        const filesList = Array.from(event.currentTarget.files);
        setFiles(filesList);
    };

    const handleFileChange = async (event: React.FormEvent) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append("path", uploadFormData.currentSource);
        files.forEach((file) => {
            formData.append(file.name, file);
        });
        window.CreateSLSVsource_bot.uploadFormData.files=formData;

        /*
        const response = await fetch("/api/v1/upload", { method: "POST", body: formData });
        if (response.status === 201) {
            setUploadStatus("success");
            // reload
            window.CreateSLSVsource_bot.uploadFormData.selectedFiles = files.map((file) => file.name);
           
        } else {
            setUploadStatus("error");
            // todo: display error message
        }
        */
    };

   

    if (window.CreateSLSVsource_bot.uploadFormData.displayForm == "file") {
        return (
            
                <Form>
                    <Stack>
                        <Form.Group controlId="formUploadGraph" className="mb-2">
                            <Form.Label>Choose RDF graph to upload</Form.Label>
                            <Form.Control onChange={handleFileChange} required={true} type="file" disabled={currentOperation == "upload"} />
                        </Form.Group>
                        <Form.Check checked={replaceGraph} value={replaceGraph} onClick={handleReplaceGraphCheckbox} className="mb-3" type="switch" id="toto" label="Delete before upload" />
                        <Stack direction="horizontal" gap={1}>
                            {!currentOperation ? (
                                <Button disabled={uploadfile.length < 1 ? true : false} type="submit" onClick={handleUploadGraph} style={{ flex: 1 }}>
                                    Upload
                                </Button>
                            ) : null}
                            {currentOperation == "upload" ? (
                                <ProgressBar
                                    animated={animatedProgressBar}
                                    label={transferPercent == 100 ? (!error ? "Completed" : "") : animatedProgressBar ? "Uploading to triplestore" : ""}
                                    style={{ flex: 1, display: "flex", height: "3.1em", transition: "none" }}
                                    id={`progress-toto`}
                                    now={transferPercent}
                                />
                            ) : null}
                            {currentOperation == "upload" ? (
                                <Button variant="danger" onClick={handleCancelOperation} disabled={transferPercent == 100}>
                                    Cancel
                                </Button>
                            ) : null}
                        </Stack>
                    </Stack>
                </Form>
            
        );
    }
    return <></>;
}

window.CreateSLSVsource_bot.createApp = function createApp(uploadFormData: UploadFormData) {
    const container = document.getElementById("mount-upload-here");
    const root = createRoot(container!);
    root.render(<App {...uploadFormData} />);
    return root.unmount.bind(root);
};

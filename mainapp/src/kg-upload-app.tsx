import * as React from "react";
import * as ReactDOM from "react-dom";
import { useState } from "react";

import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
// import Row from 'react-bootstrap/Row';
// import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import ProgressBar from 'react-bootstrap/ProgressBar';

export default function App() {

  const [files, setFiles] = useState(Array())
  const [filesName, setFilesName] = useState(Array())
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const uploadFileHandler = (event:any) => {
    setUploadSuccess(false)
    const filesList = Array.from(event.target.files)
    const filesNameList = filesList.map((file:any) => {
        return file.name
    })
    setFilesName(filesNameList)
    setFiles(filesList)
  }

  const fileSubmitHandler = (event: any) => {
    event.preventDefault()
    const formData = new FormData()
    files.forEach((file:any) => {
        formData.append('files', file)
    })

    fetch("/api/v1/upload", {method: "POST", body: formData}).then(async response => {
        console.log(response)
        setUploadSuccess(true)
    })
  }

  const browseForm = (
    <Form.Group controlId="formFileMultiple" className="mb-3">
      <Form.Control name="files" type="file" multiple accept=".csv,.tsv" onChange={uploadFileHandler}/>
      <Form.Text color="muted">
        <p>Supported files: CSV/TSV. Maximum file size is 4GB</p>
      </Form.Text>
    </Form.Group>
  )

  const progressBars = files.map(file => {
    return (
      <div className="mb-1">
        <div className="text-center">{file.name}</div>
        <ProgressBar now={uploadSuccess ? 100 : 0} label={`${uploadSuccess ? 100 : 0}%`} />
      </div>
    )
  })

  const uploadButton = (
    <div className="mb-3">
        <Button variant="primary" onClick={fileSubmitHandler}>
          Upload {files.length} {files.length === 1 ? "file" : "files"}
        </Button>
    </div>
  )


  return (
    <Container>
      {browseForm}
      <div className="mb-3">{progressBars}</div>
      {files.length > 0 ? uploadButton : null}
    </Container>
  )
}



ReactDOM.render(<App />, document.getElementById("mount-kg-upload-app-here"));

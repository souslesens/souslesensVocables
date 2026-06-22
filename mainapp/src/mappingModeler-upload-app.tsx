import { createUploadApp } from "./upload-app-common";

interface Database {
    id?: string;
    name: string;
}

interface UploadFormData {
    displayForm: "database" | "file" | "";
    currentSource: string;
    selectedDatabase: Database;
    selectedFiles: string[];
}

declare global {
    interface Window {
        DataSourceManager: {
            uploadFormData: UploadFormData;
            createDataBaseSourceMappings: () => void;
            createCsvSourceMappings: () => void;
            createApp: (uploadFormData?: UploadFormData) => void;
        };
    }
}

createUploadApp({
    namespaceObject: window.DataSourceManager,
    containerId: "mount-mappingModeler-upload-app-here",
    databaseConfig: {
        valueKey: "database",
        databaseValueType: "object",
    },
});

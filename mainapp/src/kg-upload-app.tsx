import { createUploadApp } from "./upload-app-common";

interface UploadFormData {
    displayForm: "database" | "file" | "";
    currentSource: string;
    selectedDatabase: string;
    selectedFiles: string[];
}

declare global {
    interface Window {
        KGcreator: {
            createDataBaseSourceMappings: () => void;
            createCsvSourceMappings: () => void;
            uploadFormData: UploadFormData;
            createApp: (uploadFormData?: UploadFormData) => void;
        };
    }
}

createUploadApp({
    namespaceObject: window.KGcreator,
    containerId: "mount-kg-upload-app-here",
    databaseConfig: {
        valueKey: "id",
        databaseValueType: "string",
    },
});

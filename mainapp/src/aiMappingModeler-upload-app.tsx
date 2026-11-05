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
        AIDataSourceManager: {
            uploadFormData: UploadFormData;
            createDataBaseSourceMappings: () => void;
            createCsvSourceMappings: () => void;
            createApp: (uploadFormData?: UploadFormData) => void;
        };
    }
}

createUploadApp({
    namespaceObject: window.AIDataSourceManager,
    containerId: "mount-aiMappingModeler-upload-app-here",
    databaseConfig: {
        valueKey: "database",
        databaseValueType: "object",
    },
});

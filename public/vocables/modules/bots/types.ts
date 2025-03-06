/**
 * Bot module interface defining the structure of a bot module
 */
export interface BotModule {
    title: string;
    functions: {
        [key: string]: Function | undefined;
        _DEFAULT?: Function;
    };
    functionTitles?: {
        [key: string]: string;
    };
    params: {
        [key: string]: any;
        queryText?: string;
    };
    callbackFn?: () => void;
    start: (...args: any[]) => void;
}

/**
 * Workflow object interface defining the structure of bot workflows
 */
export interface WorkflowObject {
    [key: string]: any;
    _OR?: {
        [key: string]: WorkflowObject | undefined;
        _DEFAULT?: WorkflowObject;
    };
}

/**
 * Bot options interface for initialization
 */
export interface BotOptions {
    divId?: string;
    [key: string]: any;
}

/**
 * Variable filling interface for tracking filled variables
 */
export interface VarFilling {
    VarFilled: string;
    valueFilled: any;
}

/**
 * Bot history interface for tracking workflow state
 */
export interface BotHistory {
    workflowObjects: WorkflowObject[];
    returnValues: any[];
    VarFilling: {
        [key: string]: VarFilling;
    };
    currentIndex: number;
    step: number[];
}

/**
 * Display options interface for HTML output
 */
export interface DisplayOptions {
    question?: boolean;
    [key: string]: any;
}

/**
 * List item interface for selection lists
 */
export interface ListItem {
    id: string;
    label: string;
}

/**
 * Alternative options interface for workflow branches
 */
export interface Alternatives {
    [key: string]: WorkflowObject | undefined;
    _DEFAULT?: WorkflowObject;
} 
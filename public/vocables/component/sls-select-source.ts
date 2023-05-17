import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import "jstree";

class SelectSource extends LitElement {
    @property({ type: Object })
    jsTreeOptions = {};

    createRenderRoot() {
        return this;
    }
    constructor() {
        super();

        this.addEventListener("onOk", (e) => {
            const selectedNodes = e.detail.selectedNodes;
            Lineage_sources.loadSources(selectedNodes);
        });
    }

    firstUpdated() {
        SourceSelectorWidget.loadSourcesTreeDiv("sourceSelector_jstreeDiv", this.jsTreeOptions);
    }
    onOk() {
        const selectedNodes = $("#sourceSelector_jstreeDiv").jstree("get_checked", true);
        // Dispatching the custom event `onOk` with the selected nodes detail
        this.dispatchEvent(
            new CustomEvent("onOk", {
                detail: { selectedNodes },
            })
        );
        $("#sourceSelector").closest(".ui-dialog-content").dialog("close");
    }
    onClose() {
        $("#sourceSelector").closest(".ui-dialog-content").dialog("close");
    }

    render() {
        // this.addEventListener("onOk" as keyof HTMLElementEventMap, (event: OnOkEvent) => {
        //     const selectedNodes = event.detail.selectedNodes;
        //     console.log("ok was clicked", selectedNodes);
        // });
        return html`<div id="sourceSelector" style="margin-bottom: 10px; width: auto; min-height: 0px; max-height: none; height: 680px">
            <div class="sourceSelector_buttons">
                <sls-button @click="${this.onClose}">Cancel</sls-button>
                <sls-button @click="${this.onOk}" id="sourceSelector_validateButton">OK</sls-button>
            </div>
            <div>Search : <input id="sourceSelector_searchInput" value="" style="width: 200px; font-size: 12px; margin: 3px; padding: 3px" /></div>

            <div id="sourceSelector_jstreeDiv"></div>
        </div>`;
    }
}

customElements.define("sls-select-source", SelectSource);

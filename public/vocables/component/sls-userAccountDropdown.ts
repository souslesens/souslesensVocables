import { html, component } from "haunted";
import { useStore } from "@nanostores/preact";
import { $currentUser } from "../store/user";

function SlsUserAccountDropdown() {
    const { data, loading } = useStore($currentUser);
    return html` <a class="btn btn-sm py-0 btn-outline-primary dropdown-toggle" href="#" role="button" id="dropdownMenuLink" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fas fa-user"></i><span>${loading ? "..." : data?.user.login}</span>
        </a>

        <ul id="user-account-dropdown" class="dropdown-menu" aria-labelledby="dropdownMenuLink">
            <li id="manage-account-li"><a id="manage-account" class="dropdown-item" href="#">Manage account</a></li>
            <li>
                <button id="logout-sls-button" onclick="authentication.logout()" class="dropdown-item">Logout</button>
            </li>
        </ul>`;
}
customElements.define("sls-user-account-dropdown", component(SlsUserAccountDropdown, { useShadowDOM: false }));

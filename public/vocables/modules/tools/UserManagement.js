const UserManagement = (() => {
    const self = {};
    self.createApp = null;
    self.mountApp = null;
    import("/assets/user_management.js");

    self.onSourceSelect = () => {};

    self.onLoaded = () => {
        $("#accordion").accordion("option", { active: 2 });

        setTimeout(() => {
            $("#mainDialogDiv").on("dialogclose", (event, ui) => self.unload());
            $("#mainDialogDiv").html(`<div style="width:90vw;height:80vh"><div id="mount-user-management-here"></div></div>`);
            UI.openDialog("mainDialogDiv", {title: "User Management"});

            self.mountApp = self.createApp();
        }, 200);
    };

    self.unload = () => self.mountApp();

    return self;
})();

export default UserManagement;

window.UserManagement = UserManagement;

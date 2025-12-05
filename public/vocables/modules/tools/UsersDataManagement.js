const UsersDataManagement = (function () {
    const self = {};
    self.onSourceSelect = function () {};
    self.createApp = null;
    self.umountUsersDataManagementApp = null;
    import("/assets/users_data_management.js");
    self.unload = function () {
        self.umountUsersDataManagementApp();
    };
    self.onLoaded = function () {
        $("#accordion").accordion("option", { active: 2 });

        setTimeout(function () {
            $("#mainDialogDiv").on("dialogclose", function (event, ui) {
                self.umountUsersDataManagementApp();
            });

            //$("#mainDialogDiv").parent().css("left", "100px");

            $("#mainDialogDiv").html("");
            $("#mainDialogDiv").html(`
                    <div style="width:90vw;height: 90vh"><div id="mount-users-data-management-here"></div></div>
            `);
            UI.openDialog("mainDialogDiv", { title: "Users Data Management" });
            self.umountUsersDataManagementApp = self.createApp();
        }, 200);
    };

    return self;
})();

export default UsersDataManagement;

window.UsersDataManagement = UsersDataManagement;

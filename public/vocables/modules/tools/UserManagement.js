const UserManagement = (function () {
    const self = {};
    import("/assets/user_management.js");
    self.onSourceSelect = function () {};

    self.onLoaded = function () {
        $("#accordion").accordion("option", { active: 2 });
        setTimeout(function () {
            $("#graphDiv").html("");
            $("#graphDiv").html(`
                    <div id="mount-user-management-here"></div>
                `);

        }, 200);
    };

    return self;
})();

export default UserManagement;

window.UserManagement = UserManagement;

var ShareUserData_bot = (function () {
    var self = {};

    self.start = function (workflow, _params, callbackFn) {
        self.title = _params.title || "Share";
        var startParams = _botEngine.fillStartParams(arguments);

        if (!workflow) {
            workflow = self.workflow;
        }
        self.params = { profiles: [], users: [] };
        self.profiles = null;
        self.users = null;
        _botEngine.init(ShareUserData_bot, workflow, null, function () {
            _botEngine.startParams = startParams;
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            if (!self.params?.userData?.id) {
                UI.message("no id on user data");
                return _botEngine.end();
            }
            UserDataWidget.loadUserDatabyId(parseInt(self.params.userData.id), function (err, result) {
                if (err) {
                    return callbackFn(err);
                }

                self.params.userData.data = result;
                _botEngine.nextStep();
            });
        });
    };

    self.workflow = {
        startFn: {
            _OR: {
                "Share with profile": { chooseProfileFn: { afterChooseProfileFn: self.workflowChooseProfile } },
                "Share with user": { chooseUserFn: { afterChooseUserFn: self.workflowChooseUser } },
                "Remove shared profiles": { removeSharedProfilesFn: { afterRemoveSharedProfilesFn: self.workflowRemoveSharedProfiles } },
                "Remove shared users": { removeSharedUsersFn: { afterRemoveSharedUsersFn: self.workflowRemoveSharedUsers } },
            },
        },
    };

    self.workflowChooseProfile = {
        _OR: {
            "Share with other profile": { chooseProfileFn: { afterChooseProfileFn: self.workflowChooseProfile } },
            end: { setSharedProfilesFn: {} },
        },
    };
    self.workflowChooseUser = {
        _OR: {
            "Share with other user": { chooseUserFn: { afterChooseUserFn: self.workflowChooseUser } },
            end: { setSharedUsersFn: {} },
        },
    };
    self.workflowRemoveSharedProfiles = {
        _OR: {
            "Remove other profile": { removeSharedProfilesFn: { afterRemoveSharedProfilesFn: self.workflowRemoveSharedProfiles } },
            end: { setSharedProfilesFn: {} },
        },
    };
    self.workflowRemoveSharedUsers = {
        _OR: {
            "Remove other user": { removeSharedUsersFn: { afterRemoveSharedUsersFn: self.workflowRemoveSharedUsers } },
            end: { setSharedUsersFn: {} },
        },
    };

    self.functionTitles = {
        startFn: "Start bot ",
        chooseProfile: "Choose a profile to share with",
        chooseUser: "Choose a user to share with",
    };

    self.functions = {
        startFn: function () {
            _botEngine.nextStep();
        },
        chooseProfileFn: function () {
            if (self.profiles) {
                //update profile list don't show already choosen profiles
                self.profiles = self.profiles.filter(function (profil) {
                    return !self.params.profiles.includes(profil);
                });
                if (self.profiles.length == 0) {
                    UI.message("No profiles available to share with");
                    return _botEngine.previousStep();
                }
                return _botEngine.showList(self.profiles, "profiles");
            }
            $.ajax({
                url: `${Config.apiUrl}/profiles`,
                type: "GET",
                dataType: "json",
                success: function (data) {
                    var profiles = data?.resources;
                    if (profiles && Object.keys(profiles).length > 0) {
                        self.profiles = Object.keys(profiles);

                        if (!self.profiles.includes("_all")) {
                            self.profiles.push("_all");
                        }
                        self.profiles = self.profiles.filter(function (profil) {
                            return !self.params.userData.data.shared_profiles.includes(profil);
                        });

                        return _botEngine.showList(self.profiles, "profiles");
                    } else {
                        UI.message("No profiles available to share with");
                        return _botEngine.previousStep();
                    }
                },
                error: function (xhr, status, error) {
                    UI.message("Error fetching profiles: " + error);
                    return _botEngine.end();
                },
            });
        },

        chooseUserFn: function () {
            if (self.users) {
                //update user list don't show already choosen users
                self.users = self.users.filter(function (user) {
                    return !self.params.users.includes(user);
                });
                return _botEngine.showList(self.users, "users");
            }
            $.ajax({
                url: `${Config.apiUrl}/users`,
                type: "GET",
                dataType: "json",
                success: function (data) {
                    var usersResult = Object.values(data?.resources);
                    var users = usersResult.map((user) => Object.keys(user)[0]);
                    if (users && Object.keys(users).length > 0) {
                        self.users = users;
                        if (!self.users.includes("_all")) {
                            self.users.push("_all");
                        }
                        self.users = self.users.filter(function (user) {
                            return !self.params.userData.data.shared_users.includes(user);
                        });
                        return _botEngine.showList(self.users, "users");
                    } else {
                        UI.message("No users available to share with");
                        return _botEngine.previousStep();
                    }
                },
                error: function (xhr, status, error) {
                    UI.message("Error fetching users: " + error);
                    return _botEngine.end();
                },
            });
        },

        setSharedProfilesFn: function () {
            if (self.params.profiles) {
                if (self.params.userData && self.params.userData.id) {
                    // patch user data with shared profiles
                    if (self.params.profiles.includes("_all")) {
                        self.params.userData.data.shared_profiles = self.profiles;
                    } else {
                        self.params.userData.data.shared_profiles = self.params.profiles.concat(self.params.userData.data.shared_profiles || []);
                        self.params.userData.data.shared_profiles = common.removeDuplicatesFromArray(self.params.userData.data.shared_profiles);
                    }
                    UserDataWidget.currentTreeNode = self.params.userData;
                    UserDataWidget.saveMetadata(
                        self.params.userData.data.data_label,
                        self.params.userData.data.data_type,
                        self.params.userData.data.data_content,
                        self.params.userData.data.data_group,
                        function () {
                            UI.message("User data shared with profiles: " + self.params.profiles.join(", "));
                            _botEngine.end();
                        },
                    );
                }
            }
            _botEngine.end();
        },
        setSharedUsersFn: function () {
            if (self.params.users) {
                if (self.params.userData && self.params.userData.id) {
                    // patch user data with shared users
                    if (self.params.users.includes("_all")) {
                        self.params.userData.data.shared_users = self.users;
                    } else {
                        self.params.userData.data.shared_users = self.params.users.concat(self.params.userData.data.shared_users || []);
                        self.params.userData.data.shared_users = common.removeDuplicatesFromArray(self.params.userData.data.shared_users);
                    }
                    UserDataWidget.currentTreeNode = self.params.userData;
                    UserDataWidget.saveMetadata(
                        self.params.userData.data.data_label,
                        self.params.userData.data.data_type,
                        self.params.userData.data.data_content,
                        self.params.userData.data.data_group,
                        function () {
                            UI.message("User data shared with users: " + self.params.users.join(", "));
                            _botEngine.end();
                        },
                    );
                }
            }
            _botEngine.end();
        },
        removeSharedProfilesFn: function () {
            if (self.params.userData.data?.shared_profiles?.length > 0) {
                return _botEngine.showList(self.params.userData.data.shared_profiles, null, null, null, function (selectedValue) {
                    self.params.profiles = self.params.userData.data.shared_profiles.filter(function (profile) {
                        return profile != selectedValue;
                    });
                    self.params.userData.data.shared_profiles = self.params.userData.data.shared_profiles.filter(function (profile) {
                        return profile != selectedValue;
                    });
                    _botEngine.nextStep();
                });
            }
            UI.message("No shared profiles to remove");
        },
        removeSharedUsersFn: function () {
            if (self.params.userData.data?.shared_users?.length > 0) {
                return _botEngine.showList(self.params.userData.data.shared_users, null, null, null, function (selectedValue) {
                    self.params.users = self.params.userData.data.shared_users.filter(function (user) {
                        return user != selectedValue;
                    });
                    self.params.userData.data.shared_users = self.params.userData.data.shared_users.filter(function (user) {
                        return user != selectedValue;
                    });
                    _botEngine.nextStep();
                });
            }
            UI.message("No shared users to remove");
        },
        afterChooseProfileFn: function () {
            //_botEngine.previousStep();
            //update profiles list

            _botEngine.currentObj = self.workflowChooseProfile;
            _botEngine.nextStep(self.workflowChooseProfile);
        },

        afterChooseUserFn: function () {
            //_botEngine.previousStep();
            _botEngine.currentObj = self.workflowChooseUser;
            _botEngine.nextStep(self.workflowChooseUser);
        },
        afterRemoveSharedProfilesFn: function () {
            //_botEngine.previousStep();
            _botEngine.currentObj = self.workflowRemoveSharedProfiles;
            _botEngine.nextStep(self.workflowRemoveSharedProfiles);
        },
        afterRemoveSharedUsersFn: function () {
            //_botEngine.previousStep();
            _botEngine.currentObj = self.workflowRemoveSharedUsers;
            _botEngine.nextStep(self.workflowRemoveSharedUsers);
        },
    };
    return self;
})();

export default ShareUserData_bot;
window.ShareUserData_bot = ShareUserData_bot;

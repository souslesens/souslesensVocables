
var UserDataService = (function () {
  var self = {};
  self.cache = {
    listByType: {},
    byId: {},
  };

  /**
   * List user data by type (GET /users/data?data_type=...)
   * @param {string} dataType
   * @param {function(Error|null, Array|null)} callback
   */
  self.listByType = function (dataType, callback) {
    var url = Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(dataType);
    $.ajax({
      type: "GET",
      url: url,
      dataType: "json",
      success: function (data) {
        return callback(null, data || []);
      },
      error: function (xhr) {
        return callback(xhr);
      },
    });
  };

  /**
   * Load user data by id (GET /users/data/:id)
   * @param {number|string} id
   * @param {function(Error|null, Object|null)} callback
   */
  self.loadById = function (id, callback) {
    var url = Config.apiUrl + "/users/data/" + encodeURIComponent(id);
    $.ajax({
      type: "GET",
      url: url,
      dataType: "json",
      success: function (data) {
        return callback(null, data);
      },
      error: function (xhr) {
        return callback(xhr);
      },
    });
  };

  /**
   * Create user data (POST /users/data)
   * NOTE: endpoint payload must match backend expectations.
   * @param {Object} payload
   * @param {function(Error|null, Object|null)} callback
   */
  self.create = function (payload, callback) {

    var url = Config.apiUrl + "/users/data";

    // Debug (optional)
    // eslint-disable-next-line no-console
    console.log("UserDataService.create POST", url, payload);

    $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify(payload),
        contentType: "application/json; charset=utf-8",
        processData: false,
        dataType: "json",
        success: function (data) {
        return callback(null, data);
        },
        error: function (xhr) {
        // Debug (optional)
        // eslint-disable-next-line no-console
        console.log("UserDataService.create ERROR", xhr.status, xhr.responseText);
        return callback(xhr);
        },
    });
  };

  return self;
})();

export default UserDataService;
window.UserDataService = UserDataService;
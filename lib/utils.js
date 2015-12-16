'use strict';

var _ = require('underscore');

/*global _: false, $: false, localStorage: false, process: true,
 XMLHttpRequest: false, XDomainRequest: false, exports: false,
 require: false */
module.exports = function (ML) {
  /**
   * Contains all ML API classes and functions.
   * @name ML
   * @namespace
   *
   * Contains all ML API classes and functions.
   */

  // If jQuery or Zepto has been included, grab a reference to it.
  if (typeof($) !== "undefined") {
    ML.$ = $;
  }

  // Helpers
  // -------

  // Shared empty constructor function to aid in prototype-chain creation.
  var EmptyConstructor = function () {
  };


  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function (parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      /** @ignore */
      child = function () {
        parent.apply(this, arguments);
      };
    }

    // Inherit class (static) properties from parent.
    ML._.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    EmptyConstructor.prototype = parent.prototype;
    child.prototype = new EmptyConstructor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) {
      ML._.extend(child.prototype, protoProps);
    }

    // Add static properties to the constructor function, if supplied.
    if (staticProps) {
      ML._.extend(child, staticProps);
    }

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is
    // needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set the server for ML to talk to.
  ML.serverURL = "https://api.leap.as";

  // Check whether we are running in Node.js.
  if (typeof(process) !== "undefined" &&
    process.versions &&
    process.versions.node) {
    ML._isNode = true;
  }

  /**
   * Call this method first to set up your authentication tokens for ML.
   * You can get your keys from the Data Browser on maxleap.com.
   * @param {String} applicationId Your ML Application ID.
   * @param {String} applicationKey Your ML JavaScript Key.
   * @param {String} masterKey (optional) Your LeapCloud Master Key. (Node.js only!).
   */
  ML.initialize = function (applicationId, applicationKey, masterKey) {
    if (masterKey) {
      throw new Error("ML.initialize() was passed a Master Key, which is only " +
        "allowed from within Node.js.");
    }
    ML._initialize(applicationId, applicationKey, masterKey);
  };

  /**
   * Call this method first to set up authentication tokens for ML.
   * This method is for ML's own private use.
   * @param {String} applicationId Your ML Application ID.
   * @param {String} applicationKey Your ML Application Key
   */
  ML._initialize = function (applicationId, applicationKey, masterKey) {
    if (ML.applicationId !== undefined &&
      applicationId !== ML.applicationId &&
      applicationKey !== ML.applicationKey &&
      masterKey !== ML.masterKey) {
      console.warn('LeapCloud SDK is already initialized, please don\'t reinitialize it.');
    }
    ML.applicationId = applicationId;
    ML.applicationKey = applicationKey;
    ML.masterKey = masterKey;
    ML._useMasterKey = false;
  };


  /**
   * Call this method to set production environment variable.
   * @param {Boolean} production True is production environment,and
   *  it's true by default.
   */
  ML.setProduction = function (production) {
    if (!ML._isNullOrUndefined(production)) {
      //make sure it's a number
      production = production ? 1 : 0;
    }
    //default is 1
    ML.applicationProduction = ML._isNullOrUndefined(production) ? 1 : production;
  };

  // If we're running in node.js, allow using the master key.
  if (ML._isNode) {
    ML.initialize = ML._initialize;

    ML.Cloud = ML.Cloud || {};
    /**
     * Switches the LeapCloud SDK to using the Master key.  The Master key grants
     * priveleged access to the data in LeapCloud and can be used to bypass ACLs and
     * other restrictions that are applied to the client SDKs.
     * <p><strong><em>Available in Cloud Code and Node.js only.</em></strong>
     * </p>
     */
    ML.Cloud.useMasterKey = function () {
      ML._useMasterKey = true;
    };
  }


  /**
   *Use china maxleap API service:https://maxleap.cn
   */
  ML.useLeapCloudCN = function () {
    ML.serverURL = "https://maxleap.cn";
  };

  /**
   *Use USA maxleap API service:https://maxleap.com
   */
  ML.useLeapCloudUS = function () {
    ML.serverURL = "https://maxleap.com";
  };

  /**
   * Returns prefix for localStorage keys used by this instance of ML.
   * @param {String} path The relative suffix to append to it.
   *     null or undefined is treated as the empty string.
   * @return {String} The full key name.
   */
  ML._getMLPath = function (path) {
    if (!ML.applicationId) {
      throw "You need to call ML.initialize before using ML.";
    }
    if (!path) {
      path = "";
    }
    if (!ML._.isString(path)) {
      throw "Tried to get a localStorage path that wasn't a String.";
    }
    if (path[0] === "/") {
      path = path.substring(1);
    }
    return "ML/" + ML.applicationId + "/" + path;
  };

  /**
   * Returns the unique string for this app on this machine.
   * Gets reset when localStorage is cleared.
   */
  ML._installationId = null;
  ML._getInstallationId = function () {
    // See if it's cached in RAM.
    if (ML._installationId) {
      return ML._installationId;
    }

    // Try to get it from localStorage.
    var path = ML._getMLPath("installationId");
    ML._installationId = ML.localStorage.getItem(path);

    if (!ML._installationId || ML._installationId === "") {
      // It wasn't in localStorage, so create a new one.
      var hexOctet = function () {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      };
      ML._installationId = (
      hexOctet() + hexOctet() + "-" +
      hexOctet() + "-" +
      hexOctet() + "-" +
      hexOctet() + "-" +
      hexOctet() + hexOctet() + hexOctet());
      ML.localStorage.setItem(path, ML._installationId);
    }

    return ML._installationId;
  };

  ML._parseDate = function (iso8601) {
    var regexp = new RegExp(
      "^([0-9]{1,4})-([0-9]{1,2})-([0-9]{1,2})" + "T" +
      "([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})" +
      "(.([0-9]+))?" + "Z$");
    var match = regexp.exec(iso8601);
    if (!match) {
      return null;
    }

    var year = match[1] || 0;
    var month = (match[2] || 1) - 1;
    var day = match[3] || 0;
    var hour = match[4] || 0;
    var minute = match[5] || 0;
    var second = match[6] || 0;
    var milli = match[8] || 0;

    return new Date(Date.UTC(year, month, day, hour, minute, second, milli));
  };

  ML._ajaxIE8 = function (method, url, data) {
    var promise = new ML.Promise();
    var xdr = new XDomainRequest();
    xdr.onload = function () {
      var response;
      try {
        response = JSON.parse(xdr.responseText);
      } catch (e) {
        promise.reject(e);
      }
      if (response) {
        promise.resolve(response);
      }
    };
    xdr.onerror = xdr.ontimeout = function () {
      // Let's fake a real error message.
      var fakeResponse = {
        responseText: JSON.stringify({
          code: ML.Error.X_DOMAIN_REQUEST,
          error: "IE's XDomainRequest does not supply error info."
        })
      };
      promise.reject(xdr);
    };
    xdr.onprogress = function () {
    };
    xdr.open(method, url);
    xdr.send(data);
    return promise;
  };

  ML._useXDomainRequest = function () {
    if (typeof(XDomainRequest) !== "undefined") {
      // We're in IE 8+.
      if ('withCredentials' in new XMLHttpRequest()) {
        // We're in IE 10+.
        return false;
      }
      return true;
    }
    return false;
  };

  ML._ajax = function (method, url, data, success, error, headers) {
    var options = {
      success: success,
      error: error
    };

    if (ML._useXDomainRequest()) {
      return ML._ajaxIE8(method, url, data)._thenRunCallbacks(options);
    }

    var promise = new ML.Promise();
    var handled = false;

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (handled) {
          return;
        }
        handled = true;

        if (xhr.status >= 200 && xhr.status < 300) {
          var response;
          try {
            response = JSON.parse(xhr.responseText);
          } catch (e) {
            //对于一些请求(如delete files)，服务器不返回response，只能通过xhr.status判断请求结果
            promise.resolve(xhr.status);
          }
          if (response) {
            promise.resolve(response, xhr.status, xhr);
          }
        } else {
          promise.reject(xhr);
        }
      }
    };
    xhr.open(method, url, true);
    xhr.setRequestHeader("X-ZCloud-AppId", ML.applicationId);
    xhr.setRequestHeader("X-ZCloud-APIKey", ML.applicationKey);
    for (var key in headers) {
      xhr.setRequestHeader(key, headers[key]);
    }

    //xhr.setRequestHeader("X-LAS-Fid", "zcf-7dd01734-8272-40de-89e7-dbb199f04bf9.txt");

    if (ML._isNode) {
      // Add a special user agent just for request from node.js.
      xhr.setRequestHeader("User-Agent",
        "ML/" + ML.VERSION +
        " (NodeJS " + process.versions.node + ")");
    }
    xhr.send(data);
    return promise._thenRunCallbacks(options);
  };

  // A self-propagating extend function.
  ML._extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
  };

  /**
   * route is classes, users, login, etc.
   * objectId is null if there is no associated objectId.
   * method is the http method for the REST API.
   * dataObject is the payload as an object, or null if there is none.
   * headers is extra http headers.
   * @ignore
   */
  ML._request = function (route, className, objectId, method, dataObject, headers) {
    if (!ML.applicationId) {
      throw "You must specify your applicationId using ML.initialize";
    }

    if (!ML.applicationKey && !ML.masterKey) {
      throw "You must specify a key using ML.initialize";
    }


    if (route !== "batch" &&
      route !== "classes" &&
      route !== "files" &&
      route !== "functions" &&
      route !== "login" &&
      route !== "marketing/push/msg" &&
      route !== "search/select" &&
      route !== "requestPasswordReset" &&
      route !== "requestEmailVerify" &&
      route !== "requestPasswordResetBySmsCode" &&
      route !== "resetPasswordBySmsCode" &&
      route !== "requestMobilePhoneVerify" &&
      route !== "requestLoginSmsCode" &&
      route !== "verifyMobilePhone" &&
      route !== "requestSmsCode" &&
      route !== "verifySmsCode" &&
      route !== "users" &&
      route !== 'updatePassword' &&
      route !== "usersByMobilePhone" &&
      route !== "cloudQuery" &&
      route !== "qiniu" &&
      route !== "statuses" &&
      route !== "bigquery" &&
      route !== 'search/select' &&
      route !== 'subscribe/statuses/count' &&
      route !== 'subscribe/statuses' && !(/users\/[^\/]+\/updatePassword/.test(route)) && !(/users\/[^\/]+\/friendship\/[^\/]+/.test(route))) {
      throw "Bad route: '" + route + "'.";
    }



    var url = ML.serverURL;
    if (url.charAt(url.length - 1) !== "/") {
      url += "/";
    }
    url += "2.0/" + route;
    if (className) {
      url += "/" + className;
    }
    if (objectId) {
      url += "/" + objectId;
    }
    if ((route === 'users' || route === 'classes') && dataObject && dataObject._fetchWhenSave) {
      delete dataObject._fetchWhenSave;
      url += '?new=true';
    }

    headers = headers || {};
    var data = dataObject;
    var currentUser = ML.User.current();
    if (currentUser && currentUser._sessionToken) {
      headers['X-ZCloud-Session-Token'] = currentUser._sessionToken;
    }

    if(!(data instanceof File)){
      dataObject = ML._.clone(dataObject || {});
      if (method !== "POST") {
        dataObject._method = method;
      }

      dataObject._ApplicationId = ML.applicationId;
      dataObject._ApplicationKey = ML.applicationKey;
      if (!ML._isNullOrUndefined(ML.applicationProduction)) {
        dataObject._ApplicationProduction = ML.applicationProduction;
      }
      if (ML._useMasterKey)
        dataObject._MasterKey = ML.masterKey;
      dataObject._ClientVersion = ML.VERSION;
      dataObject._InstallationId = ML._getInstallationId();
      // Pass the session token on every request.
      var currentUser = ML.User.current();
      if (currentUser && currentUser._sessionToken) {
        dataObject._SessionToken = currentUser._sessionToken;
      }
      data = JSON.stringify(dataObject);


      //files服务器不接受Content-Type跨域头
      if (route !== 'files') {
        headers['Content-Type'] = 'application/json';
      }
    }
    return ML._ajax(method, url, data, null, null, headers).then(null, function (response) {
      // Transform the error into an instance of ML.Error by trying to parse
      // the error string as JSON.
      var error;
      if (response && response.responseText) {
        try {
          var errorJSON = JSON.parse(response.responseText);
          if (errorJSON) {
            error = new ML.Error(errorJSON.errorCode, errorJSON.errorMessage);
          }
        } catch (e) {
          // If we fail to parse the error text, that's okay.
        }
      }
      error = error || new ML.Error(-1, response.responseText);
      // By explicitly returning a rejected Promise, this will work with
      // either jQuery or Promises/A semantics.
      return ML.Promise.error(error);
    });
  };

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  ML._getValue = function (object, prop) {
    if (!(object && object[prop])) {
      return null;
    }
    return ML._.isFunction(object[prop]) ? object[prop]() : object[prop];
  };

  /**
   * Converts a value in a ML Object into the appropriate representation.
   * This is the JS equivalent of Java's ML.maybeReferenceAndEncode(Object)
   * if seenObjects is falsey. Otherwise any ML.Objects not in
   * seenObjects will be fully embedded rather than encoded
   * as a pointer.  This array will be used to prevent going into an infinite
   * loop because we have circular references.  If <seenObjects>
   * is set, then none of the ML Objects that are serialized can be dirty.
   */
  ML._encode = function (value, seenObjects, disallowObjects) {
    var _ = ML._;
    if (value instanceof ML.Object) {
      if (disallowObjects) {
        throw "ML.Objects not allowed here";
      }
      if (!seenObjects || _.include(seenObjects, value) || !value._hasData) {
        return value._toPointer();
      }
      if (!value.dirty()) {
        seenObjects = seenObjects.concat(value);
        return ML._encode(value._toFullJSON(seenObjects),
          seenObjects,
          disallowObjects);
      }
      throw "Tried to save an object with a pointer to a new, unsaved object.";
    }
    if (_.isDate(value)) {
      return {"__type": "Date", "iso": value.toJSON()};
    }
    // if (value instanceof ML.GeoPoint) {
    //   return value.toJSON();
    // }
    if (_.isArray(value)) {
      return _.map(value, function (x) {
        return ML._encode(x, seenObjects, disallowObjects);
      });
    }
    if (_.isRegExp(value)) {
      return value.source;
    }
    if (value instanceof ML.Relation) {
      return value.toJSON();
    }
    if (value instanceof ML.Op) {
      return value.toJSON();
    }
    // if (value instanceof ML.File) {
    //   if (!value.url() && !value.id) {
    //     throw "Tried to save an object containing an unsaved file.";
    //   }
    //   return {
    //     __type: "File",
    //     id: value.id,
    //     name: value.name(),
    //     url: value.url()
    //   };
    // }
    if (_.isObject(value)) {
      var output = {};
      ML._objectEach(value, function (v, k) {
        output[k] = ML._encode(v, seenObjects, disallowObjects);
      });
      return output;
    }
    return value;
  };

  /**
   * The inverse function of ML._encode.
   * TODO: make decode not mutate value.
   */
  ML._decode = function (key, value) {
    var _ = ML._;
    if (!_.isObject(value)) {
      return value;
    }
    if (_.isArray(value)) {
      ML._arrayEach(value, function (v, k) {
        value[k] = ML._decode(k, v);
      });
      return value;
    }
    if (value instanceof ML.Object) {
      return value;
    }
    // if (value instanceof ML.File) {
    //   return value;
    // }
    if (value instanceof ML.Op) {
      return value;
    }
    if (value.__op) {
      return ML.Op._decode(value);
    }
    if (value.__type === "Pointer") {
      var className = value.className;
      var pointer = ML.Object._create(className);
      if (value.createdAt) {
        delete value.__type;
        delete value.className;
        pointer._finishFetch(value, true);
      } else {
        pointer._finishFetch({objectId: value.objectId}, false);
      }
      return pointer;
    }
    if (value.__type === "Object") {
      // It's an Object included in a query result.
      var className = value.className;
      delete value.__type;
      delete value.className;
      var object = ML.Object._create(className);
      object._finishFetch(value, true);
      return object;
    }
    if (value.__type === "Date") {
      return ML._parseDate(value.iso);
    }
    // if (value.__type === "GeoPoint") {
    //   return new ML.GeoPoint({
    //     latitude: value.latitude,
    //     longitude: value.longitude
    //   });
    // }
    if (value.__type === "Relation") {
      var relation = new ML.Relation(null, key);
      relation.targetClassName = value.className;
      return relation;
    }
    // if (value.__type === "File") {
    //   var file = new ML.File(value.name);
    //   file._metaData = value.metaData || {};
    //   file._url = value.url;
    //   file.id = value.objectId;
    //   return file;
    // }
    ML._objectEach(value, function (v, k) {
      value[k] = ML._decode(k, v);
    });
    return value;
  };

  ML._arrayEach = ML._.each;

  /**
   * Does a deep traversal of every item in object, calling func on every one.
   * @param {Object} object The object or array to traverse deeply.
   * @param {Function} func The function to call for every item. It will
   *     be passed the item as an argument. If it returns a truthy value, that
   *     value will replace the item in its parent container.
   * @returns {} the result of calling func on the top-level object itself.
   */
  ML._traverse = function (object, func, seen) {
    if (object instanceof ML.Object) {
      seen = seen || [];
      if (ML._.indexOf(seen, object) >= 0) {
        // We've already visited this object in this call.
        return;
      }
      seen.push(object);
      ML._traverse(object.attributes, func, seen);
      return func(object);
    }
    if (object instanceof ML.Relation) {
      // Nothing needs to be done, but we don't want to recurse into the
      // object's parent infinitely, so we catch this case.
      return func(object);
    }
    if (ML._.isArray(object)) {
      ML._.each(object, function (child, index) {
        var newChild = ML._traverse(child, func, seen);
        if (newChild) {
          object[index] = newChild;
        }
      });
      return func(object);
    }
    if (ML._.isObject(object)) {
      ML._each(object, function (child, key) {
        var newChild = ML._traverse(child, func, seen);
        if (newChild) {
          object[key] = newChild;
        }
      });
      return func(object);
    }
    return func(object);
  };

  /**
   * This is like _.each, except:
   * * it doesn't work for so-called array-like objects,
   * * it does work for dictionaries with a "length" attribute.
   */
  ML._objectEach = ML._each = function (obj, callback) {
    var _ = ML._;
    if (_.isObject(obj)) {
      _.each(_.keys(obj), function (key) {
        callback(obj[key], key);
      });
    } else {
      _.each(obj, callback);
    }
  };

  // Helper function to check null or undefined.
  ML._isNullOrUndefined = function (x) {
    return ML._.isNull(x) || ML._.isUndefined(x);
  };


  //patch
  ML.XMLHttpRequest = require('./XMLHttpRequest').XMLHttpRequest

  ML._request = function (route, className, objectId, method, dataObject, headers, principal) {
     if (!dataObject) {
        dataObject = {};
    }
    if (!ML.applicationId) {
      throw "You must specify your applicationId using ML.initialize";
    }

    if (!ML.applicationKey && !ML.masterKey) {
      throw "You must specify a key using ML.initialize";
    }


    if (route !== "batch" &&
      route !== "classes" &&
      route !== "files" &&
      route !== "functions" &&
      route !== "login" &&
      route !== "marketing/push/msg" &&
      route !== "search/select" &&
      route !== "requestPasswordReset" &&
      route !== "requestEmailVerify" &&
      route !== "requestPasswordResetBySmsCode" &&
      route !== "resetPasswordBySmsCode" &&
      route !== "requestMobilePhoneVerify" &&
      route !== "requestLoginSmsCode" &&
      route !== "verifyMobilePhone" &&
      route !== "requestSmsCode" &&
      route !== "verifySmsCode" &&
      route !== "users" &&
      route !== 'updatePassword' &&
      route !== "usersByMobilePhone" &&
      route !== "cloudQuery" &&
      route !== "qiniu" &&
      route !== "statuses" &&
      route !== "bigquery" &&
      route !== 'search/select' &&
      route !== 'subscribe/statuses/count' &&
      route !== 'subscribe/statuses' && !(/users\/[^\/]+\/updatePassword/.test(route)) && !(/users\/[^\/]+\/friendship\/[^\/]+/.test(route))) {
      throw "Bad route: '" + route + "'.";
    }

    var url = ML.serverURL;
    if (url.charAt(url.length - 1) !== "/") {
      url += "/";
    }
    url += "2.0/" + route;
    if (className) {
      url += "/" + className;
    }
    if (objectId) {
      url += "/" + objectId;
    }
    if ((route === 'users' || route === 'classes') && dataObject && dataObject._fetchWhenSave) {
      delete dataObject._fetchWhenSave;
      url += '?new=true';
    }

    headers = headers || {};
    var data = JSON.stringify(dataObject);
    // var currentUser = ML.User.current();
    // if (currentUser && currentUser._sessionToken) {
    //   headers['X-ZCloud-Session-Token'] = currentUser._sessionToken;
    // }
    return ML._ajax(method, url, data, null, null, headers).then(null, function (response) {
      // Transform the error into an instance of ML.Error by trying to parse
      // the error string as JSON.
      var error;
      if (response && response.responseText) {
        try {
          var errorJSON = JSON.parse(response.responseText);
          if (errorJSON) {
            error = new ML.Error(errorJSON.errorCode, errorJSON.errorMessage);
          }
        } catch (e) {
          // If we fail to parse the error text, that's okay.
        }
      }
      error = error || new ML.Error(-1, response.responseText);
      // By explicitly returning a rejected Promise, this will work with
      // either jQuery or Promises/A semantics.
      return ML.Promise.error(error);
    });
  };

  ML._ajax = function(method, url, data, success, error, headers) {
    var options = {
      success: success,
      error: error
    };

    if (ML._useXDomainRequest()) {
      return ML._ajaxIE8(method, url, data)._thenRunCallbacks(options);
    }

    var promise = new ML.Promise();
    var handled = false;

    var xhr = new ML.XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (handled) {
          return;
        }
        handled = true;

        if (xhr.status >= 200 && xhr.status < 300) {
          var response;
          try {
            response = JSON.parse(xhr.responseText);
          } catch (e) {
            promise.reject(e);
          }
          if (response) {
            promise.resolve(response, xhr.status, xhr);
          }
        } else {
          promise.reject(xhr);
        }
      }
    };
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');  // avoid pre-flight.
    xhr.setRequestHeader("X-ZCloud-AppId", ML.applicationId);
    xhr.setRequestHeader("X-ZCloud-APIKey", ML.applicationKey);
    for (var key in headers) {
      xhr.setRequestHeader(key, headers[key]);
    }
    if (ML._isNode) {
      // Add a special user agent just for request from node.js.
      xhr.setRequestHeader('User-Agent',
                           'ML Cloud Code Node ' + ML.version);
    }
    xhr.send(data);
    return promise._thenRunCallbacks(options);
  };

};

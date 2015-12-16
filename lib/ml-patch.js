'use strict';
var http = require('http');
var urlParser = require('url');
var util = require('util');
var qs = require('querystring');
var ML = require('maxleap-js-sdk').ML;
var utils = require('./utils');
var debug = require('debug')('ML:LeanEngine');
var version = require('../package.json').version;

ML.XMLHttpRequest = require('./XMLHttpRequest').XMLHttpRequest

// 调用 API 时增加 principal信息
if (!ML._old_request) {
  ML._old_request = ML._request;
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
    var currentUser = ML.User.current();
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
}

// 重写 _ajax 方法，为了在 User-Agent 中增加 Cloud-code 的信息
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
  // xhr.setRequestHeader("X-ZCloud-APIKey", ML.applicationKey);
  for (var key in headers) {
    xhr.setRequestHeader(key, headers[key]);
  }
  if (ML._isNode) {
    // Add a special user agent just for request from node.js.
    xhr.setRequestHeader('User-Agent',
                         'ML Cloud Code Node ' + version);
  }
  xhr.send(data);
  return promise._thenRunCallbacks(options);
};

module.exports = ML;

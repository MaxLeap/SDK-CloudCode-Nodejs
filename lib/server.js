'use strict';
var connect = require('connect'),
  bodyParser = require('body-parser'),
  version = require('../package.json').version,
  request = require('supertest'),
  debug = require('debug')('ML:LeanEngine');

module.exports = function(ML){
    var Cloud = ML.Cloud = connect();
    Cloud._function_map = {};
    Cloud._job_map = {};
    Cloud._hook_map = {};
    Cloud._hook_classes = {};

    // 健康监测 router
    Cloud.use('/health', function(req, res) {
      res.end("ok");
    });

    Cloud.use('/console/config', function(req, res) {
      var config = require('/home/leap/global.json');
      res.end(JSON.stringify(config));
    });

    Cloud.use('/console/functionNames', function(req, res) {
      res.end(JSON.stringify(ML._.keys(Cloud._function_map)));
    });

    Cloud.use('/console/jobNames', function(req, res) {
      res.end(JSON.stringify(ML._.keys(Cloud._job_map)));
    });

    Cloud.use('/console/threadStats', function(req, res) {
      res.end(JSON.stringify({"queueSize":60,"rejectCount":0}));
    });

    ['function','job','entityManager'].forEach(function(urlEndpoint){
        var route = '/'+ urlEndpoint;
        Cloud.use(route, bodyParser.urlencoded({extended: false}));
        Cloud.use(route, bodyParser.json());
        Cloud.use(route, bodyParser.text());
        Cloud.use(route, function(req, res, next){
            var name = req.url.split('/')[1]
            if (urlEndpoint === 'function'){
                if (Cloud._function_map[name]){
                    Cloud._function_map[name](req, res);
                }else{
                    res.statusCode = 404;
                    res.end('No This Fuction ' + name);
                }

            }else if(urlEndpoint === 'job'){
                if (Cloud._job_map[name]){
                    Cloud._job_map[name](req, res);
                }else{
                    res.statusCode = 404;
                    res.end('No This Job ' + name);
                }
            }else if(urlEndpoint === 'entityManager'){
                if (Cloud._hook_classes[name]){
                    var method = req.body['method'];
                    var params = req.body['params'];
                    if (method === 'create'){
                        var obj = new ML.Object(name,params);
                        obj._by_hook();
                        var promise = new ML.Promise(function(resolve, reject) {
                            if (Cloud._hook_map[hookNameMapping.beforeSave + name]){
                                Cloud._hook_map[hookNameMapping.beforeSave + name](obj,{
                                    success:function(){
                                        resolve(obj);
                                    },
                                    error:function(error){
                                        reject(error);
                                    }
                                })
                            }else{
                                resolve(obj);
                            }

                        });
                        promise.then(function(obj){
                            obj.save().then(function(obj){
                                var result = {
                                    'createdAt':obj.createdAt.toISOString(),
                                    'objectId':obj.id
                                }
                                if (Cloud._hook_map[hookNameMapping.afterSave + name]){
                                    Cloud._hook_map[hookNameMapping.afterSave + name](obj,{
                                        success:function(){
                                            resp(res, result);
                                        },
                                        error:function(error){
                                            respError(res, error);
                                        }
                                    });
                                }else{
                                    resp(res, result);
                                }
                            },function(err){
                                respError(res, err);
                            });
                        }).catch(function(err){
                            respError(res, err);
                        })

                    }else if(method === 'update'){
                        var obj = ML.Object.createWithoutData(name, params['objectId']);
                        obj._by_hook();
                        ML._.each(params['update'],function(val, key){
                            obj.set(key,val);
                        })
                        obj.save().then(function(obj){
                            var result = {
                                'updatedAt':obj.updatedAt.toISOString(),
                                'objectId':obj.id
                            }
                            if (Cloud._hook_map[hookNameMapping.afterUpdate + name]){
                                Cloud._hook_map[hookNameMapping.afterUpdate + name](obj,{
                                    success:function(){
                                        resp(res, result);
                                    },
                                    error:function(err){
                                        respError(res, err);
                                    }
                                });
                            }else{
                                resp(res, JSON.stringify(result));
                            }
                        },function(err){
                            respError(res, err);
                        });
                    }else if(method === 'delete'){
                        var obj = new ML.Object(name,params);
                        obj._by_hook();
                        var promise = new ML.Promise(function(resolve, reject) {
                            if (Cloud._hook_map[hookNameMapping.beforeDelete + name]){
                                Cloud._hook_map[hookNameMapping.beforeDelete + name](obj,{
                                    success:function(){
                                        resolve(obj);
                                    },
                                    error:function(error){
                                        reject(error);
                                    }
                                })
                            }else{
                                resolve(obj);
                            }

                        });
                        promise.then(function(obj){
                            obj.destroy().then(function(obj){
                                var result = {
                                    'number':1
                                }
                                if (Cloud._hook_map[hookNameMapping.afterDelete + name]){
                                    Cloud._hook_map[hookNameMapping.afterDelete + name](obj,{
                                        success:function(){
                                            resp(res, result);
                                        },
                                        error:function(error){
                                            respError(res, error);
                                        }
                                    });
                                }else{
                                    resp(res, result);
                                }
                            },function(err){
                                respError(res, err);
                            });
                        }).catch(function(error){
                            respError(res, error);
                        })
                    }
                }else{
                    res.statusCode = 404;
                    res.end('No This Class Hook: ' + name);
                }
            }
        })

    });

    Cloud.function = function(name, func) {
      debug('define function: %s', name);
      Cloud._function_map[name] = func;
    };

    Cloud.job = function(name, func) {
      debug('define job: %s', name);
      Cloud._job_map[name] = func;
    };


    var hookNameMapping = {
      beforeSave: '__before_save_for_',
      afterSave: '__after_save_for_',
      afterUpdate: '__after_update_for_',
      beforeDelete: '__before_delete_for_',
      afterDelete: '__after_delete_for_'
    };

    var _define = function(className, hook, func) {
      debug('define class hook: %s %s', hook, className);
      Cloud._hook_map[hook + className] = func;
      Cloud._hook_classes[className] = "placeholder";
    };

    Cloud.beforeSave = function(nameOrClass, func) {
      _define(className(nameOrClass), '__before_save_for_', func);
    };

    Cloud.afterSave = function(nameOrClass, func) {
      _define(className(nameOrClass), '__after_save_for_', func);
    };

    Cloud.afterUpdate = function(nameOrClass, func) {
      _define(className(nameOrClass), '__after_update_for_', func);
    };

    Cloud.beforeDelete = function(nameOrClass, func) {
      _define(className(nameOrClass), '__before_delete_for_', func);
    };

    Cloud.afterDelete = function(nameOrClass, func) {
      _define(className(nameOrClass), '__after_delete_for_', func);
    };

    Cloud.callFuction = function(name, params, func, done){
        var principal = {};
        if (ML.applicationKey !== undefined){
            principal = {"identityType":"MASTER_KEY","appId":ML.applicationId,"id":null,"sessionToken":null,"key":ML.applicationKey};
        }
        if (ML.masterKey !== undefined){
            principal = {"identityType":"MASTER_KEY","appId":ML.applicationId,"id":null,"sessionToken":null,"key":ML.masterKey};
        }
        request(Cloud)
        .post('/function/'+name)
        .set('ML-User-Principal', principal)
        .send(params)
        .expect(func)
        .end(done);
    }

    Cloud.callJob = function(name, params, func, done){
        var principal = {};
        if (ML.applicationKey !== undefined){
            principal = {"identityType":"MASTER_KEY","appId":ML.applicationId,"id":null,"sessionToken":null,"key":ML.applicationKey};
        }
        if (ML.masterKey !== undefined){
            principal = {"identityType":"MASTER_KEY","appId":ML.applicationId,"id":null,"sessionToken":null,"key":ML.masterKey};
        }
        request(Cloud)
        .post('/job/'+name)
        .set('ML-User-Principal', principal)
        .send(params)
        .expect(func)
        .end(done);
    }

    var typeOf = function(obj) {
      var classToType;
      if (obj === void 0 || obj === null) {
        return String(obj);
      }
      classToType = {
        '[object Boolean]': 'boolean',
        '[object Number]': 'number',
        '[object String]': 'string',
        '[object Function]': 'function',
        '[object Array]': 'array',
        '[object Date]': 'date',
        '[object RegExp]': 'regexp',
        '[object Object]': 'object',
        '[object Error]': 'error'
      };
      return classToType[Object.prototype.toString.call(obj)];
    };

    var resp = function(res, data) {
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
      res.statusCode = 200;
      return res.end(JSON.stringify(data));
    };

    var respError = function(res, err) {
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
      res.statusCode = 400;
      if (typeOf(err) === 'object'){
          err = JSON.stringify(err);
      }
      if (typeOf(err) === 'error'){
          err = JSON.stringify({"code":400,"message":err.toString()});
      }
      res.end(err);
    };

    var className = function(clazz) {
      if (typeOf(clazz) === 'string') {
        return clazz;
      }
      if (clazz.className)
        return clazz.className;
      throw new Error("Unknown class:" + clazz);
    };
}

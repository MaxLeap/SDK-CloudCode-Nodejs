'use strict';
var ML = require('../index.js');
var expect = require('expect.js'),
    should = require('should'),
    fs = require('fs'),
    request = require('supertest'),
    assert = require('assert');

var appId = '56273907169e7d0001bd5c92';
var appkey = 'TXV4MFB2SFFQdVpPSjJKYnFtSVdlUQ';
ML.initialize(appId, appkey);
ML.useCNServer();

ML.Cloud.function('foo', function(request, response) {
  assert.ok(request.headers);
  response.setHeader('Content-Type', 'application/json; charset=UTF-8');
  response.end(JSON.stringify({"result":"bar"}));
});

ML.Cloud.function('hello', function(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=UTF-8');
  response.end(JSON.stringify({action: "hello", name: request.body.name}));
});

describe('function', function() {

  // 测试最基本方法的有效性
  it('foo', function(done) {
    request(ML.Cloud)
      .post('/function/foo')
      .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
      .expect(200)
      .expect({result: "bar"}, done);
  });

  // 测试参数的正确解析
  it('hello', function(done) {
    request(ML.Cloud)
      .post('/function/hello')
      .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
      .send({name: "张三"})
      .expect(200)
      .expect({action: "hello", name: "张三"}, done);
  });

  it('callfuction',function(done){
      ML.Cloud.callFuction('foo',{},function(res){
         assert(res.body, {result: "bar"});
      }, done);
  });
});

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

var Post = ML.Object.extend('Post');

describe('hook', function() {
  // before
  it('beforeSave_success', function(done) {
    ML.Cloud.beforeSave('Post', function(obj, res){
        ML.Log.info("beforeSave:" + JSON.stringify(obj));
        res.success();
    });
    request(ML.Cloud)
      .post('/entityManager/Post')
      .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
      .send({"method":"create","params":{"title":"test"}})
      .expect(200, function(err, res) {
        res.body.should.have.properties(['createdAt','objectId']);
        done();
      });
  });

  it('beforeSave_error_block_aftersave', function(done) {
    ML.Cloud.beforeSave('Post', function(obj, res){
        ML.Log.info("beforeSave:" + JSON.stringify(obj));
        res.error({"msg":"error"});
    });
    ML.Cloud.afterSave('Post', function(obj, res){
        ML.Log.info("afterSave:" + JSON.stringify(obj));
        res.success();
    });
    request(ML.Cloud)
      .post('/entityManager/Post')
      .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
      .send({"method":"create","params":{"title":"test"}})
      .expect(400)
      .expect({"msg":"error"},done);
  });

  it('beforeSave_success_aftersave_error', function(done) {
    ML.Cloud.beforeSave('Post', function(obj, res){
        ML.Log.info("beforeSave:" + JSON.stringify(obj));
        res.success()
    });
    ML.Cloud.afterSave('Post', function(obj, res){
        ML.Log.info("afterSave:" + JSON.stringify(obj));
        res.error({"msg":"error"});
    });
    request(ML.Cloud)
      .post('/entityManager/Post')
      .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
      .send({"method":"create","params":{"title":"test"}})
      .expect(400)
      .expect({"msg":"error"},done);
  });

  it('beforeSave_success_aftersave_success', function(done) {
    ML.Cloud.beforeSave('Post', function(obj, res){
        ML.Log.info("beforeSave:" + JSON.stringify(obj));
        res.success()
    });
    ML.Cloud.afterSave('Post', function(obj, res){
        ML.Log.info("afterSave:" + JSON.stringify(obj));
        res.success();
    });
    request(ML.Cloud)
      .post('/entityManager/Post')
      .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
      .send({"method":"create","params":{"title":"test"}})
      .expect(200, function(err, res) {
        res.body.should.have.properties(['createdAt','objectId']);
        done();
      });
  });

  it('afterupdate_success', function(done) {
    ML.Cloud.afterUpdate('Post', function(obj, res){
        ML.Log.info("afterUpdate:" + JSON.stringify(obj));
        res.success();
    });
    var mypost = new Post();
    mypost.set('title','001');
    mypost.save().then(function(obj){
        request(ML.Cloud)
          .post('/entityManager/Post')
          .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
          .send({"method":"update","params":{"objectId":obj.id,"update":{"title":"test"}}})
          .expect(200, function(err, res) {
            res.body.should.have.properties(['updatedAt','objectId']);
            done();
          });
    });
  });

  it('afterupdate_success', function(done) {
    ML.Cloud.afterUpdate('Post', function(obj, res){
        ML.Log.info("afterUpdate:" + JSON.stringify(obj));
        res.error({"msg":"error"});
    });
    var mypost = new Post();
    mypost.set('title','001');
    mypost.save().then(function(obj){
        request(ML.Cloud)
          .post('/entityManager/Post')
          .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
          .send({"method":"update","params":{"objectId":obj.id,"update":{"title":"test"}}})
          .expect(400)
          .expect({"msg":"error"},done);
    });
  });

  it('beforedelete_success', function(done) {
    ML.Cloud.beforeDelete('Post', function(obj, res){
        ML.Log.info("beforeDelete:" + JSON.stringify(obj));
        res.success();
    });
    var mypost = new Post();
    mypost.set('title','001');
    mypost.save().then(function(obj){
        request(ML.Cloud)
          .post('/entityManager/Post')
          .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
          .send({"method":"delete","params":{"objectId":obj.id}})
          .expect(200)
          .expect({"number":1},done);
    });
  });

  it('beforedelete_error_block_afterdelete', function(done) {
    ML.Cloud.beforeDelete('Post', function(obj, res){
        ML.Log.info("beforeDelete:" + JSON.stringify(obj));
        res.error({"msg":"error"});
    });
    ML.Cloud.afterDelete('Post', function(obj, res){
        ML.Log.info("afterDelete:" + JSON.stringify(obj));
        res.success();
    });
    var mypost = new Post();
    mypost.set('title','001');
    mypost.save().then(function(obj){
        request(ML.Cloud)
          .post('/entityManager/Post')
          .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
          .send({"method":"delete","params":{"objectId":obj.id}})
          .expect(400)
          .expect({"msg":"error"},done);
    });
  });

  it('beforedelete_success_and_afterdelete_error', function(done) {
    ML.Cloud.beforeDelete('Post', function(obj, res){
        ML.Log.info("beforeDelete:" + JSON.stringify(obj));
        res.success();
    });
    ML.Cloud.afterDelete('Post', function(obj, res){
        ML.Log.info("afterDelete:" + JSON.stringify(obj));
        res.error({"msg":"error"});
    });
    var mypost = new Post();
    mypost.set('title','001');
    mypost.save().then(function(obj){
        request(ML.Cloud)
          .post('/entityManager/Post')
          .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
          .send({"method":"delete","params":{"objectId":obj.id}})
          .expect(400)
          .expect({"msg":"error"},done);
    });
  });

  it('beforedelete_success_and_afterdelete_success', function(done) {
    ML.Cloud.beforeDelete('Post', function(obj, res){
        ML.Log.info("beforeDelete:" + JSON.stringify(obj));
        res.success();
    });
    ML.Cloud.afterDelete('Post', function(obj, res){
        ML.Log.info("afterDelete:" + JSON.stringify(obj));
        res.success();
    });
    var mypost = new Post();
    mypost.set('title','001');
    mypost.save().then(function(obj){
        request(ML.Cloud)
          .post('/entityManager/Post')
          .set('ML-User-Principal', {"identityType":"API_KEY","appId":appId,"id":null,"sessionToken":null,"key":appkey})
          .send({"method":"delete","params":{"objectId":obj.id}})
          .expect(200)
          .expect({"number":1},done);
    });
  });

});

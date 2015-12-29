var ML = require('../index.js');
var expect = require('expect.js');

ML.initialize('56273907169e7d0001bd5c92', 'TXV4MFB2SFFQdVpPSjJKYnFtSVdlUQ');
ML.useCNServer();

var Post = ML.Object.extend('Post');
var Comment = ML.Object.extend('Comment');
var GameScore = ML.Object.extend('GameScore');
var Person = ML.Object.extend('Person');


describe('Objects', function () {
  var objId;
  var gameScore = GameScore.new();
  describe('#Saving Objects', function () {
    it('should crate a Object', function (done) {
      var myPost = new Post();
      myPost.set('title', 'post1');
      myPost.set('content', 'Where should we go for lunch?');
      myPost.save().then(function(result){
        objId = result.id;
        done();
      }).catch(done);
    });

  });

  describe('Retrieving Objects', function () {
    it('should be the just save Object', function (done) {
      var query = new ML.Query(Post);
      console.log(objId);
      query.get(objId).then(function(post){
        expect(post.id).to.be.ok();
        done();
      }).catch(done);
    });
  });

  describe('Updating Objects', function () {
    it('should update prop', function (done) {
      gameScore.set('score', 10000);
      gameScore.save().then(function(result){
        expect(result.id).to.be.ok();
        done();
      }).catch(done);
    });
  });

  describe('Deleting Objects', function () {
    it('should delete cheatMode', function (done) {
      gameScore.unset('cheatMode');
      gameScore.save().then(function(){
        done();
      }).catch(done);
    });

    it('should deleted all', function (done) {
      var TestDestroyAll = ML.Object.extend('Post');
      var allPromises = [], allObjects = [];
      for (var i = 0; i < 3; i++) {
        var obj = new TestDestroyAll();
        obj.set('title', (new Date).toString());
        allObjects.push(obj);
        allPromises.push(obj.save());
      }

      ML.Promise.all(allPromises).then(function () {
        ML.Object.destroyAll(allObjects, function (results) {
          for (var i in results) {
            expect(results[i].number).to.be.equal(1);
          }
          done();
        });
      }).catch(done);
    })
  });

  describe('Relation', function () {
    it('should save comment with post', function(done){
      var post = new Post();
      post.set('content', '这是我的第一条微博信息，请大家多多关照。');

      var comment = new Comment();
      comment.set('content', '期待您更多的微博信息。');
      comment.add('post', post);
      comment.save().then(function(comment){
        expect(comment.id).to.be.ok();
        expect(comment.get('post')[0].id).to.be.ok();
        done();
      }).catch(done);
    });

    it('should save post with comments', function(done){
      var post = new Post();
      post.set('content', '这是我的第一条微博信息，请大家多多关照。');

      var comment1 = new Comment();
      comment1.set('content', '期待您更多的微博信息。');
      var comment2 = new Comment();
      comment2.set('content', '我也期待。');

      post.add('comment', comment1);
      post.add('comment', comment2);
      post.save().then(function(post){
        expect(post.id).to.be.ok();
        expect(post.get('comment').length).to.be(2);
        done();
      }).catch(done);
    });

  });

  describe('Increment', function () {
    it('should be 1 increment by default', function (done) {
      var gameScore = new GameScore({
        'score': 10
      });
      gameScore.increment('score');
      gameScore.save().then(function (gameScore) {
        expect(gameScore.get('score')).to.be.equal(11);
        done();
      }).catch(done);
    });

    it('should be 3 increment', function (done) {
      var gameScore = new GameScore({
        'score': 10
      });
      gameScore.increment('score', 3);
      gameScore.save().then(function (gameScore) {
        expect(gameScore.get('score')).to.be.equal(13);
        done();
      }).catch(done);
    });

    it('should be -3 increment', function (done) {
      var gameScore = new GameScore({
        'score': 10
      });
      gameScore.increment('score', -3);
      gameScore.save().then(function (gameScore) {
        expect(gameScore.get('score')).to.be.equal(7);
        done();
      }).catch(done);
    });
  });

  describe('Array', function () {
    var post = new Post();
    it('should add tags', function (done) {
      post.set('tags', ['Frontend', 'JavaScript']);
      post.save().then(function (post) {
        expect(post.get('tags').length).to.be(2);
        done();
      }).catch(done);
    });

    it('should remove tags', function (done) {
      post.remove('tags', 'Frontend');
      post.save().then(function (post) {
        expect(post.get('tags').length).to.be(1);
        done();
      }).catch(done);
    });
  });

  describe('Data type', function(){
    it('should be saved', function(done){
      var number = 123, date = new Date(), array = ['a', 'b'], object = {name: 'test'};
      var post = new Post();
      post.set('number', number);
      post.set('date', date);
      post.set('array', array);
      post.set('object', object);
      post.save().then(function(post){
        expect(post.id).to.be.ok();
        done();
      }).catch(done);
    });
  });
});

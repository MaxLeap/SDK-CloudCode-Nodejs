var ML = require('./lib/ml'),
    http = require('http');

module.exports = ML;
ML.initialize('566fc8b1e519c20001a6d51c','RkdXQ1ZYeXBjS1k5dEJ5cUJUWmF2UQ','THJEaUZfbmVjaFJ6eFU4dXF6T01NUQ');
ML.serverURL = 'http://apiuat.maxleap.cn/';
http.createServer(ML.Cloud).listen(3000)

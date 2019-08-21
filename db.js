var MongoClient = require('mongodb').MongoClient;
var Promise = require('bluebird')

//不管数据库什么操作，都是先连接数据库，所以我们可以把连接数据库封装成为内部函数
function _connectDB() {
    const url = 'mongodb://localhost:27017';
    const dbName = 'tree';

    //连接数据库
    return new Promise(function (resolve, reject) {
        MongoClient.connect(url, function (err, client) {
            const db = client.db(dbName);
            resolve({
                db,
                client
            });
        });
    })
}

//插入数据
exports.insertOne = function (collectionName, json) {
    return new Promise(function (resolve, reject) {
        _connectDB().then(function (res) {
            const collection = res.db.collection(collectionName);
            collection.insertOne(json, function (err, result) {
                res.client.close();
                if (err) reject(err);
                else resolve(result);
            })
        })
    })
};

//查找数据，找到所有数据
exports.find = function (collectionName, json, pageamount, page, sort) {
    //数目限制
    var limit = pageamount || 0;
    //应该省略的条数
    var skipnumber = pageamount * page || 0;
    //排序方式
    var sort = sort || {};

    return new Promise(function (resolve, reject) {
        _connectDB().then(function (res) {
            const collection = res.db.collection(collectionName);

            collection.find(json).skip(skipnumber).limit(limit).sort(sort)
            .toArray(function(err, docs) {
                res.client.close();
                if (err) reject(err);
                else resolve(docs);
            });
        })
    })
}
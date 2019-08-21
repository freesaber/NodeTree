'use strict'
/**处理和微信交互的部分 */

var sha1 = require('sha1')
var getRawBody = require('raw-body')
var Wechat = require('./wechat')
var util = require('./util')

module.exports = function (opts, handler) {
  //实例化上面的构造函数
  var wechat = new Wechat(opts);

  return function* (next) {
    var token = opts.token;
    var signature = this.query.signature;
    var nonce = this.query.nonce;
    var timestamp = this.query.timestamp;
    var echostr = this.query.echostr;
    var str = [token, timestamp, nonce].sort().join('');
    var sha = sha1(str);

    if (this.method === 'GET') {
      if (sha === signature) {
        this.body = echostr + '';
      } else {
        this.body = 'wrong';
      }
    } else if (this.method === 'POST') {
      if (sha != signature) {
        this.body = 'wrong';
        return false;
      }

      var data = yield getRawBody(this.req, {
        length: this.length,
        limit: '1mb',
        encoding: this.charset
      })

      var content = yield util.parseXMLAsync(data)
      var message = util.formateMessage(content.xml);

      this.weixinMessage = message; //格式化后微信服务器发送过来的消息
      yield handler.call(this, next); //第二个参数传递进来，reply.js，指定如何回复消息
      //上面解析完回复，回复的内容在this.body中
      wechat.reply.call(this);
    }
  }
}
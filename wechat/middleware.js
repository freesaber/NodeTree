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
    var signature = this.query.signature; // 签名值
    var nonce = this.query.nonce; // 随机参数
    var timestamp = this.query.timestamp; // 时间戳
    var echostr = this.query.echostr;
    var str = [token, timestamp, nonce].sort().join(''); // 字典排序
    var sha = sha1(str); // 加密

    if (this.method === 'GET') {
      // 在开发--基本配置--服务器配置中配置微信服务器，填写url后，微信服务器会发送一个GET请求到这里
      if (sha === signature) {
        this.body = echostr + ''; // 如果是GET请求，原样返回echostr字符串给微信服务器
      } else {
        // 不是微信过来的请求
        this.body = 'wrong';
      }
    } else if (this.method === 'POST') {
      // 公众号消息推送
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
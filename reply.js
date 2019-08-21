'use strict'

var config = require('./config')
var Wechat = require('./wechat/wechat')
var wechatApi = new Wechat(config.wechat)
var sd = require('silly-datetime');
var db = require('./db')

//控制如何回复消息，this指的是请求的上下文
exports.reply = function* (next) {
  var message = this.weixinMessage; //微信服务器发送的消息，根据消息类型设置回复
  var reply = '平台使用说明：'+
  '\n发送1，查看最新“求购”信息！'+
  '\n发送2，查看最新“出售”信息！'+
  // '\n发送3，查看会员信息'+
  '\n'+
  '\n如果要发布求购信息，请以"买树"开头。'+
  '\n'+
  '\n如果要发布出售信息，请以"卖树"开头。';

  if (message.MsgType === 'event') {
    if (message.Event === 'subscribe') {
      if (message.EventKey) {
        console.log('扫二维码进来：' + message.EventKey + ' ' + message.ticket);
      }
      this.body = '感谢您的关注！'+reply;
    } else if (message.Event === 'unsubscribe') {
      this.body = ''
    } else if (message.Event === 'LOCATION') {
      this.body = '您上报的位置是： ' + message.Latitude + '/' + message.Longitude + '-' + message.Precision;
    } else if (message.Event === 'CLICK') {
      this.body = '您点击了菜单： ' + message.EventKey;
    } else if (message.Event === 'VIEW') {
      this.body = '您点击了菜单中的连接： ' + message.EventKey;
    } else if (message.Event === 'SCAN') {
      console.log('关注后扫二维码 ' + message.EventKey + ' ' + message.ticket);
    }
  } else if (message.MsgType === 'text') {
    var content = message.Content;
    var dateTime=new Date();
    //获取访问的用户
    var users = yield db.find('vip', {'openid': message.FromUserName}, 10, 0);
    var user={
      'openid': message.FromUserName,
      'time': sd.format(dateTime, 'YYYY-MM-DD HH:mm'),
      'timespan': dateTime.getTime(),
      'auth': 0
    };
    if(users.length>0){
      user=users[0];
    }

    if (content === '1') {
      var startTime=dateTime.getTime() - 100*60*60*1000;
      var purchase = yield db.find('purchase',{"timespan": {$gt:startTime}}, 25, 0,{"timespan":-1});
      reply='';
      purchase.forEach(element => {
        reply+=element.content+'\n\n'
      });
    } else if (content === '2') {
      var startTime=dateTime.getTime() - 100*60*60*1000;
      var sale = yield db.find('sale',{"timespan": {$gt:startTime}}, 25, 0,{"timespan":-1});
      reply='';
      sale.forEach(element => {
        reply+=element.content+'\n\n'
      });
    } else if (content === '3') {
      //通过记录发送这条消息的openid和时间，来推断用户，在数据库中设置成会员
      // if(users.length==0){
      //   yield db.insertOne('vip', user);
      //   reply='非会员，如若需要，请联系管理员注册！';
      // }else{
      //   if(user.auth>0){
      //     reply='您已经是会员！';
      //   }else{
      //     reply='非会员，如若需要，请联系管理员13951683085注册！';
      //   }
      // }
    } else {
      var cc = 2;
      if (user.auth > 10) {
        reply = '管理员，您好！';
        cc = 500;
      } else if (user.auth > 0) {
        cc = 10;
      } else {
        cc = 2;
      }
      if (content.startsWith('买树')) {
        if(content.length>100){
          reply='发送的消息不能超过100个字符';
        }else{
          var options = {
            'openid': message.FromUserName,
            'time': sd.format(dateTime, 'YYYY-MM-DD HH:mm'),
            'timespan': dateTime.getTime(),
            'content': content.substring(2)
          };
          var startTime=dateTime.getTime() - 24*60*60*1000;
          var purchase = yield db.find('purchase',{'openid': message.FromUserName,"timespan": {$gt:startTime}}, 10, 0,{"timespan":-1});
          //判断24小时内，发送的买树消息数量
          if(purchase.length>=cc){
            reply='超过消息发送的上线，您24小时内消息发送的数量为'+cc+'条!';
          }else{
            yield db.insertOne('purchase', options);
            reply='发送成功！';
          }
        }
      } else if (content.startsWith('卖树')) {
        if(content.length>100){
          reply='发送的消息不能超过100个字符';
        }else{
          var options = {
            'openid': message.FromUserName,
            'time': sd.format(dateTime, 'YYYY-MM-DD HH:mm'),
            'timespan': dateTime.getTime(),
            'content': content.substring(2)
          };
          var startTime=dateTime.getTime() - 24*60*60*1000;
          var sale = yield db.find('sale',{'openid': message.FromUserName,"timespan": {$gt:startTime}}, 10, 0,{"timespan":-1});
          //判断24小时内，发送的买树消息数量
          if(sale.length>=cc){
            reply='超过消息发送的上线，您24小时内消息发送的数为'+cc+'条!';
          }else{
            yield db.insertOne('sale', options);
            reply='发送成功！';
          }
        }
      }
    }
    this.body = reply;
  }

  yield next;
}
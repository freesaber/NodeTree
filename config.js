'use strict'

var path = require('path')
var util = require('./libs/util')
var wechat_file = path.join(__dirname, './config/wechat.txt')

var config = {
  wechat: {
    appID: 'wx336c6e1c5af15822',
    appSecret: 'a8e58a388d466bf9777ab7cdd74994f1',
    token: 'freesaber',
    getAccessToken: function () { //从文件获取票据
      return util.readFileAsync(wechat_file);
    },
    saveAccessToken: function (data) { //从文件存储票据
      data = JSON.stringify(data);
      return util.writeFileAsync(wechat_file, data);
    }
  }
}

module.exports = config
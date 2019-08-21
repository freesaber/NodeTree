'use strict'

var path = require('path')
var util = require('./libs/util')
var wechat_file = path.join(__dirname, './config/wechat.txt')

var config = {
  wechat: {
    appID: '', // 开发者ID(AppID)
    appSecret: '', //开发者密码(AppSecret)
    token: 'freesaber', // 令牌(Token)
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
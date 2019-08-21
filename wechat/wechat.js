'use strict'

var Promise = require('bluebird')
var _ = require('lodash')
var request = Promise.promisify(require('request'))
var util = require('./util')
var fs = require('path')
var prefix = 'https://api.weixin.qq.com/cgi-bin/'
var api = {
  accessToken: prefix + 'token?grant_type=client_credential',
  temporary: {
    upload: prefix + 'media/upload?', //新增临时素材
    fetch: prefix + 'media/get?' //获取临时素材
  },
  permanent: {
    upload: prefix + 'material/add_material?', //新增其他类型永久素材
    fetch: prefix + 'material/get_material?', //获取永久素材
    uploadNews: prefix + 'material/add_news?', //新增永久图文素材
    uploadNewsPic: prefix + 'material/uploadimg?', //图文中的图片
    del: prefix + 'material/del_material?', //删除永久素材
    update: prefix + 'material/update_news?', //修改永久图文素材
    count: prefix + 'material/get_materialcount?', //获取素材总数
    batch: prefix + 'material/batchget_material?', //获取素材列表
  },
  user: {
    remark: prefix + 'user/info/updateremark?', //设置用户备注名
    fetch: prefix + 'user/info?', //获取用户基本信息
    batchFetch: prefix + 'user/info/batchget?', //批量获取用户基本信息
  }
}

function Wechat(opts) {
  var that = this;
  this.appID = opts.appID;
  this.appSecret = opts.appSecret;
  this.getAccessToken = opts.getAccessToken; //从文件获取票据
  this.saveAccessToken = opts.saveAccessToken; //从文件存储票据

  this.fetchAccessToken();
}

//获取票据
Wechat.prototype.fetchAccessToken = function () {
  var that = this;
  if (this.access_token && this.expires_in) {
    if (this.isValidAccessToken(this)) {
      return Promise.resolve(this);
    }
  }

  this.getAccessToken()
    .then(function (data) {
      //解析存储的票据
      try {
        data = JSON.parse(data);
      } catch (e) {
        return that.updateAccessToken();
      }
      //判断票据是否合法
      if (that.isValidAccessToken(data)) {
        return Promise.resolve(data);
      } else {
        return that.updateAccessToken();
      }
    })
    .then(function (data) {
      //存储最新的票据
      that.access_token = data.access_token;
      that.expires_in = data.expires_in;
      //存储最新票据
      that.saveAccessToken(data);
      return Promise.resolve(data);
    });
}

//判断票据是否合法
Wechat.prototype.isValidAccessToken = function (data) {
  if (!data || !data.access_token || !data.expires_in) {
    return false;
  }

  var access_token = data.access_token;
  var expires_in = data.expires_in;
  var now = (new Date().getTime());
  if (now < expires_in) {
    return true;
  } else {
    return false;
  }
}

//更新票据
Wechat.prototype.updateAccessToken = function () {
  //请求服务器的url地址
  var appID = this.appID;
  var appSecret = this.appSecret;
  var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret;
  return new Promise(function (resolve, reject) {
    request({
        url: url,
        json: true
      })
      .then(function (response) {
        try {
          var data = response.body;
          var now = (new Date().getTime())
          var expires_in = now + (data.expires_in - 20) * 1000; //服务器返回的有效时间缩短20秒

          data.expires_in = expires_in;
          resolve(data);
        } catch (e) {
          reject();
        }
      });
  });
}

//上传素材媒体文件到微信服务器
Wechat.prototype.uploadMaterial = function (type, material, permanent) {
  var that = this;
  var form = {};
  var uploadUrl = api.temporary.upload;
  //判断是否是上传永久素材
  if (permanent) {
    uploadUrl = api.permanent.upload;
    _.extend(form, permanent);
  }
  if (type === 'pic') {
    uploadUrl = api.permanent.uploadNewsPic;
  }
  if (type === 'news') {
    uploadUrl = api.permanent.uploadNews;
    form = material;
  } else {
    form.media = fs.createReadStream(material);
  }

  return new Promise(function (resolve, reject) {
    that
      .fetchAccessToken()
      .then(function (data) {
        var url = uploadUrl + 'access_token=' + data.access_token;
        //如果不是永久类型，需要追加type
        if (!permanent) {
          url += '&type=' + type;
        } else {
          form.access_token = data.access_token;
        }
        //请求参数
        var options = {
          method: 'POST',
          url: url,
          json: true,
        }
        if (type === 'news') {
          options.body = form; //文图
        } else {
          options.formData = form;
        }

        request(options).then(function (response) {
          var _data = response.body;
          if (_data) {
            resolve(_data); //微信服务器返回值{"type":"TYPE","media_id":"MEDIA_ID","created_at":123456789}
          } else {
            throw new Error('Upload Material fails')
          }
        }).catch(function (err) {
          reject(err)
        })
      })
  })
}

//从微信服务器获取媒体文件
Wechat.prototype.fetchMaterial = function (mediaId, type, permanent) {
  var that = this;
  var fetchUrl = api.temporary.fetch;
  //判断是否是永久素材
  if (permanent) {
    fetchUrl = api.permanent.fetch;
  }

  return new Promise(function (resolve, reject) {
    that
      .fetchAccessToken()
      .then(function (data) {
        var url = fetchUrl + 'access_token=' + data.access_token + '&media_id=' + mediaId;
        var form = {
          media_id: mediaId,
          access_token: data.access_token
        }
        request({
            method: 'POST',
            url: url,
            body: form,
            json: true
          })
          .then(function (response) {
            var _data = response.body;

            if (_data) {
              resolve(_data);
            } else {
              throw new Error('Fetch Material fails')
            }
          }).catch(function (err) {
            reject(err)
          })
      })
  })
}

//从微信服务器删除永久素材
Wechat.prototype.deleteMaterial = function (mediaId) {
  var that = this;
  var form = {
    media_id: mediaId
  };

  return new Promise(function (resolve, reject) {
    that
      .fetchAccessToken()
      .then(function (data) {
        var url = api.permanent.del + 'access_token=' + data.access_token + '&media_id=' + mediaId;

        request({
            method: 'POST',
            url: url,
            body: form,
            json: true
          })
          .then(function (response) {
            var _data = response.body;

            if (_data) {
              resolve(_data);
            } else {
              throw new Error('Delete Material fails')
            }
          }).catch(function (err) {
            reject(err)
          })
      })
  })
}

//从微信服务器修改永久图文素材
Wechat.prototype.updateMaterial = function (mediaId, news) {
  var that = this;
  var form = {
    media_id: mediaId
  };
  _.extend(form, news);

  return new Promise(function (resolve, reject) {
    that
      .fetchAccessToken()
      .then(function (data) {
        var url = api.permanent.update + 'access_token=' + data.access_token + '&media_id=' + mediaId;

        request({
            method: 'POST',
            url: url,
            body: form,
            json: true
          })
          .then(function (response) {
            var _data = response.body;

            if (_data) {
              resolve(_data);
            } else {
              throw new Error('Update Material fails')
            }
          }).catch(function (err) {
            reject(err)
          })
      })
  })
}

//获取素材总数
Wechat.prototype.countMaterial = function () {
  var that = this;

  return new Promise(function (resolve, reject) {
    that
      .fetchAccessToken()
      .then(function (data) {
        var url = api.permanent.count + 'access_token=' + data.access_token;

        request({
            method: 'GET',
            url: url,
            json: true
          })
          .then(function (response) {
            var _data = response.body;

            if (_data) {
              resolve(_data);
            } else {
              throw new Error('Count Material fails')
            }
          }).catch(function (err) {
            reject(err)
          })
      })
  })
}

//获取素材列表
Wechat.prototype.batchMaterial = function (options) {
  var that = this;

  options.type = options.type || 'image';
  options.offset = options.offset || 0;
  options.count = options.count || 1;

  return new Promise(function (resolve, reject) {
    that
      .fetchAccessToken()
      .then(function (data) {
        var url = api.permanent.batch + 'access_token=' + data.access_token;

        request({
            method: 'POST',
            url: url,
            body: options,
            json: true
          })
          .then(function (response) {
            var _data = response.body;

            if (_data) {
              resolve(_data);
            } else {
              throw new Error('BatchCount Material fails')
            }
          }).catch(function (err) {
            reject(err)
          })
      })
  })
}

//获取用户基本信息
Wechat.prototype.fetchUsers = function (openIds, lang) {
  var that = this;
  lang = lang || 'zh_CN';

  return new Promise(function (resolve, reject) {
    that
      .fetchAccessToken()
      .then(function (data) {
        var options = {
          json: true
        }

        if (_.isArray(openIds)) {
          options.url = api.user.batchFetch + 'access_token=' + data.access_token;
          options.body = {
            user_list: openIds
          };
          options.method = 'POST';
        } else {
          options.url = api.user.fetch + 'access_token=' + data.access_token +
            '&openid=' + openIds + '&lang=' + lang;
        }

        request(options)
          .then(function (response) {
            var _data = response.body;

            if (_data) {
              resolve(_data);
            } else {
              throw new Error('FetchUsers Material fails')
            }
          }).catch(function (err) {
            reject(err)
          })
      })
  })
}

//这里的上下文已经改变为当前请求响应的上下文
Wechat.prototype.reply = function () {
  var content = this.body; //回复的内容
  var message = this.weixinMessage; //微信服务器发送的消息

  var xml = util.tpl(content, message); //根据模板拼接消息内容

  //返回
  this.status = 200;
  this.type = 'application/xml';
  this.body = xml;
}

module.exports = Wechat
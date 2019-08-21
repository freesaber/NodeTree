'use strict'

var Koa = require('koa')
var middleware = require('./wechat/middleware')
var config = require('./config')
var reply = require('./reply')

var app = new Koa()

//将config传递给koa中间件
app.use(middleware(config.wechat, reply.reply))

app.listen(80)
console.log('Listening:80')
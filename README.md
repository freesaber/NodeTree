# NodeTree
使用nodejs+mongodb开发的一个微信公众号，买家可以发布求购信息，卖家可以发布出售信息。

参考项目：[https://github.com/freesaber/NodeLearning/tree/master/scott-film](https://github.com/freesaber/NodeLearning/tree/master/scott-film)

项目演示：

![demo.png](https://img2018.cnblogs.com/blog/221923/201908/221923-20190821154442094-1040190187.jpg "demo")

说明：
1. config.js中填写自己的微信公众号配置信息
2. db.js中修改数据库的连接地址
3. 进入mongo数据库中
  + use tree：创建一个数据库
  + db.createCollection("purchase")：创建求购信息集合
  + db.createCollection("sale")：创建出售信息集合
  + db.createCollection("vip")：创建会员信息集合

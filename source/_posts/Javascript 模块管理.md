---
title: Javascript 模块管理
date: 2020-08-29 20:22:43
tags:
---

## CommonJS

`CommonJS`是`Node.js`对模块开发的标准规范。

CommonJS module基本要求如下：
<!-- more -->
- 一个文件就是一个模块，拥有单独的作用域
- 普通方式定义的 变量、函数、对象都属于该模块内
- 通过 `require` 来加载模块
- 通过 `exports` 和 `module.exports` 来暴露模块中的内容


demo1: 

```js
// module.js
module.exports = {
  name: "zhang",
  getName: function() {
    console.log(this.name);
  },
  changeName: function(n) {
    this.name = n;
  }
};

// index.js
const module = require("./module/index");
console.log(module)	//  {name: "zhang", getName: ƒ, changeName: ƒ} "commons"
```

demo2:

```js
// module1.js
const getParam = () => {
  console.log(a);
};
let a = 123;
let b = 456;

exports.a = a;
exports.b = b;
exports.getParam = getParam;

// index.js
const module1 = require("./module/index1");
consoel.log(module1, "commons1")	// {a: 123, b: 456, getParam: ƒ} "commons1"
``` 

demo3: 

```js
// module2.js
let a = 123;

const getSome = () => {
  console.log("yyy");
};

const getA = () => {
  console.log(a);
};

exports.getSome = getSome;
module.exports = getA;

// index.js
const module2 = require("./module/index2");
consoel.log(module2, "commons2")	// function getA() {...}
```

> 总结 ： 通过这样的一个对比的例子就可以比较清晰的对比出  exports 和  module.exports  的区别:
1、当 exports 和 module.exports 同时存在的时候，module.exports 会盖过 exports
2、当模块内部全部是 exports 的时候， 就等同于 module.exports
3、最后 我们就可以认定为  exports  其实就是 module.exports 的子集。

## AMD

AMD全称为异步模块定义, 是专门为浏览器中JavaScript环境设计的规范。

AMD设计出一个简洁的写模块API：

``define(id?, dependencies?, factory);``

其中：

- `id`: 模块标识，可以省略。
- `dependencies`: 所依赖的模块，可以省略。
- `factory`: 模块的实现，或者一个JavaScript对象。如果为函数，它应该只被执行一次，如果是对象，此对象应该为模块的输出值。

使用`RequireJS`的require函数加载模块:

``require([dependencies], callback);``

- `dependencies`: 表示所依赖的模块
- `callback`: 一个回调函数，当前面指定的模块都加载成功后，它将被调用。加载的模块会以参数形式传入该函数，从而在回调函数内部就可以使用这些模块

base.js

```js
define(function() {
    return {
        mix: function(source, target) {
        }
    };
});
```

ui.js

```js
define(['base'], function(base) {
    return {
        show: function() {
            // todo with module base
        }
    }
});
```

page.js

```js
define(['data', 'ui'], function(data, ui) {
    // init here
})
```

data.js

```js
define({
    users: [],
    members: []
});
```

以上同时演示了define的三种用法
1. 定义无依赖的模块（base.js）
2. 定义有依赖的模块（ui.js，page.js）
3. 定义数据对象模块（data.js）

### CMD

AMD开始为摆脱CommonJS的束缚，开创性的提出了自己的模块风格。但后来又做了妥协，兼容了 CommonJS Modules/Wrappings 。所以就有了`CMD`, 它的语法如下:

``define(id?, dependencies?, factory);``

因为CMD推崇一个文件一个模块，所以经常就用文件名作为模块id；

CMD推崇依赖就近，所以一般不在define的参数中写依赖，而是在factory中写。

factory有三个参数：

```
function(require, exports, module){}
```

- `require`: require 是一个方法，接受 模块标识 作为唯一参数，用来获取其他模块提供的接口；

- `exports`: exports 是一个对象，用来向外提供模块接口；

- `module`: module 是一个对象，上面存储了与当前模块相关联的一些属性和方法。

demo: 

```js
define(function(require, exports, module) {
    var base = require('base');
    exports.show = function() {
        // todo with module base
    }
});
```

> AMD推崇依赖前置，在定义模块的时候就要声明其依赖的模块. CMD推崇就近依赖，只有在用到某个模块的时候再去require.

AMD和CMD最大的区别是对依赖模块的执行时机处理不同，注意不是加载的时机或者方式不同
很多人说requireJS是异步加载模块，SeaJS是同步加载模块，这么理解实际上是不准确的，其实加载模块都是异步的，只不过AMD依赖前置，js可以方便知道依赖模块是谁，立即加载，而CMD就近依赖，需要使用把模块变为字符串解析一遍才知道依赖了那些模块，这也是很多人诟病CMD的一点，牺牲性能来带来开发的便利性，实际上解析模块用的时间短到可以忽略。

## ES Module

在 ES2015 标准为出来之前，最主要的是CommonJS和AMD规范。上文中我们已经介绍了 CommonJS 规范（主要是为了服务端 NodeJS 服务）和 AMD（主要引用在浏览器端），那么当 ES6标准的出现，为浏览器端模块化做了一个非常好的补充。

`export`用于对外输出本模块（一个文件可以理解为一个模块）变量的接口
`import`用于导入`export`导出的模块

```js
// index.js
export const fn1 = function () {
  console.log('fn1')
}

export const fn2 = function () {
  console.log('fn2')
}

const fn = {
  fn1,
  fn2
}

export default fn

// index1.js
import { fn1, fn2 } from 'index.js'
fn1() // 'fn1'
fn2() // 'fn2' 

import fn from 'index.js'
console.log(fn) // {fn1: ƒ, fn2: ƒ}
```

export 可以导出的是一个对象中包含的多个 属性，方法。 export default 只能导出 一个 可以不具名的 对象。

`import {fn} from './xxx/xxx'` ( export 导出方式的 引用方式 ) `import fn from './xxx/xxx1'` ( export default 导出方式的 引用方式 )

## UMD

AMD以浏览器为第一（browser-first）的原则发展，选择异步加载模块。它的模块支持对象（objects）、函数（functions）、构造器（constructors）、字符串（strings）、JSON等各种类型的模块。因此在浏览器中它非常灵活。

 

CommonJS module以服务器端为第一（server-first）的原则发展，选择同步加载模块。它的模块是无需包装的（unwrapped modules）且贴近于ES.next/Harmony的模块格式。但它仅支持对象类型（objects）模块。

 

这迫使一些人又想出另一个更通用格式 UMD(Universal Module Definition)。希望提供一个前后端跨平台的解决方案。

 

UMD的实现很简单，先判断是否支持Node.js模块格式（exports是否存在），存在则使用Node.js模块格式。

再判断是否支持AMD（define是否存在），存在则使用AMD方式加载模块。前两个都不存在，则将模块公开到全局（window或global）。

下面是一个示例

```js
(function (root, factory) {
  if(typeof exports === 'object' && typeof module === 'object')
    module.exports = factory();
  else if(typeof define === 'function' && define.amd)
    define([], factory);
  else if(typeof exports === 'object')
    exports["nav"] = factory();
  else
    root["nav"] = factory();
})(window, this, function() {
  // module
  return {
    addEvent: function(el, type, handle) {
      //...
    },
    removeEvent: function(el, type, handle) {
             
    },
  };
})
```






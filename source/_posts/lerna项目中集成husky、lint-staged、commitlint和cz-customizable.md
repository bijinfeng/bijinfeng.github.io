---
title: lerna项目中集成husky、lint-staged、commitlint和cz-customizable
date: 2021-04-02 23:07:17
tags:
---

Monorepo 是针对单仓库、多 package 的流行解决方案, lerna 是它的一种实现。

<!-- more -->


## 说明

重要package版本说明：

- "husky": "^6.0.0"
- "lint-staged": "^10.5.4"
- "@commitlint/cli": "^12.0.1"
- "@commitlint/config-conventional": "^12.0.1"
- "cz-customizable": "^6.3.0"


## 配置husky

在lerna项目根目录中安装`husky`:

```bash
yarn add husky -D
```

> 注意：husky v4和v6版本的配置方式大相径庭，这里只介绍v6版本的配置方式，v4的网上一搜一大把，这里不过多介绍

1. 在`package.json`的`scripts`中添加`"prepare": "husky install"`，并运行这条命令：

```bash
npm set-script prepare "husky install" && npm run prepare
```

2. 添加一个hook:

```bash
npx husky add .husky/pre-commit "npm test"
```

上面这个命令会在`.husky`目录下新建一个`pre-commit`文件，其内容如下：

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm test

```

以上都是手动安装`husky`的过程，当然官方也提供了一键安装和配置脚本，推荐使用：

```bash
npx husky-init && npm install       # npm
npx husky-init && yarn              # Yarn 1
yarn dlx husky-init --yarn2 && yarn # Yarn 2
```

如果使用的是v4版本的`husky`，想升级到v6，可以使用以下命名，一键迁移：

```bash
// npm
npm install husky@6 --save-dev \
  && npx husky-init \
  && npm exec -- github:typicode/husky-4-to-6 --remove-v4-config
  
// yarn 1
yarn add husky@6 --dev \
  && npx husky-init \
  && npm exec -- github:typicode/husky-4-to-6 --remove-v4-config

// yarn 2
yarn add husky@6 --dev \
  && yarn dlx husky-init --yarn2 \
  && npm exec -- github:typicode/husky-4-to-6 --remove-v4-config
```

> 更多配置，详见官方文档：https://typicode.github.io/husky/#/


## 配置lint-staged


在`lerna`项目中，由于所有子项目公用一个 repo 源代码仓库，因此它的 husky 钩子只能建立在最顶层目录；

而每次 commit 都很有可能是多个子项目都有改动，这个时候使用 `lint-staged` 时，就不但要区分文件类型，还要区分改动文件所在的子项目（因为不同的子项目可能会有不同的校验处理）。

这时，我们可以使用 lerna 命令来实现对“哪个子项目有修改”的判断；而 `lint-staged` 就需要安装在任何一个需要做校验的子项目中。

1. 添加或修改`.husky`目录下的`pre-commit`钩子如下：

```
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

lerna run --concurrency 1 --stream precommit --since HEAD --exclude-dependents

```


其中，`precommit` 是在`pre-commit`钩子中触发的子项目的命令

2. 在子项目中安装和配置`lint-staged`，并添加`precommit`命令

- 安装`lint-staged`：

```bash
lerna add lint-staged --scope=xxxx -D
```


- 在添加`precommit`命令：

```
"precommit": "lint-staged"
```

- 配置`lint-staged`：

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": [
    "eslint"
  ]
},
```

> 更多配置，详见官方文档：https://github.com/okonet/lint-staged#readme


## 配置commitlint和cz-customizable


每个团队对提交的commit message格式有约定俗称的要求，但是没有一个统一的规范，导致大家提交的commit message或多或少不太一样。因此，需要一个工具来帮助大家统一commit message的格式，也方便后续的分析和拓展。

`cz-customizable`是一个帮助书写commit message的工具，而`commitlint`是一个校验commit message的工具。

1. 安装`commitlint`和`cz-customizable`:

```bash
yarn add @commitlint/cli @commitlint/config-conventional cz-customizable -D
```

2. 添加`commit-msg`钩子

```bash
npx husky add .husky/commit-msg "yarn commitlint --edit"
```

生成如下文件：


```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

yarn commitlint --edit 
```

3. 在`package.json`中添加以下配置：

```json
{
  ...
  "config": {
    "commitizen": {
      "path": "./node_modules/cz-customizable"
    },
    "cz-customizable": {
      "config": "./.cz-config.js"
    }
  },
  ...
}
```

4. 在项目根目录中新建`.cz-config.js`文件，内容如下：

```js
module.exports = {
  types: [
    { value: 'feat', name: 'feat:     A new feature' },
    { value: 'fix', name: 'fix:      A bug fix' },
    {
      value: 'style',
      name:
        'style:    Changes that do not affect the meaning of the code\n            (white-space, formatting, missing semi-colons, etc)',
    },
    {
      value: 'refactor',
      name:
        'refactor: A code change that neither fixes a bug nor adds a feature',
    },
    { value: 'revert', name: 'revert:   Revert to a commit' },
    {
      value: 'chore',
      name:
        'chore:    Changes to the build process or auxiliary tools\n            and libraries such as documentation generation',
    },
    { value: 'docs', name: 'docs:     Documentation only changes' },
    {
      value: 'perf',
      name: 'perf:     A code change that improves performance',
    },
    { value: 'test', name: 'test:     Adding missing tests' },
  ],

  scopes: [
    { name: 'frontend' },
    { name: 'backend' },
    { name: 'service' },
  ],

  messages: {
    type: "Select the type of change that you're committing:",
    scope: "\n Select the scope of change that you're committing:",
    // used if allowCustomScopes is true
    customScope: 'Denote the custom scope:',
    subject: 'Write a SHORT, IMPERATIVE tense description of the change:\n',
    body:
      'Provide a LONGER description of the change (optional). Use "|" to break new line:\n',
    breaking: 'List any BREAKING CHANGES (optional):\n',
    footer:
      'List any ISSUES CLOSED by this change (optional). E.g.: #31, #34:\n',
    confirmCommit: 'Are you sure you want to proceed with the commit above?',
  },

  allowCustomScopes: true,
}

```

5. 在项目根目录中新建`.commitlintrc.js`文件，内容如下：

```js
const typeEnum = require('./.cz-config');

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', typeEnum.types.map((i) => i.value)],
    'scope-enum': [2, 'always', typeEnum.scopes.map((i) => i.name)],
    'scope-empty': [2, 'never'],
  },
};

```


配置完成后，每次提交commit时，可以使用`git cz`替换`git commit`命令，从而辅助我们更加规范的书写commit message。

> 更多详细配置，可以参考这篇文章：https://juejin.cn/post/6844903831893966856

## 总结

以上就是我对如何在lerna项目中配置husky、lint-staged和Cz工具的一些粗略认知，当然不仅仅是lerna项目，也适用于任何前端项目。

## 链接

- [husky官文文档](https://typicode.github.io/husky/#/)

- [lint-staged官方文档](https://typicode.github.io/husky/#/)

- [Cz工具集使用介绍](https://juejin.cn/post/6844903831893966856)

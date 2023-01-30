---
title: 使用 i18next & react-i18next 进行国际化
urlname: wsw9n2wof9gge7be
date: '2023-01-29 11:33:25 +0800'
tags: []
categories: []
---

[i18next](https://www.i18next.com/) 是社区中优秀的国际化框架，在 react 中广泛使用，我司的大量产品都使用 i18next 进行国际化，而 [react-i18next](https://react.i18next.com/) 是 i18next 的一个扩展，提供了一些 HOC 及 hook 方便我们在 react 中使用 i18next。

由于 electron 是多进程机制，主进程和渲染进程都需要个 i18next 实例，但是多实例带来了一些问题，比如多实例的语言如何同步，文案如何集中管理？

针对上面的两个问题，经过实践，我给出的解决方案如下：

1. 主进程负责加载用户选择的语言和对应的文案
2. 渲染进程通过进程通信从主进程的实例上获取初始化语言和文案初始化实例
3. 用户在渲染进程切换语言，通过进程通信，主进程的 i18next 实例加载新语言的文案，并返回给渲染进程动态加载到渲染进程的实例中

整个流程大致如下：
![](https://cdn.nlark.com/yuque/0/2023/jpeg/12711679/1674985695061-816932b3-df74-4162-af0b-832768d17345.jpeg)

## 主进程

用户选择的系统语言保存在 electron-store 中，通过 `getConfigStore`方法获取上次用户选择的系统语言，默认为中文

```typescript
import Store from "electron-store";

export interface StoreState {
  theme: string;
  config: NOTES.Config;
}

export const getConfigStore = <K extends keyof NOTES.Config>(key: K) => {
  return getStore<NOTES.Config[K]>(`config.${key}`);
};

export const setConfigStore = (value: Partial<NOTES.Config>) => {
  const config = getAllConfigStore();
  return setStore("config", { ...config, ...value });
};
```

[ i18next-fs-backend](https://github.com/i18next/i18next-fs-backend) 是 i18next 的一个扩展，允许 Node.js 从本地文件系统中加载翻译

```typescript
import i18next from "i18next";
import i18nextBackend from "i18next-fs-backend";

import { getConfigStore } from "./store";

i18next.use(i18nextBackend).init({
  lng: getConfigStore("lang") || "zh-CN",
  fallbackLng: "en-US",
  backend: {
    loadPath: path.join(__dirname, "./i18n/{{lng}}.json"),
  },
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
});

export default i18next;
```

i18next 实例初始化后，通过 `loadLanguages`加载对应语言的文案，`getResourceBundle`获取语言的文案，通过这两个方法，渲染进程就可以共享主进程的文案，实现文案的集中管理。

```typescript
import logger from "electron-log";

import i18next, { LngOptions } from "../../utils/i18n";

export const getI18nLanguages = () => {
  return LngOptions;
};

export const getI18nInitResource = async () => {
  const lng = i18next.language;
  const resource = await getI18nResource(lng);

  return { lng, resource };
};

export const getI18nResource = async (lng: string) => {
  await i18next.loadLanguages(lng).catch((err) => {
    logger.error(err);
  });

  return i18next.getResourceBundle(lng, "");
};

export const changeI18nLang = async (lng: string) => {
  return new Promise<boolean>((resolve) => {
    i18next.changeLanguage(lng, (err) => {
      if (err) logger.error(err);
      resolve(!err);
    });
  });
};
```

##

## 渲染进程

`invokeCommand`同学 window 上挂载的变量和主进程双向通行

```typescript
export const invokeCommand = <T>(type: string, payload = {}) => {
  return window.api.invoke<T>("fromRenderer", {
    type,
    payload,
  });
};
```

渲染进程通过 `invokeCommand` 调用主进程的 `getI18nInitResource` 方法获取初始的语言和文案完成实例的初始化。
用户切换语言时，同样通过进程通信获取新语言的文案，通过 `i18next.addResourceBundle`动态加载到实例中，调用 `i18next.changeLanguage`完成语言的切换。

```typescript
import i18next, { ResourceKey } from "i18next";
import { initReactI18next } from "react-i18next";

import { invokeCommand } from "@/commands";

export const initI18next = async () => {
  const { lng, resource } = await invokeCommand<{
    lng: string;
    resource: ResourceKey;
  }>("getI18nInitResource");

  return i18next.use(initReactI18next).init({
    lng,
    resources: {
      [lng]: {
        translation: resource,
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });
};

export const changeLanguage = async (lng: string) => {
  if (!i18next.hasResourceBundle(lng, "translation")) {
    // 动态加载语言
    const resource = await invokeCommand<ResourceKey>("getI18nResource", lng);
    i18next.addResourceBundle(lng, "translation", resource);
  }

  return i18next.changeLanguage(lng);
};

export default i18next;
```

## 总结：

electron 的多进程机制导致 i18next 不得不初始化出多个实例，但是我们同样可以利用进程通信，让一个实例加载文案，再同步到另一个实例，实现文案的集中管理。

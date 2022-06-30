---
title: 在 React 项目中优雅地使用 Typescript
date: 2021-04-19 16:00:33
tags:
---
{% img /gallery/react+ts.png %}
TypeScript 是 Javascript 的超集，扩展了 JavaScript 的语法，给 JavaScript 带来了静态类型支持，了解如何在 React 项目中优雅地使用 Typescript，能帮助我们写出更优雅的代码。

<!-- more -->

「优雅」的含义：

 - 减少编写冗余的类型定义、类型标注，充分利用ts的自动类型推断，以及外部提供的类型声明。
 - 类型安全：提供足够的类型信息来避免运行时错误，让错误暴露在开发期。这些类型信息同时能够提供代码补全、跳转到定义等功能。

## 组件定义

### 函数组件

```tsx
import * as React from 'react';
// 如果在tsconfig中设置了"allowSyntheticDefaultImports": true
// 你还可以更精练地import react：
// import React from "react";

interface IProps {
      // CSSProperties提供样式声明的类型信息
      // 用户传入style的时候就能够获得类型检查和代码补全
      style?: React.CSSProperties;
      // 使用@types/react提供的事件类型定义，这里指定event.target的类型是HTMLButtonElement
      onClick(event: React.MouseEvent<HTMLButtonElement>): void;
    // ...
}
const MyComponent: React.FC<IProps> = (props) => {
      const { children, ...restProps } = props;
    return <div {...restProps}>{children}</div>;
}
```

- FC是FunctionComponent的缩写。
- IProps无需声明children属性的类型。React.FC会自动为props添加这个属性类型。
  当然，如果children期望一个render prop，或者期望其他特殊的值，那么你还是要自己给children声明类型，而不是使用默认 
  的React.ReactNode。
- props无需做类型标注。

#### 函数组件defaultProps（Deprecate）

如果你需要定义defaultProps，那么不要使用React.FC，因为[React.FC对defaultProps的支持不是很好](https://github.com/typescript-cheatsheets/react#typing-defaultprops)：

```tsx
const defaultProps = {
  who: "Johny Five"
};
type IProps = { age: number } & typeof defaultProps;

export const Greet = (props: IProps) => { return <div>123</div> };
Greet.defaultProps = defaultProps;
```

事实上，[一个提议在函数组件中废弃defaultProps的React rfc已经被接受](https://github.com/reactjs/rfcs/blob/createlement-rfc/text/0000-create-element-changes.md#deprecate-defaultprops-on-function-components)，所以以后还是尽量减少在函数组件上使用defaultProps，使用ES6原生的参数解构+默认参数特性就已经能够满足需要：

```tsx
const TestFunction: FunctionComponent<Props> = ({ foo = "bar" }) => <div>{foo}</div>
```

### 类组件

```tsx
interface IProps {
  message: string;
}
interface IState {
  count: number;
}
export class MyComponent extends React.Component<IProps, IState> {
  state: IState = {
    // duplicate IState annotation for better type inference
    count: 0
  };
  render() {
    return (
      <div>
        {this.props.message} {this.state.count}
      </div>
    );
  }
}
```

- 如果你通过声明state属性来初始化state，那么你需要为这个属性增加IState类型标注。虽然这与前面的React.Component<IProps, IState>有重复的嫌疑，但是这两者实际上是不同的：
    - React.Component<IProps, IState>只是标注了基类的state属性类型。
    - 而当你在子类声明state时，你可以为state标注一个【IState的子类型】作为override。这样，this.state会以子类中的state属性声明作为类型信息的来源。
- 建议使用函数组件。


## 可渲染节点类型

可渲染节点就是：可以直接被组件渲染函数返回的值。

与可渲染节点有关的类型定义如下（摘录自[@types/react](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/8a1b68be3a64e5d2aa1070f68cc935d668a976ad/types/react/index.d.ts#L187）：

```ts
type ReactText = string | number;
type ReactChild = ReactElement | ReactText;
interface ReactNodeArray extends Array<ReactNode> {}
type ReactFragment = {} | ReactNodeArray;
type ReactNode = ReactChild | ReactFragment | ReactPortal | boolean | null | undefined;
```

## 组件类型

- `React.FC<Props>`（即 `React.FunctionComponent<Props>`）
- `React.Component<Props, State>`
- `React.ComponentType<Props>`（即`ComponentClass<P> | FunctionComponent<P>`）

在写HOC的时候经常用到。

```tsx
const withState = <P extends WrappedComponentProps>(
  WrappedComponent: React.ComponentType<P>,
) => { ...
```

## 获取并扩展原生元素的props类型

比如，以下例子获取并扩展了`<button>`的props类型：

```tsx
export const PrimaryButton = (
  props: Props & React.HTMLProps<HTMLButtonElement>
) => <Button size={ButtonSizes.default} {...props} />;
```

PrimaryButton能够接受所有原生`<button>`所接受的`props`。关键在于`React.HTMLProps`。

## 获取并扩展第三方组件的props类型

```tsx
import { Button } from "library"; // but doesn't export ButtonProps! oh no!
type ButtonProps = React.ComponentProps<typeof Button>; // no problem! grab your own!
type AlertButtonProps = Omit<ButtonProps, "onClick">; // modify
const AlertButton: React.FC<AlertButtonProps> = props => (
  <Button onClick={() => alert("hello")} {...props} />
);
```

## 事件类型

`@types/react`提供了各种事件的类型，比如以下是使用`React.FormEvent`的例子：

```tsx
class App extends React.Component<
  {},
  {
    text: string
  }
> {
  state = {
    text: '',
  }
  onChange = (e: React.FormEvent<HTMLInputElement>): void => {
    this.setState({ text: e.currentTarget.value })
  }
  render() {
    return (
      <div>
        <input type="text" value={this.state.text} onChange={this.onChange} />
      </div>
    )
  }
}
```

在React中，所有事件（包括[FormEvent](https://reactjs.org/docs/events.html#form-events)、[KeyboardEvent](https://reactjs.org/docs/events.html#keyboard-events)、[MouseEvent](https://reactjs.org/docs/events.html#mouse-events)等）都是[SyntheticEvent](https://reactjs.org/docs/events.html)的子类型。他们在@types/react中定义如下：

```tsx
// DOM事件的基本属性都定义在这里
interface BaseSyntheticEvent<E = object, C = any, T = any> {
  nativeEvent: E;
  currentTarget: C;
  target: T;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean;
  eventPhase: number;
  isTrusted: boolean;
  preventDefault(): void;
  isDefaultPrevented(): boolean;
  stopPropagation(): void;
  isPropagationStopped(): boolean;
  persist(): void;
  timeStamp: number;
  type: string;
}
interface SyntheticEvent<T = Element, E = Event> extends BaseSyntheticEvent<E, EventTarget & T, EventTarget> {}

// 具体的事件类型：
interface FormEvent<T = Element> extends SyntheticEvent<T> {}
interface KeyboardEvent<T = Element> extends SyntheticEvent<T, NativeKeyboardEvent> {
  altKey: boolean;
  // ...
}
interface MouseEvent<T = Element, E = NativeMouseEvent> extends SyntheticEvent<T, E> {
  altKey: boolean;
  // ...
}
// ...
```





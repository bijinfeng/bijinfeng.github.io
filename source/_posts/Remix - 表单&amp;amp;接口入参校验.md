---
abbrlink: ''
categories:
- - React
- - Remix
date: '2022-04-18 10:20:24'
tags:
- Remix
- React
title: Remix - 表单&接口入参校验
updated: Tue, 18 Apr 2023 05:15:48 GMT
---
## 前言

[Remix](https://https://remix.run/) 是 React Router 团队开发的基于 React 框架的全栈 Web 框架。既然是基于 React 框架，那么在 React 中能够使用的表单校验方案，同样适用于 Remix。

Remix 中的客户端表单校验可以采用 React 的表单校验方案，但是 Remix 作为一个全栈框架，自然是有服务端接口的，那么其入参校验也是否可以采用 node 后端通用的参数校验方案？

下面我们就看看在前后端都是怎么校验参数的

## React 表单校验

#### 框架内置校验

用过 React 组件库同学应该都知道，这些组件库内部一般都会内置一个表单校验模块，例如 [Ant Design](https://ant.design/index-cn) ：

```tsx
import React from 'react';
import { Button, Checkbox, Form, Input } from 'antd';

const onFinish = (values: any) => {
  console.log('Success:', values);
};

const onFinishFailed = (errorInfo: any) => {
  console.log('Failed:', errorInfo);
};

const App: React.FC = () => (
  <Form
    name="basic"
    labelCol={{ span: 8 }}
    wrapperCol={{ span: 16 }}
    style={{ maxWidth: 600 }}
    initialValues={{ remember: true }}
    onFinish={onFinish}
    onFinishFailed={onFinishFailed}
    autoComplete="off"
  >
    <Form.Item
      label="Username"
      name="username"
      rules={[{ required: true, message: 'Please input your username!' }]}
    >
      <Input />
    </Form.Item>

    <Form.Item
      label="Password"
      name="password"
      rules={[{ required: true, message: 'Please input your password!' }]}
    >
      <Input.Password />
    </Form.Item>

    <Form.Item name="remember" valuePropName="checked" wrapperCol={{ offset: 8, span: 16 }}>
      <Checkbox>Remember me</Checkbox>
    </Form.Item>

    <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
      <Button type="primary" htmlType="submit">
        Submit
      </Button>
    </Form.Item>
  </Form>
);

export default App;
```

#### 独立校验模块

脱离组件库框架后，前端社区里还是有很多可选的校验模块，这里我只介绍两个我使用过并且绝对特别好用的库：

* [react-hook-form](https://https://react-hook-form.com/)
  从名字中就能看出，这个库主要适用于 React 框架，因此用原生开发时需要校验表单强烈推荐该库，并且其也能很好的融入现有组件库。

  ```tsx
  import { useForm } from "react-hook-form";

  export default function App() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const onSubmit = data => console.log(data);

    console.log(watch("example")); // watch input value by passing the name of it

    return (
      /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* register your input into the hook by invoking the "register" function */}
        <input defaultValue="test" {...register("example")} />

        {/* include validation with required or other standard HTML validation rules */}
        <input {...register("exampleRequired", { required: true })} />
        {/* errors will return when field validation fails  */}
        {errors.exampleRequired && <span>This field is required</span>}

        <input type="submit" />
      </form>
    );
  }
  ```
* [Zod](https://https://zod.dev/)

  这个库就是个纯粹的字段校验的库了，正是因为纯粹，社区为其开发了各种适配器，可以将 zod   应用到任何需要字段校验的地方，下面看下 zod 如何应用在 React 表单校验：

  ```tsx
  import { z } from "zod";
  import { useZorm } from "react-zorm";

  const FormSchema = z.object({
      name: z.string().min(1),
      password: z
          .string()
          .min(10)
          .refine((pw) => /[0-9]/.test(pw), "Password must contain a number"),
  });

  function Signup() {
      const zo = useZorm("signup", FormSchema, {
          onValidSubmit(e) {
              e.preventDefault();
              alert("Form ok!\n" + JSON.stringify(e.data, null, 2));
          },
      });
      const disabled = zo.validation?.success === false;

      return (
          <form ref={zo.ref}>
              Name:
              <input
                  type="text"
                  name={zo.fields.name()}
                  className={zo.errors.name("errored")}
              />
              {zo.errors.name((e) => (
                  <ErrorMessage message={e.message} />
              ))}
              Password:
              <input
                  type="password"
                  name={zo.fields.password()}
                  className={zo.errors.password("errored")}
              />
              {zo.errors.password((e) => (
                  <ErrorMessage message={e.message} />
              ))}
              <button disabled={disabled} type="submit">
                  Signup!
              </button>
              <pre>Validation status: {JSON.stringify(zo.validation, null, 2)}</pre>
          </form>
      );
  }
  ```

## 服务端接口入参校验

在服务端校验入参本质上就是校验字段，那么先看下其它的 node 服务端框架都是怎么校验参数的：

- [Egg](https://https://www.eggjs.org/)

Egg 使用 [egg-validate](https://github.com/eggjs/egg-validate) 模块进行参数校验，基本用法如下：

```js
class XXXController extends app.Controller {
  // ...
  async XXX() {
    const {ctx} = this;
    ctx.validate({
      system  : {type: 'string', required: false, defValue: 'account', desc: '系统名称'},
      token   : {type: 'string', required: true, desc: 'token 验证'},
      redirect: {type: 'string', required: false, desc: '登录跳转'}
    });
    // if (config.throwError === false)
    if(ctx.paramErrors) {
      // get error infos from `ctx.paramErrors`;
    }
    let params = ctx.params;
    let {query, body} = ctx.request;
    // ctx.params        = validater.ret.params;
    // ctx.request.query = validater.ret.query;
    // ctx.request.body  = validater.ret.body;
    // ...
    ctx.body = query;
  }
  // ...
}
```

- [nestjs](https://docs.nestjs.com/)

nestjs 主要使用第三方的 [class-validator](https://github.com/typestack/class-transformer) 来进行参数校验。

```ts
import { Injectable, PipeTransform, ArgumentMetadata, ValidationError, HttpException, HttpStatus } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * 这是一个全局的参数验证管道，基于class-transformer
 * 如果失败，则会抛出HttpException
 * 在main.ts的nestApp要将它设为全局的
 */

@Injectable()
export class ValidationPipe implements PipeTransform {
    async transform(value: any, { metatype }: ArgumentMetadata) {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }
        const object = plainToClass(metatype, value);
        const errors = await validate(object);
        const errorList: string[] = [];
        const errObjList: ValidationError[] = [...errors];

        do {
            const e = errObjList.shift();
            if (!e) {
                break;
            }
            if (e.constraints) {
                for (const item in e.constraints) {
                    errorList.push(e.constraints[item]);
                }
            }
            if (e.children) {
                errObjList.push(...e.children);
            }
        } while (true);
        if (errorList.length > 0) {
            throw new HttpException('请求参数校验错误:' + errorList.join(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return object;
    }

    private toValidate(metatype: Function): boolean {
        const types: Function[] = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }
}

```

从上面的两个框架可以看出来，对于如何进行参数校验，大家的处理过程都是差不多的，都是先定义一套规则，然后用这套规则去校验字段。

那么在 remix 中校验入参自然也是这个流程，下面的示例中会使用 zod 来校验参数：

```ts
import type { ActionArgs } from "@remix-run/node";
import { z } from "zod";
import { parseFormAny, useZorm } from "react-zorm";

const LoginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Invalid email" }),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
  remember: z.optional(z.boolean()),
});

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const result = await LoginSchema.safeParseAsync(parseFormAny(formData));

  if (!result.success) {
    return json({ errors: result.error }, { status: 400 });
  }
}
```

## 前后端校验统一

上面分别介绍了如何在前后端校验参数，但是如果是一个前后端分离的项目，那么前后端分开校验并且使用不同的校验方案自然是没有问题的，但是在 remix 这么一个全栈框架里使用两套校验方案，多少显得有些冗余了，而且很容易导致前后端校验不一致的问题。

那么有没有一种方案，可以只写一套校验规则，同时适用于前后端吗？

自然是可以的，其实上文已经给出了答案，就是使用 zod 来校验参数，下面给出个完整的示例：

```tsx
import React from "react";
import { IconBrandGithub, IconBrandTwitter } from "@tabler/icons-react";
import { Link, Form } from "@remix-run/react";
import type { ActionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { parseFormAny, useZorm } from "react-zorm";
import { z } from "zod";

import LoginLayout from "~/components/user-layout";
import FormInner from "~/components/form/form-inner";
import Input from "~/components/input";
import Button from "~/components/button";
import Checkbox from "~/components/checkbox";
import { loginUser, setAuthSession } from "~/modules/auth";
import { authCookie } from "~/integrations/supabase";

const LoginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Invalid email" }),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
  remember: z.optional(z.boolean()),
});

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const result = await LoginSchema.safeParseAsync(parseFormAny(formData));
  let session = await authCookie.getSession(request.headers.get("Cookie"));

  if (!result.success) {
    return json({ errors: result.error }, { status: 400 });
  }

  const { accessToken, refreshToken, error } = await loginUser(
    result.data.email,
    result.data.password
  );

  if (error || !accessToken || !refreshToken) {
    return json({ formError: error || "Something went wrong" }, 403);
  }

  session = setAuthSession(session, accessToken, refreshToken);

  return redirect("/", {
    headers: {
      "Set-Cookie": await authCookie.commitSession(session),
    },
  });
}

const Login: React.FC = () => {
  const zo = useZorm("NewQuestionWizardScreen", LoginSchema);

  const renderFooter = () => (
    <>
      <div className="hr-text">or</div>
      <div className="card-body">
        <div className="row">
          <div className="col">
            <Button
              href="#"
              icon={<IconBrandGithub className="text-github" />}
              block
            >
              Login with Github
            </Button>
          </div>
          <div className="col">
            <Button
              href="#"
              icon={<IconBrandTwitter className="text-twitter" />}
              block
            >
              Login with Twitter
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <LoginLayout
      title="Login to your account"
      footer={renderFooter()}
      description={
        <>
          Don't have account yet? <Link to="/sign-up">Sign up</Link>
        </>
      }
    >
      <Form ref={zo.ref} method="post" replace>
        <FormInner
          label="Email address"
          required
          error={zo.errors.email()?.message}
        >
          <Input
            name={zo.fields.email()}
            type="email"
            placeholder="your@email.com"
          />
        </FormInner>
        <FormInner
          label="Password"
          required
          labelSuffix={<Link to="/forgot-password">I forgot password</Link>}
          error={zo.errors.password()?.message}
        >
          <Input
            name={zo.fields.password()}
            type="password"
            placeholder="Your password"
          />
        </FormInner>
        <div className="mb-2">
          <Checkbox name={zo.fields.remember()}>
            Remember me on this device
          </Checkbox>
        </div>
        <div className="form-footer">
          <Button buttonType="submit" type="primary" block>
            Sign in
          </Button>
        </div>
      </Form>
    </LoginLayout>
  );
};

export default Login;

```

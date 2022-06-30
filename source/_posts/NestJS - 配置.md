---
title: NestJS - 配置
date: 2021-03-17 11:25:10
tags:
---

应用程序通常运行在不同的环境，例如，开发有开发环境、测试环境，线上有预发布环境、生产环境，而运行在不同的环境，需要有不同的配置，例如数据库的配置等。

<!-- more -->

在`Node`中，外部定义的环境变量通过`procress.env`全局可见。在Node.js应用程序中，通常使用`.env`文件来配置这些环境变量，其中每个键代表一个特定的值，以代表每个环境。

解析`.env`文件并加载到`procress.env`中，就需要使用`dotenv`这个包了，但是Nest提供了一个配置环境变量的软件包 - `@nestjs/config`，其内部依赖了`dotenv`。

## 安装`@nestjs/config`

```shell
// npm
$ npm i --save @nestjs/config

// yarn
$ yarn add @nestjs/config
```

## 简单使用

安装完成后，我们可以导入`ConfigModule`。通常，我们将其导入根目录`AppModule`并使用. `forRoot()`静态方法控制其行为。在此步骤中，将解析并生成环境变量键/值对。稍后，我们将在其他功能模块中看到一些用于访问的`ConfigService`类的选项`ConfigModule`。

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
})
export class AppModule {}
```

上面的代码将从`.env`默认位置（项目根目录）加载并解析文件，将文件中的键/值对`.env`与分配给其的环境变量合并`process.env`，并将结果存储在私有结构中，您可以通过访问该私有结构`ConfigService`。该`forRoot()`方法注册了`ConfigService`提供程序，该提供程序提供了`get()`一种读取这些已解析/合并的配置变量的方法。由于`@nestjs/config`依赖于[dotenv](https://github.com/motdotla/dotenv)，因此它使用该程序包的规则来解决环境变量名称中的冲突。当密钥在运行时环境中作为环境变量（例如，通过OS shell导出之类export DATABASE_USER=test）和在`.env`文件中同时存在时，运行时环境变量优先。

示例`.env`文件如下所示：

```bash
DATABASE_USER=test
DATABASE_PASSWORD=test
```

## 自定义ENV文件路径

默认情况下，程序会在应用程序的根目录中查找`.env`文件。要为`.env`文件指定其他路径，请设置`forRoot()`的可选属性`envFilePath`，如下所示：

```typescript
ConfigModule.forRoot({
  envFilePath: '.development.env',
});
```

您还可以为`.env`文件指定多个路径，如下所示：

```typescript
ConfigModule.forRoot({
  envFilePath: ['.env.development.local', '.env.development'],
});
```

如果在多个文件中找到一个变量，则第一个优先。

在实际开发中，往往有多个配置文件，比如开发环境使用`.development.env`配置文件，测试环境使用`.test.env`配置文件，生产环境使用`.production.env`配置文件，然后使用不同的启动命令，启用不同的配置文件，示例如下：

```json
// package.json
{
    ...
    "scripts": {
        "start": "cross-env NODE_ENV=development nest start",
        "start:dev": "cross-env NODE_ENV=development nest start --watch",
        "start:prod": "cross-env NODE_ENV=production node dist/main",
        "test": "cross-env NODE_ENV=test jest",
      },
    ...
}
```

> 安装`cross-env`，使用它跨平台的设置环境变量

```typescript
ConfigModule.forRoot({
  envFilePath: `${process.env.NODE_ENV || 'development'}.env`,
});
```

## 使用全局module

如果要`ConfigModule`在其他模块中使用，则需要将其导入（这是所有Nest模块的标准配置）。或者，通过将`options`对象的`isGlobal`属性设置为`true`，将其声明为全局模块，如下所示。在这种情况下，一旦`ConfigModule`被加载到根模块中，就不需要在其他模块中导入`ConfigModule`了

```ts
ConfigModule.forRoot({
  isGlobal: true,
});
```

## 自定义配置文件

对于更复杂的项目，可以使用自定义配置文件返回嵌套的配置对象。这允许您按功能对相关配置设置进行分组（例如，与数据库相关的设置），并将相关设置存储在单个文件中，以帮助独立管理它们。

自定义配置文件导出一个工厂函数，该函数返回一个配置对象。配置对象可以是任何任意嵌套的普通JavaScript对象。`process.env`对象将包含完全解析的环境变量key-value对（如上所述，.env文件和外部定义的变量被解析和合并）。由于你控制了返回的配置对象，你可以添加任何所需的逻辑来将值投射到一个适当的类型，设置默认值等。例如


```ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432
  }
});
```

将其传给`ConfigModule.forRoot()`的`load`属性，来加载这个自定义配置：

```ts
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
  ],
})
export class AppModule {}
```

> load属性是个数组，允许加载多个自定义配置文件

通过自定义配置文件，我们还可以管理自定义文件，如YAML文件。下面是一个使用YAML格式的配置的例子。

```yaml
http:
  host: 'localhost'
  port: 8080

db:
  postgres:
    url: 'localhost'
    port: 5432
    database: 'yaml-db'

  sqlite:
    database: 'sqlite.db'
```

为了读取和解析YAML文件，我们可以利用`js-yaml`包。

```shell
$ npm i js-yaml
$ npm i -D @types/js-yaml
```

安装软件包后，我们将使用yaml#load函数来加载刚刚在上面创建的YAML文件。

```ts
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

const YAML_CONFIG_FILENAME = 'config.yml';

export default () => {
  return yaml.load(
    fs.readFileSync(join(__dirname, YAML_CONFIG_FILENAME), 'utf8'),
  );
};
```

## 使用`ConfigService`

要从`ConfigService`中访问配置值，我们首先得注入`ConfigService`，和使用其他`provider`一样，我们需要将其加入@Module的`imports`属性中（如果将`ConfigModule`配置成全局module，则可以忽略这一步）


```ts
@Module({
  imports: [ConfigModule],
  // ...
})
```

然后我们可以使用标准的构造函数注入:

```ts
// import { ConfigService } from '@nestjs/config';

constructor(private configService: ConfigService) {}
```

获取

```ts
// get an environment variable
const dbUser = this.configService.get<string>('DATABASE_USER');

// get a custom configuration value
const dbHost = this.configService.get<string>('database.host');
```

如上所示，使用`configService.get()`方法通过传递变量名来获取一个简单的环境变量。你可以通过传递类型来做TypeScript类型提示，如上所示(例如，`get<string>(…)`)。`get()`方法也可以遍历一个嵌套的自定义配置对象（通过自定义配置文件创建），如上面第二个例子所示。

你也可以使用一个接口作为类型提示来获得整个嵌套的自定义配置对象。

```ts
interface DatabaseConfig {
  host: string;
  port: number;
}

const dbConfig = this.configService.get<DatabaseConfig>('database');

// you can now use `dbConfig.port` and `dbConfig.host`
const port = dbConfig.port;
```

`get()`方法还需要一个可选的第二个参数，定义一个默认值，当键不存在时，将返回默认值，如下所示:

```ts
// use "localhost" when "database.host" is not defined
const dbHost = this.configService.get<string>('database.host', 'localhost');
```

`ConfigService`有一个可选的泛型(类型参数)来帮助防止访问不存在的配置属性。使用方法如下:

```ts
interface EnvironmentVariables {
  PORT: number;
  TIMEOUT: string;
}

// somewhere in the code
constructor(private configService: ConfigService<EnvironmentVariables>) {
  // this is valid
  const port = this.configService.get<number>('PORT');

  // this is invalid as URL is not a property on the EnvironmentVariables interface
  const url = this.configService.get<string>('URL');
}
```

## 配置命名空间

`ConfigModule`允许您定义和加载多个自定义配置文件，如上面的自定义配置文件所示。您可以使用嵌套的配置对象管理复杂的配置对象层次，如该节所示。另外，您也可以使用 registerAs()函数返回一个 "namespaced "的配置对象，如下所示。

```ts
import { registerAs } from '@nestjs/config';
 
export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT || 5432
}));
```

用`forRoot()`方法的参数对象的`load`属性加载一个命名空间的配置，与加载自定义配置文件的方式相同。

```ts
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig],
    }),
  ],
})
export class AppModule {}
```

现在，要从`database`命名空间中获取`host`，使用点操作符。使用`database`作为属性名的前缀，对应于命名空间的名称（作为 `registerAs()` 函数的第一个参数传递）。

```ts
const dbHost = this.configService.get<string>('database.host');
```

一个合理的选择是直接注入`database`命名空间。这使我们能够从强类型化中获益。

```ts
// import { ConfigType } from '@nestjs/config';

constructor(
  @Inject(databaseConfig.KEY)
  private dbConfig: ConfigType<typeof databaseConfig>,
) {}
```

## 缓存环境变量

由于访问`process.env`会很慢，你可以设置传递给`ConfigModule.forRoot()`的`options`对象的`cache`属性，以提高`ConfigService`的性能。

```ts
ConfigModule.forRoot({
  cache: true,
});
```

## 部分注册

到目前为止，我们已经用`forRoot()`方法处理了根模块(如`AppModule`)中的配置文件。也许你有一个更复杂的项目结构，特定功能的配置文件位于多个不同的目录中。`@nestjs/config`包提供了一个叫做部分注册的功能，它只引用与每个功能模块相关联的配置文件，而不是在根模块中加载所有这些文件。在特性模块中使用`forFeature()`静态方法来执行这个部分注册，如下所示。

```ts
import databaseConfig from './config/database.config';

@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
})
export class DatabaseModule {}
```

## 校验环境变量


如果所需的环境变量没有被提供或不符合某些验证规则，在应用程序启动时抛出异常是标准做法。`@nestjsconfig`包有两种不同的方式来实现这一点。

- [Joi](https://github.com/sideway/joi)内置验证器。使用Joi，你可以定义一个对象模式，并对其进行JavaScript对象验证。
- 一个自定义的`validate()`函数，它接受环境变量作为输入。

要使用Joi，我们必须安装Joi包:

```shell
$ yarn add joi
```

> 最新版本的joi需要你运行Node v12或更高版本。旧版本的node请安装v16.1.8。这主要是在v17.0.2发布后，在构建的时候会出现错误。更多信息请参考其17.0.0发布说明(https://github.com/sideway/joi/issues/2262)。

现在我们可以定义一个Joi验证模式，并通过`forRoot()`方法的选项对象的`validationSchema`属性传递，如下图所示。

```ts
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().default(3000),
      }),
    }),
  ],
})
export class AppModule {}
```

默认情况下，所有的 schema keys 都被认为是可选的。这里，我们为 `NODE_ENV`和`PORT`设置了默认值，如果我们不在环境(.env文件或进程环境)中提供这些变量，就会使用这些变量。另外，我们也可以使用 `required()` 验证方法来要求必须在环境 (.env 文件或进程环境) 中定义一个值。在这种情况下，如果我们没有在环境中提供变量，验证步骤将抛出一个异常。关于如何构造验证模式，请参见Joi验证方法。

默认情况下，允许未知的环境变量（模式中键不存在的环境变量），并且不会触发验证异常。默认情况下，所有的验证错误都会被报告。你可以通过`forRoot()`选项对象的`validationOptions`键传递一个选项对象来改变这些行为。这个选项对象可以包含Joi验证选项提供的任何标准验证选项属性。例如，要反转上面的两个设置，可以传递这样的选项。


```ts
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().default(3000),
      }),
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
  ],
})
export class AppModule {}
```

`@nestjsconfig`包使用的默认设置是:

- `allowUnknown`：控制是否允许在环境变量中使用未知键。默认为`true`。
- `abortEarly`： 如果为true，则在第一个错误时停止验证；如果为false，则返回所有错误。默认值为`false`。

请注意，一旦你决定传递一个`validationOptions`对象，你没有明确传递的任何设置都将默认为Joi标准默认值（而不是`@nestjsconfig`默认值）。例如，如果你在你的自定义`validationOptions`对象中没有指定`allowUnknowns`，它将有Joi默认值`false`。因此，在您的自定义对象中指定这两个设置可能是最安全的。

## 自定义校验函数

另外，你也可以指定一个同步的`validate`函数，该函数接收一个包含环境变量的对象（来自env文件和进程），并返回一个包含验证过的环境变量的对象，这样你就可以在需要的时候转换它们。如果函数抛出一个错误，它将阻止应用程序的引导。

在这个例子中，我们将继续使用`class-transformer`和`class-validator`包。首先，我们必须定义。

- 一个具有验证约束的类，
- 一个使用 `plainToClass` 和 `validateSync` 函数的验证函数。

```ts
import { plainToClass } from 'class-transformer';
import { IsEnum, IsNumber, validateSync } from 'class-validator';

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
  Provision = "provision",
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
```

完成这些之后，使用`validate`函数作为`ConfigModule`的配置选项，如下所示:

```ts
import { validate } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
    }),
  ],
})
export class AppModule {}
```

## 自定义getter函数

`ConfigService`定义了一个通用的`get()`方法，通过键来检索配置值。我们还可以添加getter函数，以实现更自然的编码风格。

```ts
@Injectable()
export class ApiConfigService {
  constructor(private configService: ConfigService) {}

  get isAuthEnabled(): boolean {
    return this.configService.get('AUTH_ENABLED') === 'true';
  }
}
```

现在我们可以使用getter函数如下:

```ts
@Injectable()
export class AppService {
  constructor(apiConfigService: ApiConfigService) {
    if (apiConfigService.isAuthEnabled) {
      // Authentication is enabled
    }
  }
}
```

## 可扩展变量

`@nestjsconfig`支持环境变量扩展。通过这种技术，你可以创建嵌套的环境变量，其中一个变量被引用到另一个变量的定义中。比如说

```shell
APP_URL=mywebsite.com
SUPPORT_EMAIL=support@${APP_URL}
```

通过这种结构，变量`SUPPORT_EMAIL`解析为`support@mywebsite.com`。请注意使用 `${...}` 语法来触发解析 `SUPPORT_EMAIL` 定义中的变量 `APP_URL` 的值。

> 对于这个功能，`@nestjsconfig`包内部使用`dotenv-expand`。

使用传递给`ConfigModule`的`forRoot()`方法的选项对象中的`expandVariables`属性启用环境变量扩展，如下所示。

```ts
@Module({
  imports: [
    ConfigModule.forRoot({
      // ...
      expandVariables: true,
    }),
  ],
})
export class AppModule {}
```

## 在 `main.ts` 中使用

虽然我们的配置是存储在service中的，但它仍然可以在`main.ts`文件中使用。这样，你就可以用它来存储变量，如应用程序端口或CORS host。

要访问它，你必须使用`app.get()`方法，然后是服务引用。

```ts
const configService = app.get(ConfigService);
```

然后，你可以像往常一样，通过调用配置键的get方法来使用它。

```ts
const port = configService.get('PORT');
```

> 本文基本上是官文文档中有关配置部分的中文翻译（https://docs.nestjs.com/techniques/configuration），有时间再写个实战文章。

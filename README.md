# Better ArkTS 语法高亮插件

(非官方)为 VSCode 提供 ARKTS 和 JSON5 语言语法高亮支持的插件。

## 功能特性

- ✅ **ArkTS 语法高亮**: 为 ARKTS 代码提供完整的语法高亮
- ✅ **JSON5 语法高亮**: 为 JSON5 文件提供完整的语法高亮
- ✅ **装饰器支持**: 高亮 ArkUI 装饰器（@Entry, @Component, @State 等）
- ✅ **关键字高亮**: 支持 ARKTS 所有关键字
- ✅ **类型系统**: 高亮类型、接口、类定义
- ✅ **字符串和数字**: 支持单引号、双引号、模板字符串和各种数字格式
- ✅ **注释支持**: 单行注释（//）和多行注释（/* */）
- ✅ **函数高亮**: 函数声明和调用高亮
- ✅ **文件关联**: 自动识别 `.ets` 文件为 ARKTS 语言，`.json5` 文件为 JSON5 语言

## 支持的语法元素

### ArkTS 关键字
- 控制流: `if`, `else`, `for`, `while`, `do`, `switch`, `case`, `break`, `continue`, `return`
- 声明: `let`, `const`, `var`, `function`, `class`, `interface`, `enum`, `struct`, `type`, `import`, `export`
- 运算符: `typeof`, `instanceof`, `in`, `of`, `async`, `await`
- 其他: `true`, `false`, `null`, `undefined`, `void`
- 修饰符: `public`, `private`, `protected`, `static`, `readonly`, `abstract`

### ArkUI 装饰器
- `@Entry` - 页面入口装饰器
- `@Component` - 组件装饰器
- `@State` - 状态变量装饰器
- `@Prop` - 属性装饰器
- `@Link` - 双向绑定装饰器
- `@Builder` - 构建函数装饰器
- `@Provide` / `@Consume` - 提供和消费装饰器
- `@ObjectLink` - 对象链接装饰器
- `@Watch` - 监听装饰器
- `@CustomDialog` - 自定义对话框装饰器

### ArkTS 类型
- 基本类型: `string`, `number`, `boolean`, `void`, `any`, `never`, `unknown`, `object`, `symbol`, `bigint`
- 内置类: `Array`, `Map`, `Set`, `Promise`, `Function`, `Date`, `RegExp`, `Error`, `Math`, `JSON`, `Object`

### ArkUI 组件
- 布局组件: `Row`, `Column`, `Stack`, `Flex`, `Grid`, `List`, `Tabs`
- 基础组件: `Text`, `Image`, `Button`, `TextInput`, `Slider`, `Toggle`
- 容器组件: `Scroll`, `Swiper`, `Navigator`, `Web`

### JSON5 特性
- **注释支持**: 单行注释 (`//`) 和多行注释 (`/* */`)
- **灵活的键名**: 可以使用无引号的键名
- **多种字符串**: 支持单引号、双引号和多行字符串 (`'''...'''`)
- **尾随逗号**: 允许对象和数组末尾的逗号
- **数字格式**: 支持十六进制 (`0x`)、八进制 (`0o`)、二进制 (`0b`) 和科学计数法
- **特殊值**: 支持 `Infinity`, `-Infinity`, `NaN`

## 安装

### 从 VSCode Marketplace 安装（推荐）
1. 打开 VSCode
2. 进入扩展市场（Extensions）
3. 搜索 "Better ArkTS"
4. 点击安装

### 从本地安装
1. 克隆或下载此仓库
2. 在 VSCode 中按 `F5` 启动扩展开发主机
3. 或者运行 `pnpm install` 安装依赖
4. 运行 `pnpm run compile` 编译插件
5. 使用 `vsce package` 打包为 `.vsix` 文件
6. 在 VSCode 中通过 "Install from VSIX..." 安装

## 使用

安装插件后，打开 `.ets` 文件即可看到 ArkTS 语法高亮效果，打开 `.json5` 文件即可看到 JSON5 语法高亮效果。

### ArkTS 示例代码

```arkts
@Entry
@Component
struct Index {
    @State message: string = 'Hello World';
    
    build() {
        Row() {
            Column() {
                Text(this.message)
                    .fontSize(50)
                    .fontWeight(FontWeight.Bold)
            }
            .width('100%')
        }
        .height('100%')
    }
}
```

### JSON5 示例代码

```json5
{
  // 这是一个 JSON5 配置文件
  // 支持单行注释

  /*
   * 支持多行注释
   */

  // 键可以不用引号
  name: "My Project",
  version: 1.0,
  
  // 支持尾随逗号
  keywords: [
    "arkts",
    "json5",
    "syntax",
  ],

  // 支持单引号字符串
  description: 'JSON5 配置文件示例',
  
  // 支持多行字符串
  multiLineString: '''
    这是一个
    多行字符串
    示例
  ''',

  // 支持十六进制、八进制、二进制数字
  hexNumber: 0xFF,
  octalNumber: 0o755,
  binaryNumber: 0b1010,
  
  // 支持浮点数
  floatNumber: 3.14159,
  scientific: 1.23e+10,

  // 支持特殊值
  specialValues: {
    infinity: Infinity,
    negativeInfinity: -Infinity,
    notANumber: NaN,
  },

  // 嵌套对象
  config: {
    enabled: true,
    settings: {
      theme: "dark",
      fontSize: 14,
    },
  },
}
```

## 开发

### 环境要求
- Node.js >= 14.x
- pnpm >= 7.x
- VSCode >= 1.74.0

### 安装依赖
```bash
pnpm install
```

### 编译
```bash
pnpm run compile
```

### 监听模式
```bash
pnpm run watch
```

### 调试
1. 按 `F5` 启动扩展开发主机
2. 在新打开的 VSCode 窗口中打开 `.ets` 或 `.json5` 文件测试

## 项目结构

```
better-arkts/
├── .vscode/              # VSCode 配置
├── syntaxes/             # TextMate 语法文件
│   ├── arkts.tmLanguage.json
│   └── json5.tmLanguage.json
├── src/                  # 源代码
│   └── extension.ts
├── test/                 # 测试文件
│   ├── test.ets
│   └── test.json5
├── icons/                # 图标文件
├── package.json          # 插件配置
├── tsconfig.json         # TypeScript 配置
├── language-configuration.json  # ArkTS 语言配置
├── language-configuration-json5.json  # JSON5 语言配置
└── README.md             # 说明文档
```

## 技术栈

- **开发语言**: TypeScript
- **插件框架**: VSCode Extension API
- **语法高亮**: TextMate 语法 (tmLanguage)
- **文件扩展名**: `.ets` (ArkTS), `.json5` (JSON5)

## 与 TypeScript 的差异

ARKTS 基于 TypeScript，但有以下差异：

- 不支持生成器函数（`function*` 和 `yield`）
- 只支持 `as` 关键字进行类型转换，不支持 `<Type>` 语法
- 新增 `struct` 关键字
- 特定的 ArkUI 装饰器语法

## JSON5 与 JSON 的差异

JSON5 是 JSON 的扩展，主要差异包括：

- 支持单行注释 (`//`) 和多行注释 (`/* */`)
- 键名可以不用引号
- 支持单引号字符串
- 支持多行字符串 (`'''...'''`)
- 允许对象和数组末尾的尾随逗号
- 支持十六进制、八进制、二进制数字
- 支持 `Infinity`, `-Infinity`, `NaN` 等特殊值

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 相关链接

- [HarmonyOS 官方文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/)
- [ArkTS 语言指南](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/arkts-get-started-V5)
- [ArkUI 组件参考](https://developer.huawei.com/consumer/cn/doc/harmonyos-references-V5/arkui-ts-V5)
- [JSON5 规范](https://json5.org/)

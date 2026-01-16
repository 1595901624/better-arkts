# ArkTS 语言完整语法规范

## 1. 装饰器 (Decorators)

ArkTS 装饰器是一种特殊的语法，用于修饰类、结构体、方法和属性。

### 1.1 组件装饰器

```arkts
// @Entry - 页面入口装饰器，标记为可导航页面
@Entry
@Component
struct Index {
  build() { }
}

// @Component - 组件装饰器，标记为自定义组件
@Component
struct MyComponent {
  build() { }
}

// @CustomDialog - 自定义对话框装饰器
@CustomDialog
struct MyDialog {
  controller: CustomDialogController = new CustomDialogController({ builder: MyDialog() })
  build() { }
}

// @Preview - 预览装饰器，用于IDE预览
@Preview
@Component
struct PreviewComponent {
  build() { }
}

// @Reusable - 可复用组件装饰器，优化性能
@Reusable
@Component
struct ReusableItem {
  @State item: string = '';
  
  aboutToReuse(params: Record<string, Object>): void {
    this.item = params.item as string;
  }
  
  build() {
    Text(this.item)
  }
}
```

### 1.2 状态管理装饰器

```arkts
@Component
struct StateDemo {
  // @State - 组件内部状态，变化触发UI刷新
  @State count: number = 0;
  
  // @Prop - 父组件单向同步到子组件
  @Prop title: string = '';
  
  // @Link - 父子组件双向同步
  @Link value: number;
  
  // @Provide - 向后代组件提供数据
  @Provide('theme') theme: string = 'light';
  
  // @Consume - 消费祖先组件提供的数据
  @Consume('theme') currentTheme: string;
  
  // @ObjectLink - 观察对象类型属性变化
  @ObjectLink person: Person;
  
  // @Watch - 监听状态变量变化
  @State @Watch('onCountChange') watchCount: number = 0;
  
  onCountChange(propName: string): void {
    console.log(`${propName} changed to ${this.watchCount}`);
  }
  
  build() { }
}

// @Observed - 装饰类使其可被观察
@Observed
class Person {
  name: string = '';
  age: number = 0;
  
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

// @Track - 追踪类属性变化 (V2)
class UserModel {
  @Track name: string = '';
  @Track age: number = 0;
}
```

### 1.3 存储装饰器

```arkts
@Component
struct StorageDemo {
  // @StorageLink - 与 AppStorage 双向同步
  @StorageLink('counter') counter: number = 0;
  
  // @StorageProp - 与 AppStorage 单向同步
  @StorageProp('userName') userName: string = '';
  
  // @LocalStorageLink - 与 LocalStorage 双向同步
  @LocalStorageLink('localCount') localCount: number = 0;
  
  // @LocalStorageProp - 与 LocalStorage 单向同步
  @LocalStorageProp('localName') localName: string = '';
  
  build() { }
}
```

### 1.4 Builder 装饰器

```arkts
// @Builder - 全局构建函数
@Builder
function GlobalBuilder(text: string) {
  Text(text)
    .fontSize(20)
}

// @Builder - 组件内构建函数
@Component
struct BuilderDemo {
  @Builder
  MyBuilder(param: string) {
    Column() {
      Text(param)
    }
  }
  
  // @BuilderParam - 接收 Builder 作为参数
  @BuilderParam customBuilder: () => void = this.defaultBuilder;
  
  @Builder
  defaultBuilder() {
    Text('Default')
  }
  
  build() {
    Column() {
      this.MyBuilder('Hello')
      this.customBuilder()
    }
  }
}

// @Styles - 定义可复用的样式
@Styles
function cardStyle() {
  .width('100%')
  .padding(16)
  .backgroundColor(Color.White)
  .borderRadius(8)
}

// @Extend - 扩展组件样式
@Extend(Text)
function titleStyle() {
  .fontSize(24)
  .fontWeight(FontWeight.Bold)
  .fontColor(Color.Black)
}

// @AnimatableExtend - 可动画扩展
@AnimatableExtend(Text)
function animatableFontSize(size: number) {
  .fontSize(size)
}
```

### 1.5 并发装饰器

```arkts
// @Concurrent - 标记函数可在Worker线程执行
@Concurrent
function computeTask(data: number[]): number {
  return data.reduce((a, b) => a + b, 0);
}

// @Sendable - 标记类/函数可跨线程传递
@Sendable
class SendableData {
  value: number = 0;
}

@Sendable
function sendableFunc(): void {
  console.info("Sendable function");
}
```

### 1.6 其他装饰器

```arkts
@Component
struct OtherDecorators {
  // @Require - 标记属性为必需初始化
  @Require @Prop requiredProp: string = '';
  
  build() { }
}
```

---

## 2. Struct 结构 (ArkTS 特有)

ArkTS 使用 `struct` 而非 `class` 来定义 UI 组件。

### 2.1 基本语法

```arkts
// struct 声明语法
@Component
struct ComponentName {
  // 状态属性
  @State private message: string = 'Hello';
  @Prop title: string = '';
  
  // 普通成员属性
  private count: number = 0;
  
  // 生命周期方法
  aboutToAppear(): void {
    console.log('Component is about to appear');
  }
  
  aboutToDisappear(): void {
    console.log('Component is about to disappear');
  }
  
  // build() 方法 - 必需，描述UI
  build() {
    Column() {
      Text(this.message)
    }
  }
}
```

### 2.2 完整 struct 示例

```arkts
@Observed
class TaskModel {
  id: number;
  name: string;
  completed: boolean;
  
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
    this.completed = false;
  }
}

@Entry
@Component
struct TaskList {
  @State tasks: TaskModel[] = [];
  @State inputText: string = '';
  @Provide('taskCount') taskCount: number = 0;
  
  // 生命周期
  aboutToAppear(): void {
    this.tasks = [
      new TaskModel(1, 'Task 1'),
      new TaskModel(2, 'Task 2'),
    ];
    this.taskCount = this.tasks.length;
  }
  
  // @Builder 方法
  @Builder
  TaskItem(task: TaskModel) {
    Row() {
      Checkbox()
        .select(task.completed)
        .onChange((value: boolean) => {
          task.completed = value;
        })
      Text(task.name)
        .decoration({
          type: task.completed ? TextDecorationType.LineThrough : TextDecorationType.None
        })
    }
    .width('100%')
    .padding(10)
  }
  
  // build 方法
  build() {
    Column() {
      // 输入区域
      Row() {
        TextInput({ placeholder: 'Enter task name', text: this.inputText })
          .onChange((value: string) => {
            this.inputText = value;
          })
          .layoutWeight(1)
        
        Button('Add')
          .onClick(() => {
            if (this.inputText.length > 0) {
              this.tasks.push(new TaskModel(Date.now(), this.inputText));
              this.inputText = '';
              this.taskCount = this.tasks.length;
            }
          })
      }
      .width('100%')
      .padding(10)
      
      // 任务列表
      List() {
        ForEach(this.tasks, (task: TaskModel) => {
          ListItem() {
            this.TaskItem(task)
          }
        }, (task: TaskModel) => task.id.toString())
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
  }
}
```

---

## 3. UI 描述语法

### 3.1 组件调用

```arkts
build() {
  // 基本组件调用
  Column() {
    // 无参数组件
    Text('Hello World')
    
    // 带参数组件
    Button('Click Me')
    
    // 带配置对象的组件
    TextInput({ placeholder: 'Enter text', text: this.text })
    
    // 图片组件
    Image($r('app.media.icon'))
    
    // List 配置
    List({ space: 10, initialIndex: 0 }) {
      // ...
    }
  }
}
```

### 3.2 链式调用 (属性设置)

```arkts
build() {
  Column() {
    Text('Styled Text')
      // 尺寸
      .width('100%')
      .height(50)
      // 内边距
      .padding({ left: 16, right: 16, top: 8, bottom: 8 })
      // 外边距
      .margin(10)
      // 字体
      .fontSize(20)
      .fontWeight(FontWeight.Bold)
      .fontColor(Color.Red)
      // 对齐
      .textAlign(TextAlign.Center)
      // 背景
      .backgroundColor(Color.White)
      // 边框
      .borderRadius(8)
      .borderWidth(1)
      .borderColor(Color.Gray)
      // 阴影
      .shadow({
        radius: 10,
        color: Color.Gray,
        offsetX: 0,
        offsetY: 2
      })
      // 事件
      .onClick(() => {
        console.log('Text clicked');
      })
      .onTouch((event: TouchEvent) => {
        console.log('Touch event');
      })
  }
}
```

### 3.3 条件渲染

```arkts
@Component
struct ConditionalDemo {
  @State isLoading: boolean = true;
  @State hasError: boolean = false;
  @State count: number = 0;
  
  build() {
    Column() {
      // if 语句
      if (this.isLoading) {
        LoadingProgress()
          .width(50)
          .height(50)
      }
      
      // if-else 语句
      if (this.hasError) {
        Text('Error occurred')
          .fontColor(Color.Red)
      } else {
        Text('Everything is fine')
          .fontColor(Color.Green)
      }
      
      // if-else if-else 链
      if (this.count < 0) {
        Text('Negative')
      } else if (this.count === 0) {
        Text('Zero')
      } else if (this.count < 10) {
        Text('Small positive')
      } else {
        Text('Large positive')
      }
      
      // 三元表达式（用于属性）
      Text('Conditional Style')
        .fontColor(this.isLoading ? Color.Gray : Color.Black)
        .opacity(this.hasError ? 0.5 : 1.0)
    }
  }
}
```

### 3.4 循环渲染

```arkts
@Component
struct LoopDemo {
  @State items: string[] = ['Apple', 'Banana', 'Cherry'];
  @State dataSource: MyDataSource = new MyDataSource();
  
  build() {
    Column() {
      // ForEach - 适用于小数据集
      ForEach(
        this.items,                              // 数据源
        (item: string, index: number) => {       // itemGenerator
          Text(`${index + 1}. ${item}`)
            .fontSize(16)
            .margin(5)
        },
        (item: string) => item                   // keyGenerator (可选)
      )
      
      // LazyForEach - 适用于大数据集，按需加载
      List() {
        LazyForEach(
          this.dataSource,                       // IDataSource 实现
          (item: string, index: number) => {     // itemGenerator
            ListItem() {
              Text(item)
            }
          },
          (item: string, index: number) => item  // keyGenerator
        )
      }
    }
  }
}

// IDataSource 接口实现
class MyDataSource implements IDataSource {
  private data: string[] = [];
  private listeners: DataChangeListener[] = [];
  
  constructor() {
    for (let i = 0; i < 1000; i++) {
      this.data.push(`Item ${i}`);
    }
  }
  
  totalCount(): number {
    return this.data.length;
  }
  
  getData(index: number): string {
    return this.data[index];
  }
  
  registerDataChangeListener(listener: DataChangeListener): void {
    if (this.listeners.indexOf(listener) < 0) {
      this.listeners.push(listener);
    }
  }
  
  unregisterDataChangeListener(listener: DataChangeListener): void {
    const pos = this.listeners.indexOf(listener);
    if (pos >= 0) {
      this.listeners.splice(pos, 1);
    }
  }
  
  // 通知数据变化
  notifyDataReload(): void {
    this.listeners.forEach(listener => listener.onDataReloaded());
  }
  
  notifyDataAdd(index: number): void {
    this.listeners.forEach(listener => listener.onDataAdd(index));
  }
  
  notifyDataDelete(index: number): void {
    this.listeners.forEach(listener => listener.onDataDelete(index));
  }
}
```

---

## 4. 类型系统

### 4.1 基本类型

```arkts
// 基本类型
let str: string = 'Hello';
let num: number = 42;
let bool: boolean = true;
let nul: null = null;
let undef: undefined = undefined;

// void 类型
function logMessage(): void {
  console.log('Message');
}

// any 类型 (尽量避免使用)
let anyValue: any = 'can be anything';

// unknown 类型 (比 any 更安全)
let unknownValue: unknown = 'unknown';

// never 类型
function throwError(message: string): never {
  throw new Error(message);
}

// object 类型
let obj: object = { key: 'value' };

// bigint 类型
let bigInt: bigint = 9007199254740991n;

// symbol 类型
let sym: symbol = Symbol('description');
```

### 4.2 数组和元组

```arkts
// 数组类型
let numbers: number[] = [1, 2, 3];
let strings: Array<string> = ['a', 'b', 'c'];

// 元组类型
let tuple: [string, number] = ['hello', 42];
let namedTuple: [name: string, age: number] = ['John', 30];

// 只读数组
let readonlyArr: readonly number[] = [1, 2, 3];
let readonlyArr2: ReadonlyArray<number> = [1, 2, 3];
```

### 4.3 联合类型和交叉类型

```arkts
// 联合类型
let id: string | number = 'abc123';
id = 123;

type StringOrNumber = string | number;
type Status = 'pending' | 'fulfilled' | 'rejected';

// 可空联合类型
let nullable: string | null = null;
let optional: string | undefined = undefined;

// 交叉类型
interface Person {
  name: string;
}

interface Employee {
  employeeId: number;
}

type EmployeePerson = Person & Employee;

let worker: EmployeePerson = {
  name: 'John',
  employeeId: 12345
};
```

### 4.4 泛型

```arkts
// 泛型函数
function identity<T>(value: T): T {
  return value;
}

// 带默认类型的泛型
function createArray<T = string>(length: number, value: T): T[] {
  return Array(length).fill(value);
}

// 泛型约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// 泛型接口
interface Container<T> {
  value: T;
  getValue(): T;
  setValue(value: T): void;
}

// 泛型类
class Box<T> {
  private content: T;
  
  constructor(content: T) {
    this.content = content;
  }
  
  getContent(): T {
    return this.content;
  }
  
  setContent(content: T): void {
    this.content = content;
  }
}

// 多个泛型参数
class KeyValuePair<K, V> {
  constructor(public key: K, public value: V) {}
}
```

### 4.5 接口和类型别名

```arkts
// 接口定义
interface User {
  readonly id: number;         // 只读属性
  name: string;                // 必需属性
  email?: string;              // 可选属性
  age: number;
  
  // 方法签名
  greet(): string;
  greet(name: string): string;
  
  // 索引签名
  [key: string]: any;
}

// 接口继承
interface Admin extends User {
  role: string;
  permissions: string[];
}

// 类型别名
type ID = string | number;
type Point = { x: number; y: number };
type Callback = (data: string) => void;

// 映射类型
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};

// 条件类型
type NonNullable<T> = T extends null | undefined ? never : T;
```

---

## 5. ArkTS 与 TypeScript 的关键差异

### 5.1 禁止的语法

```arkts
// ❌ 不支持解构赋值
// let [a, b] = [1, 2];           // 编译错误
// let { x, y } = point;          // 编译错误

// ✅ 替代方案
let arr = [1, 2];
let a = arr[0];
let b = arr[1];

let point = { x: 10, y: 20 };
let x = point.x;
let y = point.y;

// ❌ 不支持展开运算符用于对象
// let merged = { ...obj1, ...obj2 };  // 编译错误

// ❌ 不支持 <Type> 语法进行类型断言
// let value = <string>someValue;  // 编译错误

// ✅ 使用 as 进行类型断言
let value = someValue as string;

// ❌ 不支持生成器函数
// function* generator() { yield 1; }  // 编译错误

// ❌ 不支持 Function.apply/call/bind
// fn.apply(context, args);  // 编译错误

// ✅ 替代方案
fn(...args);
```

### 5.2 struct vs class

```arkts
// ArkTS 组件必须使用 struct
@Component
struct MyComponent {    // ✅ 正确
  build() { }
}

// 普通数据类使用 class
class DataModel {       // ✅ 正确
  name: string = '';
}

// @Observed 类必须使用 class
@Observed
class ObservableModel { // ✅ 正确
  @Track value: number = 0;
}
```

### 5.3 严格类型要求

```arkts
// ArkTS 要求更严格的类型标注

// ❌ 隐式 any 不允许
// function process(data) { }  // 编译错误

// ✅ 必须显式标注类型
function process(data: string): void { }

// ❌ 不支持 typeof 用于类型查询
// let t: typeof obj = { ... };  // 编译错误

// ✅ 显式定义类型
interface ObjType { value: number }
let t: ObjType = { value: 0 };
```

---

## 6. 解析器实现建议

### 6.1 词法分析器 (Lexer) 扩展

基于您现有的 lexer.ts，需要确保以下 token 类型：

```typescript
export const ARKTS_KEYWORDS = new Set([
  // 标准 TypeScript 关键字
  'let', 'const', 'var', 'function', 'class', 'interface', 'enum',
  'type', 'import', 'export', 'from', 'default', 'as', 'new',
  'this', 'super', 'extends', 'implements',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
  'continue', 'return', 'try', 'catch', 'finally', 'throw',
  'async', 'await', 'typeof', 'instanceof', 'in', 'of',
  'public', 'private', 'protected', 'static', 'readonly', 'abstract',
  'true', 'false', 'null', 'undefined', 'void',
  
  // ArkTS 特有关键字
  'struct',   // 组件结构体
  'build',    // UI 构建方法
  'lazy',     // 懒加载导入
]);

export const ARKTS_DECORATORS = new Set([
  // 组件装饰器
  'Entry', 'Component', 'CustomDialog', 'Preview', 'Reusable',
  
  // 状态管理装饰器
  'State', 'Prop', 'Link', 'Provide', 'Consume', 'ObjectLink',
  'Watch', 'Observed', 'Track',
  
  // 存储装饰器
  'StorageLink', 'StorageProp', 'LocalStorageLink', 'LocalStorageProp',
  
  // Builder 装饰器
  'Builder', 'BuilderParam', 'Styles', 'Extend', 'AnimatableExtend',
  
  // 并发装饰器
  'Concurrent', 'Sendable',
  
  // 其他
  'Require',
]);
```

### 6.2 AST 节点建议扩展

```typescript
// Struct 声明节点
interface StructDeclaration extends BaseNode {
  type: 'StructDeclaration';
  id: Identifier;
  decorators: Decorator[];
  body: StructBody;
}

// Struct 成员
interface StructBody extends BaseNode {
  type: 'StructBody';
  members: (PropertyDeclaration | MethodDeclaration | BuildMethod | BuilderMethod)[];
}

// build() 方法
interface BuildMethod extends BaseNode {
  type: 'BuildMethod';
  body: UIDescription;
}

// @Builder 方法
interface BuilderMethod extends BaseNode {
  type: 'BuilderMethod';
  id: Identifier;
  params: Parameter[];
  body: UIDescription;
  decorators: Decorator[];
}

// UI 描述
interface UIDescription extends BaseNode {
  type: 'UIDescription';
  children: UINode[];
}

// UI 组件节点
interface UIComponent extends BaseNode {
  type: 'UIComponent';
  name: Identifier;
  arguments: Expression[];
  body: UINode[];
  chainedCalls: ChainedCall[];
}

// ForEach 节点
interface ForEachNode extends BaseNode {
  type: 'ForEachNode';
  dataSource: Expression;
  itemGenerator: ArrowFunctionExpression | FunctionExpression;
  keyGenerator?: ArrowFunctionExpression | FunctionExpression;
}

// LazyForEach 节点
interface LazyForEachNode extends BaseNode {
  type: 'LazyForEachNode';
  dataSource: Expression;
  itemGenerator: ArrowFunctionExpression | FunctionExpression;
  keyGenerator?: ArrowFunctionExpression | FunctionExpression;
}

// 条件 UI 节点
interface IfUINode extends BaseNode {
  type: 'IfUINode';
  test: Expression;
  consequent: UINode[];
  alternate?: UINode[] | IfUINode;
}
```

### 6.3 解析器语法规则参考

```
Program
  : StatementList

StatementList
  : Statement*

Statement
  : ImportDeclaration
  | ExportDeclaration
  | DecoratedDeclaration
  | VariableDeclaration
  | FunctionDeclaration
  | ClassDeclaration
  | StructDeclaration
  | InterfaceDeclaration
  | TypeAliasDeclaration
  | EnumDeclaration
  | ExpressionStatement
  | ...

DecoratedDeclaration
  : Decorator+ (StructDeclaration | ClassDeclaration | FunctionDeclaration | MethodDeclaration)

Decorator
  : '@' Identifier ('(' Arguments? ')')?

StructDeclaration
  : 'struct' Identifier '{' StructMember* '}'

StructMember
  : PropertyDeclaration
  | MethodDeclaration
  | BuildMethod
  | BuilderMethod

BuildMethod
  : 'build' '(' ')' UIBlock

BuilderMethod
  : Decorator* Identifier '(' Parameters? ')' UIBlock

UIBlock
  : '{' UIStatement* '}'

UIStatement
  : UIComponent
  | IfUIStatement
  | ForEachStatement
  | LazyForEachStatement

UIComponent
  : Identifier '(' Arguments? ')' UIBlock? ChainedCall*

ChainedCall
  : '.' Identifier '(' Arguments? ')'

IfUIStatement
  : 'if' '(' Expression ')' UIBlock ('else' (UIBlock | IfUIStatement))?

ForEachStatement
  : 'ForEach' '(' Expression ',' ItemGenerator (',' KeyGenerator)? ')'

LazyForEachStatement
  : 'LazyForEach' '(' Expression ',' ItemGenerator (',' KeyGenerator)? ')'
```

这份文档涵盖了 ArkTS 的完整语法规范，应该能帮助您实现一个完整的 ArkTS 解析器。主要需要关注：

1. **装饰器解析** - 处理 `@` 符号开头的装饰器及其参数
2. **struct 解析** - 不同于 class，struct 有特殊的 build() 方法
3. **UI 描述语法** - 链式调用、条件渲染、循环渲染的特殊语法
4. **ArkTS 限制** - 禁止的 TypeScript 语法（解构、生成器等）
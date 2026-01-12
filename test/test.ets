// ARKTS 语法高亮测试文件

/**
 * 这是一个测试文件，用于验证 ARKTS 语法高亮功能
 */

// 导入语句
import { Component, State } from '@kit.ArkUI';
import { BusinessError } from '@kit.BasicServicesKit';

// 装饰器测试
@Entry
@Component
struct Index {
    // 状态变量装饰器
    @State message: string = 'Hello World';
    @Prop title: string = 'ArkTS Test';
    @Link count: number = 0;

    // 基本类型变量
    private name: string = 'Test';
    private age: number = 25;
    private isActive: boolean = true;
    private data: any = null;
    private value: void = undefined;

    // 数组和对象
    private items: Array<string> = ['item1', 'item2', 'item3'];
    private numbers: number[] = [1, 2, 3, 4, 5];
    private map: Map<string, number> = new Map();
    private config: Object = { key: 'value' };

    // 枚举定义
    enum Color {
        Red = 0xFF,
        Green = 0x7F,
        Blue = 0x00
    }

    // 类型别名
    type Matrix = number[][];
    type Handler = (s: string, no: number) => string;

    // 接口定义
    interface Shape {
        area(): number;
        name: string;
    }

    // 类定义
    class Rectangle implements Shape {
        public width: number = 0;
        public height: number = 0;
        private _name: string = 'Rectangle';

        constructor(width: number, height: number) {
            this.width = width;
            this.height = height;
        }

        area(): number {
            return this.width * this.height;
        }

        get name(): string {
            return this._name;
        }

        set name(value: string) {
            this._name = value;
        }
    }

    // 泛型函数
    function foo<T = number>(): T {
        return 0 as T;
    }

    // 异步函数
    async function myAsyncFunction(): Promise<string> {
        const result: string = await new Promise((resolve: Function) => {
            setTimeout(() => {
                resolve('Hello, world!');
            }, 3000);
        });
        console.info(result);
        return result;
    }

    // 类型转换
    let value1: unknown = 'test';
    let strValue: string = value1 as string;

    // 箭头函数
    const add = (a: number, b: number): number => {
        return a + b;
    };

    // 条件语句
    if (this.isActive) {
        console.info('Active');
    } else {
        console.info('Inactive');
    }

    // 循环语句
    for (let i = 0; i < this.items.length; i++) {
        console.info(this.items[i]);
    }

    for (const item of this.items) {
        console.info(item);
    }

    while (this.count < 10) {
        this.count++;
    }

    // Switch 语句
    switch (this.age) {
        case 18:
            console.info('Adult');
            break;
        case 25:
            console.info('Young Adult');
            break;
        default:
            console.info('Other');
    }

    // Try-Catch
    try {
        throw new Error('Test error');
    } catch (error) {
        console.error(error);
    } finally {
        console.info('Cleanup');
    }

    // 运算符
    let result: number = 10 + 20;
    let isEqual: boolean = 10 === 20;
    let isTrue: boolean = true && false;
    let orResult: boolean = true || false;
    let notResult: boolean = !true;

    // 三元运算符
    let message: string = this.isActive ? 'Active' : 'Inactive';

    // Build 方法 - ArkUI 组件构建
    build() {
        Row() {
            Column() {
                Text(this.message)
                    .fontSize(50)
                    .fontWeight(FontWeight.Bold)
                    .onClick(async () => {
                        let res = await myAsyncFunction();
                        console.info("res is: " + res);
                    })

                Button('Click Me')
                    .onClick(() => {
                        this.count++;
                    })

                Text(`Count: ${this.count}`)
                    .fontSize(24)
            }
            .width('100%')
        }
        .height('100%')
    }
}

// 命名空间
namespace Utils {
    export function encrypt(data: string): string {
        return data;
    }

    export function decrypt(data: string): string {
        return data;
    }
}

// 使用命名空间
Utils.encrypt('test');
Utils.decrypt('test');
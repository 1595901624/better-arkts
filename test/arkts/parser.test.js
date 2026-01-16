"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const parser_1 = require("../../src/arkts/parser");
const formatter_1 = require("../../src/arkts/formatter");
describe('ArkTS Parser', () => {
    it('should parse a simple struct with decorators', () => {
        const code = `
@Entry
@Component
struct MyComponent {
  @State message: string = 'Hello'
  
  build() {
    Text(this.message)
  }
}
`;
        const parser = new parser_1.ArkTSParser(code);
        const doc = parser.parseDocument();
        assert.strictEqual(doc.structs.length, 1);
        assert.strictEqual(doc.structs[0].name, 'MyComponent');
        assert.strictEqual(doc.structs[0].decorators.length, 2);
        assert.strictEqual(doc.structs[0].decorators[0].name, 'Entry');
        assert.strictEqual(doc.structs[0].decorators[1].name, 'Component');
    });
    it('should parse imports', () => {
        const code = `
import { router } from '@kit.ArkUI'
import router from '@ohos.router'
import * as utils from './utils'
`;
        const parser = new parser_1.ArkTSParser(code);
        const doc = parser.parseDocument();
        assert.strictEqual(doc.imports.length, 3);
    });
    it('should parse a class with properties and methods', () => {
        const code = `
@Observed
class MyModel {
  public name: string = ''
  private _value: number = 0
  
  getValue(): number {
    return this._value
  }
}
`;
        const parser = new parser_1.ArkTSParser(code);
        const doc = parser.parseDocument();
        assert.strictEqual(doc.classes.length, 1);
        assert.strictEqual(doc.classes[0].name, 'MyModel');
        assert.strictEqual(doc.classes[0].decorators.length, 1);
        assert.strictEqual(doc.classes[0].decorators[0].name, 'Observed');
    });
    it('should parse build method with UI components', () => {
        const code = `
@Component
struct Test {
  build() {
    Column() {
      Text('Hello')
        .fontSize(20)
      Button('Click')
        .onClick(() => {})
    }
    .width('100%')
  }
}
`;
        const parser = new parser_1.ArkTSParser(code);
        const doc = parser.parseDocument();
        assert.strictEqual(doc.structs.length, 1);
        const buildMethod = doc.structs[0].members.find(m => m.type === 'BuildMethod');
        assert.ok(buildMethod);
    });
});
describe('ArkTS Formatter', () => {
    it('should format a simple document', () => {
        const code = `@Entry
@Component
struct MyComponent {
  @State message: string = 'Hello'
  
  build() {
    Text(this.message)
  }
}`;
        const parser = new parser_1.ArkTSParser(code);
        const doc = parser.parseDocument();
        const formatted = (0, formatter_1.formatDocument)(doc, formatter_1.DEFAULT_FORMAT_OPTIONS);
        assert.ok(formatted.includes('@Entry'));
        assert.ok(formatted.includes('@Component'));
        assert.ok(formatted.includes('struct MyComponent'));
    });
    it('should preserve decorator arguments', () => {
        const code = `
@CustomDialog
@Preview({ title: 'Test' })
struct MyDialog {
  build() {
    Text('Dialog')
  }
}
`;
        const parser = new parser_1.ArkTSParser(code);
        const doc = parser.parseDocument();
        const formatted = (0, formatter_1.formatDocument)(doc, formatter_1.DEFAULT_FORMAT_OPTIONS);
        assert.ok(formatted.includes('@CustomDialog'));
        assert.ok(formatted.includes("@Preview({ title: 'Test' })"));
    });
});
//# sourceMappingURL=parser.test.js.map
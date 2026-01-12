import * as vscode from 'vscode';

/**
 * 插件激活函数
 * 当插件第一次被激活时调用
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Batter ArkTS Syntax Highlighting 插件已激活');

    // 这里可以添加更多的命令或功能
    // 目前主要功能是语法高亮，通过 package.json 和 TextMate 语法文件实现
}

/**
 * 插件停用函数
 * 当插件被停用时调用
 */
export function deactivate() {
    console.log('Batter ArkTS Syntax Highlighting 插件已停用');
}

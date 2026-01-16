import * as vscode from 'vscode';
import { HmlFormattingProvider } from './hml/provider';
import { ArkTSFormattingProvider } from './arkts/provider';

/**
 * 插件激活函数
 * 当插件第一次被激活时调用
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Better ArkTS Syntax Highlighting 插件已激活');

    let hmlFormattingDisposable: vscode.Disposable | undefined;
    let arktsFormattingDisposable: vscode.Disposable | undefined;
    let arktsTestFormattingDisposable: vscode.Disposable | undefined;

    const updateHmlFormattingProvider = () => {
        const config = vscode.workspace.getConfiguration('better-arkts');
        const enabled = config.get<boolean>('experimental.hmlFormat.enabled', false);
        if (enabled && !hmlFormattingDisposable) {
            hmlFormattingDisposable = vscode.languages.registerDocumentFormattingEditProvider(
                'hml',
                new HmlFormattingProvider()
            );
            context.subscriptions.push(hmlFormattingDisposable);
        }
        if (!enabled && hmlFormattingDisposable) {
            hmlFormattingDisposable.dispose();
            hmlFormattingDisposable = undefined;
        }
    };

    const updateArkTSFormattingProvider = () => {
        const config = vscode.workspace.getConfiguration('better-arkts');
        const enabled = config.get<boolean>('experimental.arktsFormat.enabled', false);

        if (enabled && !arktsFormattingDisposable) {
            const provider = new ArkTSFormattingProvider();
            arktsFormattingDisposable = vscode.languages.registerDocumentFormattingEditProvider(
                'arkts',
                provider
            );
            context.subscriptions.push(arktsFormattingDisposable);

            arktsTestFormattingDisposable = vscode.languages.registerDocumentFormattingEditProvider(
                'arkts-test',
                provider
            );
            context.subscriptions.push(arktsTestFormattingDisposable);
        }

        if (!enabled && arktsFormattingDisposable) {
            arktsFormattingDisposable.dispose();
            arktsFormattingDisposable = undefined;
        }

        if (!enabled && arktsTestFormattingDisposable) {
            arktsTestFormattingDisposable.dispose();
            arktsTestFormattingDisposable = undefined;
        }
    };

    updateHmlFormattingProvider();
    updateArkTSFormattingProvider();

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('better-arkts.experimental.hmlFormat.enabled')) {
                updateHmlFormattingProvider();
            }
            if (event.affectsConfiguration('better-arkts.experimental.arktsFormat.enabled')) {
                updateArkTSFormattingProvider();
            }
        })
    );
}

/**
 * 插件停用函数
 * 当插件被停用时调用
 */
export function deactivate() {
    console.log('Batter ArkTS Syntax Highlighting 插件已停用');
}

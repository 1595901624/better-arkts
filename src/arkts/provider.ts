import * as vscode from 'vscode';
import { ArkTSParser } from './parser';
import { formatDocument, FormatOptions, DEFAULT_FORMAT_OPTIONS } from './formatter';

export class ArkTSFormattingProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const text = document.getText();
        const parser = new ArkTSParser(text);
        const ast = parser.parseDocument();

        if (parser.errors.length > 0) {
            return [];
        }

        const formatOptions: FormatOptions = {
            ...DEFAULT_FORMAT_OPTIONS,
            indentSize: options.tabSize || 2,
            eol: document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n'
        };

        const formatted = formatDocument(ast, formatOptions);
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        return [vscode.TextEdit.replace(fullRange, formatted)];
    }
}

export class ArkTSRangeFormattingProvider implements vscode.DocumentRangeFormattingEditProvider {
    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        return [];
    }
}

export class ArkTSOnTypeFormattingProvider implements vscode.OnTypeFormattingEditProvider {
    provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        return [];
    }
}

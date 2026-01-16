import * as vscode from 'vscode';
import { HmlParser } from './parser';
import { formatDocument, FormatOptions } from './formatter';

export class HmlFormattingProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const text = document.getText();
        const parser = new HmlParser(text);
        const ast = parser.parseDocument();

        const formatOptions: FormatOptions = {
            indentSize: options.tabSize || 4,
            eol: document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n',
            maxLineLength: 120
        };

        const formatted = formatDocument(ast, formatOptions);
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        return [vscode.TextEdit.replace(fullRange, formatted)];
    }
}

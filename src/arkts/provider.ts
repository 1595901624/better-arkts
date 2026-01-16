import * as vscode from 'vscode';
import { ArkTSParser } from './parser';
import { DEFAULT_FORMAT_OPTIONS, formatDocument } from './formatter';
import { detectComplexSyntax, formatWithBasicRulesText } from './basicFormatter';

export class ArkTSFormattingProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
        const text = document.getText();

        const hasComplexSyntax = detectComplexSyntax(text);
        if (hasComplexSyntax) {
            return this.formatWithBasicRules(document, options);
        }

        const parser = new ArkTSParser(text);
        const ast = parser.parseDocument();

        if (parser.errors.length > 0) {
            return this.formatWithBasicRules(document, options);
        }

        const formatOptions = {
            ...DEFAULT_FORMAT_OPTIONS,
            indentSize: typeof options.tabSize === 'number' ? options.tabSize : 2,
            eol: document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n',
            semicolon: this.inferSemicolonStyle(text)
        };

        const formatted = formatDocument(ast, formatOptions);

        if (this.hasFormattingIssues(text, formatted)) {
            return this.formatWithBasicRules(document, options);
        }

        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        return [vscode.TextEdit.replace(fullRange, formatted)];
    }

    private hasFormattingIssues(original: string, formatted: string): boolean {
        const originalComments = (original.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || []).length;
        const formattedComments = (formatted.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || []).length;

        if (formattedComments < originalComments) {
            return true;
        }

        const originalBraces = (original.match(/[{}]/g) || []).length;
        const formattedBraces = (formatted.match(/[{}]/g) || []).length;

        if (originalBraces !== formattedBraces) {
            return true;
        }

        return false;
    }

    private formatWithBasicRules(document: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
        const text = document.getText();
        const eol = document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
        const indentStr = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';

        const formatted = formatWithBasicRulesText(text, { eol, indent: indentStr });
        if (formatted === text) {
            return [];
        }

        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        return [vscode.TextEdit.replace(fullRange, formatted)];
    }

    private inferSemicolonStyle(text: string): boolean {
        const lines = text.split(/\r?\n/);
        let candidates = 0;
        let withSemi = 0;

        for (const line of lines) {
            const t = line.trim();
            if (!t) {
                continue;
            }

            // skip obvious block boundaries
            if (t === '{' || t === '}' || t.endsWith('{') || t.endsWith('}') || t.endsWith(',')) {
                continue;
            }

            candidates++;
            if (t.endsWith(';')) {
                withSemi++;
            }
        }

        // If a significant portion of statement-like lines end with ';', follow that style.
        return candidates > 0 && withSemi / candidates >= 0.3;
    }
}

export class ArkTSRangeFormattingProvider implements vscode.DocumentRangeFormattingEditProvider {
    provideDocumentRangeFormattingEdits(
        _document: vscode.TextDocument,
        _range: vscode.Range,
        _options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        return [];
    }
}

export class ArkTSOnTypeFormattingProvider implements vscode.OnTypeFormattingEditProvider {
    provideOnTypeFormattingEdits(
        _document: vscode.TextDocument,
        _position: vscode.Position,
        _ch: string,
        _options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        return [];
    }
}

import * as vscode from 'vscode';
import { ArkTSParser } from './parser';
import { formatDocument, FormatOptions, DEFAULT_FORMAT_OPTIONS } from './formatter';

export class ArkTSFormattingProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const text = document.getText();
        
        const hasComplexSyntax = this.detectComplexSyntax(text);
        if (hasComplexSyntax) {
            return this.formatWithBasicRules(document, options);
        }

        const parser = new ArkTSParser(text);
        const ast = parser.parseDocument();

        if (parser.errors.length > 0) {
            return this.formatWithBasicRules(document, options);
        }

        const formatOptions: FormatOptions = {
            ...DEFAULT_FORMAT_OPTIONS,
            indentSize: options.tabSize || 2,
            eol: document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n'
        };

        const formatted = formatDocument(ast, formatOptions);
        
        if (this.hasFormattingIssues(text, formatted)) {
            return this.formatWithBasicRules(document, options);
        }

        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        return [vscode.TextEdit.replace(fullRange, formatted)];
    }

    private detectComplexSyntax(text: string): boolean {
        const patterns = [
            /\bnamespace\s+\w+/,
            /\bget\s+\w+\s*\(/,
            /\bset\s+\w+\s*\(/,
            /struct\s+\w+[^{]*\{[^}]*\b(enum|interface|class|function)\b/s,
        ];
        
        return patterns.some(p => p.test(text));
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

    private formatWithBasicRules(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const text = document.getText();
        const eol = document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
        const indentStr = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
        
        const lines = text.split(/\r?\n/);
        const result: string[] = [];
        let currentIndent = 0;
        let lastWasEmpty = false;

        for (const line of lines) {
            const trimmed = line.trim();
            
            if (!trimmed) {
                if (!lastWasEmpty) {
                    result.push('');
                    lastWasEmpty = true;
                }
                continue;
            }
            lastWasEmpty = false;

            const closeBraceStart = /^[}\])]/.test(trimmed);
            if (closeBraceStart) {
                currentIndent = Math.max(0, currentIndent - 1);
            }

            const isChainedCall = /^\.[a-zA-Z_]/.test(trimmed);
            const extraIndent = isChainedCall ? 1 : 0;

            result.push(indentStr.repeat(currentIndent + extraIndent) + trimmed);

            const openBraces = (trimmed.match(/[{[(]/g) || []).length;
            const closeBraces = (trimmed.match(/[}\])]/g) || []).length;
            currentIndent += openBraces - closeBraces;
            if (closeBraceStart) {
                currentIndent += 1;
            }
            currentIndent = Math.max(0, currentIndent);
        }

        while (result.length > 0 && result[result.length - 1] === '') {
            result.pop();
        }

        const formatted = result.join(eol) + eol;
        
        if (formatted === text) {
            return [];
        }

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

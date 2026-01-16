export interface BasicFormatOptions {
    eol: string;
    indent: string; // one indent unit (e.g. 2/4 spaces or a tab)
}

export function detectComplexSyntax(text: string): boolean {
    const patterns: RegExp[] = [
        /\bnamespace\s+\w+/,
        /\bget\s+\w+\s*\(/,
        /\bset\s+\w+\s*\(/,
        /struct\s+\w+[^\{]*\{[^}]*\b(enum|interface|class|function)\b/s
    ];

    return patterns.some(p => p.test(text));
}

/**
 * A conservative formatter used when full parsing is risky.
 * - Reindents by counting braces/parens/brackets outside strings/template literals
 * - Preserves all content of non-empty lines (except trimming leading/trailing spaces)
 * - Keeps at most one consecutive blank line
 * - Indents chained calls (lines starting with '.') by one extra indent
 */
export function formatWithBasicRulesText(text: string, options: BasicFormatOptions): string {
    const hasTrailingEol = text.endsWith(options.eol);
    const formattedCore = reindentBlock(text, 0, options);
    return hasTrailingEol ? formattedCore + options.eol : formattedCore;
}

function reindentBlock(raw: string, baseIndentLevel: number, options: BasicFormatOptions): string {
    const lines = raw.split(/\r?\n/);
    const result: string[] = [];

    let currentIndent = 0;
    let lastWasEmpty = false;

    const switchStack: Array<{ baseIndent: number; inCase: boolean }> = [];
    let inDocComment = false;

    let prevTrimmedLine = '';
    let prevChainIndent = 0;

    const braceExtraIndentStack: number[] = [];

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        if (!trimmed) {
            if (!lastWasEmpty && result.length > 0) {
                // Preserve a blank line as an actually empty line (no indentation whitespace).
                // This is important for idempotence against already-formatted files.
                result.push('');
                lastWasEmpty = true;
            }
            continue;
        }
        lastWasEmpty = false;

        // Doc comments
        if (trimmed.startsWith('/**') && !trimmed.endsWith('*/')) {
            inDocComment = true;
            result.push(indent(options, baseIndentLevel + currentIndent + sum(braceExtraIndentStack)) + trimmed);
            prevTrimmedLine = trimmed;
            continue;
        }
        if (inDocComment) {
            if (trimmed === '*/' || trimmed.endsWith('*/')) {
                inDocComment = false;
                const commentEnd = trimmed.startsWith('*') ? ' ' + trimmed : ' * ' + trimmed;
                result.push(indent(options, baseIndentLevel + currentIndent + sum(braceExtraIndentStack)) + commentEnd);
                prevTrimmedLine = trimmed;
                continue;
            }

            let formattedComment = trimmed;
            if (!trimmed.startsWith('*')) {
                formattedComment = '* ' + trimmed;
            } else if (trimmed === '*') {
                formattedComment = ' *';
            } else if (!trimmed.startsWith('* ') && trimmed.startsWith('*')) {
                formattedComment = '* ' + trimmed.slice(1).trim();
            }
            if (!formattedComment.startsWith(' ')) {
                formattedComment = ' ' + formattedComment;
            }
            result.push(indent(options, baseIndentLevel + currentIndent + sum(braceExtraIndentStack)) + formattedComment);
            prevTrimmedLine = trimmed;
            continue;
        }

        // switch start (track by brace depth so we can exit correctly inside other blocks)
        if (trimmed.match(/^switch\s*\(/)) {
            switchStack.push({ baseIndent: currentIndent, inCase: false });
        }

        const prevEndsWithOperator = /[+\-*/%=&|<>!^~?:]$/.test(prevTrimmedLine) &&
            !prevTrimmedLine.endsWith('=>') &&
            !prevTrimmedLine.endsWith(':');

        const isChainLine = trimmed.startsWith('.');
        let chainIndentForLine = 0;
        if (isChainLine) {
            if (prevTrimmedLine.startsWith('.')) {
                chainIndentForLine = prevChainIndent;
            } else if (prevTrimmedLine.endsWith('}')) {
                chainIndentForLine = 0;
            } else if (prevEndsWithOperator) {
                chainIndentForLine = 0;
            } else {
                chainIndentForLine = 1;
            }
        }

        const leadingClose = countLeadingChars(trimmed, '}');
        const indentBefore = Math.max(0, currentIndent - leadingClose);
        const braceExtraSum = sum(braceExtraIndentStack);

        const activeSwitch = switchStack.length > 0 ? switchStack[switchStack.length - 1] : undefined;
        const isCaseLabel = /^(case\s+.+:|default\s*:)/.test(trimmed);
        if (activeSwitch && isCaseLabel) {
            activeSwitch.inCase = true;
        }

        if (activeSwitch && isCaseLabel) {
            // case/default labels align with the current switch block indentation.
            result.push(indent(options, baseIndentLevel + indentBefore + braceExtraSum) + trimmed);
        } else if (activeSwitch && activeSwitch.inCase && !trimmed.startsWith('}')) {
            // statements under a case label are indented one extra level
            result.push(indent(options, baseIndentLevel + indentBefore + braceExtraSum + 1) + trimmed);
        } else {
            result.push(indent(options, baseIndentLevel + indentBefore + braceExtraSum + chainIndentForLine) + trimmed);
        }

        const { openBraces, closeBraces } = countBracesOutsideStrings(trimmed);

        for (let c = 0; c < closeBraces; c++) {
            braceExtraIndentStack.pop();
        }

        currentIndent += openBraces - closeBraces;
        currentIndent = Math.max(0, currentIndent);

        for (let o = 0; o < openBraces; o++) {
            braceExtraIndentStack.push(isChainLine ? chainIndentForLine : 0);
        }

        // switch end: pop when brace depth returns to the switch base indent.
        // (Switch blocks can appear nested inside structs/classes/etc, so depth won't be 0.)
        if (switchStack.length > 0) {
            const top = switchStack[switchStack.length - 1];
            if (currentIndent === top.baseIndent && closeBraces > 0) {
                switchStack.pop();
            }
        }

        prevTrimmedLine = trimmed;
        prevChainIndent = isChainLine ? chainIndentForLine : 0;
    }

    while (result.length > 0 && result[result.length - 1].trim() === '') {
        result.pop();
    }

    return result.join(options.eol);
}

function indent(options: BasicFormatOptions, level: number): string {
    return options.indent.repeat(level);
}

function countLeadingChars(text: string, ch: string): number {
    let i = 0;
    while (i < text.length && text[i] === ch) {
        i++;
    }
    return i;
}

function countBracesOutsideStrings(text: string): { openBraces: number; closeBraces: number } {
    let openBraces = 0;
    let closeBraces = 0;

    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let escape = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i + 1];

        if (!inSingle && !inDouble && !inTemplate) {
            if (c === '/' && next === '/') {
                break;
            }
        }

        if (escape) {
            escape = false;
            continue;
        }

        if (c === '\\') {
            if (inSingle || inDouble || inTemplate) {
                escape = true;
            }
            continue;
        }

        if (!inDouble && !inTemplate && c === "'") {
            inSingle = !inSingle;
            continue;
        }
        if (!inSingle && !inTemplate && c === '"') {
            inDouble = !inDouble;
            continue;
        }
        if (!inSingle && !inDouble && c === '`') {
            inTemplate = !inTemplate;
            continue;
        }

        if (inSingle || inDouble || inTemplate) {
            continue;
        }

        if (c === '{') {
            openBraces++;
        } else if (c === '}') {
            closeBraces++;
        }
    }

    return { openBraces, closeBraces };
}

function sum(nums: number[]): number {
    let total = 0;
    for (const n of nums) {
        total += n;
    }
    return total;
}

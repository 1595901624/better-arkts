/**
 * ArkTS Lexer (Tokenizer)
 * 
 * This module implements a lexical analyzer for ArkTS language.
 * It converts source code into a stream of tokens.
 */

// ============================================================================
// Token Types
// ============================================================================

export enum TokenType {
    // End of file
    EOF = 'EOF',

    // Literals
    StringLiteral = 'StringLiteral',
    NumericLiteral = 'NumericLiteral',
    TemplateLiteral = 'TemplateLiteral',
    TemplateHead = 'TemplateHead',
    TemplateMiddle = 'TemplateMiddle',
    TemplateTail = 'TemplateTail',
    RegExpLiteral = 'RegExpLiteral',

    // Identifier and Keywords
    Identifier = 'Identifier',
    Keyword = 'Keyword',

    // Punctuators
    Punctuator = 'Punctuator',

    // Comments
    LineComment = 'LineComment',
    BlockComment = 'BlockComment',

    // Decorator
    Decorator = 'Decorator',

    // Whitespace (usually skipped)
    Whitespace = 'Whitespace',
    LineTerminator = 'LineTerminator',
}

// ============================================================================
// Token Interface
// ============================================================================

export interface Token {
    type: TokenType;
    value: string;
    raw?: string;
    start: number;
    end: number;
    line: number;
    column: number;
}

// ============================================================================
// Keywords
// ============================================================================

export const KEYWORDS = new Set([
    // JavaScript/TypeScript keywords
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
    'false', 'finally', 'for', 'function', 'if', 'import', 'in',
    'instanceof', 'let', 'new', 'null', 'return', 'super', 'switch',
    'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var',
    'void', 'while', 'with', 'yield',

    // TypeScript specific
    'abstract', 'as', 'async', 'await', 'constructor', 'declare',
    'from', 'get', 'implements', 'interface', 'is', 'keyof',
    'module', 'namespace', 'never', 'of', 'private', 'protected',
    'public', 'readonly', 'require', 'set', 'static', 'type',
    'unknown', 'any', 'boolean', 'number', 'string', 'symbol',
    'object', 'never', 'void',

    // ArkTS specific
    'struct', 'build', 'lazy'
]);

export const CONTEXTUAL_KEYWORDS = new Set([
    'abstract', 'as', 'async', 'await', 'constructor', 'declare',
    'from', 'get', 'implements', 'interface', 'is', 'keyof',
    'module', 'namespace', 'of', 'private', 'protected', 'public',
    'readonly', 'require', 'set', 'static', 'type', 'struct', 'build', 'lazy'
]);

// ============================================================================
// ArkTS Decorators
// ============================================================================

export const ARKTS_DECORATORS = new Set([
    // Component decorators
    'Entry', 'Component', 'CustomDialog', 'Preview', 'Reusable',

    // State management decorators
    'State', 'Prop', 'Link', 'Provide', 'Consume', 'ObjectLink',
    'Watch', 'Observed', 'Track',

    // Storage decorators
    'StorageLink', 'StorageProp', 'LocalStorageLink', 'LocalStorageProp',

    // Builder decorators
    'Builder', 'BuilderParam', 'Styles', 'Extend', 'AnimatableExtend',

    // Concurrency decorators
    'Concurrent', 'Sendable',

    // Other decorators
    'Require'
]);

// ============================================================================
// Punctuators
// ============================================================================

export const PUNCTUATORS: string[] = [
    // Multi-character operators (ordered by length, longest first)
    '>>>=', '===', '!==', '>>>', '<<=', '>>=',
    '**=', '&&=', '||=', '??=',
    '++', '--', '<<', '>>', '<=', '>=', '==', '!=',
    '&&', '||', '??', '+=', '-=', '*=', '/=', '%=',
    '&=', '|=', '^=', '**', '=>', '?.', '...',
    // Single-character operators
    '{', '}', '(', ')', '[', ']', '.', ';', ',',
    '<', '>', '+', '-', '*', '/', '%', '|', '&',
    '^', '!', '~', '?', ':', '=', '@'
];

// ============================================================================
// Lexer Class
// ============================================================================

export class ArkTSLexer {
    private readonly source: string;
    private index: number = 0;
    private line: number = 1;
    private column: number = 1;
    private lineStart: number = 0;
    private lookahead: Token | null = null;

    constructor(source: string) {
        this.source = source;
    }

    /**
     * Get current position info
     */
    getPosition(): { line: number; column: number; offset: number } {
        return {
            line: this.line,
            column: this.column,
            offset: this.index
        };
    }

    /**
     * Peek at the next token without consuming it
     */
    peek(): Token {
        if (this.lookahead === null) {
            this.lookahead = this.nextTokenInternal();
        }
        return this.lookahead;
    }

    /**
     * Get the next token and advance
     */
    nextToken(): Token {
        if (this.lookahead !== null) {
            const token = this.lookahead;
            this.lookahead = null;
            return token;
        }
        return this.nextTokenInternal();
    }

    /**
     * Check if we're at the end of input
     */
    isEOF(): boolean {
        return this.index >= this.source.length;
    }

    /**
     * Internal method to read the next token
     */
    private nextTokenInternal(): Token {
        this.skipWhitespaceAndComments();

        if (this.isEOF()) {
            return this.createToken(TokenType.EOF, '', this.index, this.index);
        }

        const ch = this.currentChar();

        // Decorator
        if (ch === '@') {
            return this.scanDecorator();
        }

        // String literal
        if (ch === '"' || ch === "'") {
            return this.scanStringLiteral();
        }

        // Template literal
        if (ch === '`') {
            return this.scanTemplateLiteral();
        }

        // Numeric literal
        if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peekChar(1)))) {
            return this.scanNumericLiteral();
        }

        // Identifier or keyword
        if (this.isIdentifierStart(ch)) {
            return this.scanIdentifierOrKeyword();
        }

        // Punctuator
        return this.scanPunctuator();
    }

    /**
     * Skip whitespace and comments
     */
    private skipWhitespaceAndComments(): void {
        while (!this.isEOF()) {
            const ch = this.currentChar();

            // Whitespace
            if (this.isWhitespace(ch)) {
                this.advance();
                continue;
            }

            // Line terminator
            if (this.isLineTerminator(ch)) {
                this.advanceLine();
                continue;
            }

            // Single-line comment
            if (ch === '/' && this.peekChar(1) === '/') {
                this.skipLineComment();
                continue;
            }

            // Multi-line comment
            if (ch === '/' && this.peekChar(1) === '*') {
                this.skipBlockComment();
                continue;
            }

            break;
        }
    }

    /**
     * Skip single-line comment
     */
    private skipLineComment(): void {
        this.advance(); // skip '/'
        this.advance(); // skip '/'
        while (!this.isEOF() && !this.isLineTerminator(this.currentChar())) {
            this.advance();
        }
    }

    /**
     * Skip multi-line comment
     */
    private skipBlockComment(): void {
        this.advance(); // skip '/'
        this.advance(); // skip '*'
        while (!this.isEOF()) {
            if (this.currentChar() === '*' && this.peekChar(1) === '/') {
                this.advance(); // skip '*'
                this.advance(); // skip '/'
                break;
            }
            if (this.isLineTerminator(this.currentChar())) {
                this.advanceLine();
            } else {
                this.advance();
            }
        }
    }

    /**
     * Scan decorator (@xxx)
     */
    private scanDecorator(): Token {
        const start = this.index;
        const startColumn = this.column;
        this.advance(); // skip '@'

        // Read decorator name
        while (!this.isEOF() && this.isIdentifierChar(this.currentChar())) {
            this.advance();
        }

        const value = this.source.slice(start, this.index);
        return {
            type: TokenType.Decorator,
            value,
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Scan string literal
     */
    private scanStringLiteral(): Token {
        const quote = this.currentChar();
        const start = this.index;
        const startColumn = this.column;

        this.advance(); // skip opening quote

        let value = '';
        let escaped = false;

        while (!this.isEOF()) {
            const ch = this.currentChar();

            if (escaped) {
                value += this.getEscapedChar(ch);
                escaped = false;
                this.advance();
                continue;
            }

            if (ch === '\\') {
                escaped = true;
                this.advance();
                continue;
            }

            if (ch === quote) {
                this.advance(); // skip closing quote
                break;
            }

            if (this.isLineTerminator(ch)) {
                // Unterminated string literal
                break;
            }

            value += ch;
            this.advance();
        }

        const raw = this.source.slice(start, this.index);
        return {
            type: TokenType.StringLiteral,
            value,
            raw,
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Scan template literal
     */
    private scanTemplateLiteral(): Token {
        const start = this.index;
        const startColumn = this.column;

        this.advance(); // skip '`'

        let value = '';
        let escaped = false;

        while (!this.isEOF()) {
            const ch = this.currentChar();

            if (escaped) {
                value += this.getEscapedChar(ch);
                escaped = false;
                this.advance();
                continue;
            }

            if (ch === '\\') {
                escaped = true;
                this.advance();
                continue;
            }

            if (ch === '`') {
                this.advance(); // skip closing '`'
                break;
            }

            if (ch === '$' && this.peekChar(1) === '{') {
                // Template expression start
                const raw = this.source.slice(start, this.index);
                return {
                    type: TokenType.TemplateHead,
                    value,
                    raw,
                    start,
                    end: this.index,
                    line: this.line,
                    column: startColumn
                };
            }

            if (this.isLineTerminator(ch)) {
                value += '\n';
                this.advanceLine();
                continue;
            }

            value += ch;
            this.advance();
        }

        const raw = this.source.slice(start, this.index);
        return {
            type: TokenType.TemplateLiteral,
            value,
            raw,
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Continue scanning template literal after expression
     */
    scanTemplateMiddleOrTail(): Token {
        const start = this.index;
        const startColumn = this.column;

        // Skip the closing '}'
        if (this.currentChar() === '}') {
            this.advance();
        }

        let value = '';
        let escaped = false;

        while (!this.isEOF()) {
            const ch = this.currentChar();

            if (escaped) {
                value += this.getEscapedChar(ch);
                escaped = false;
                this.advance();
                continue;
            }

            if (ch === '\\') {
                escaped = true;
                this.advance();
                continue;
            }

            if (ch === '`') {
                this.advance(); // skip closing '`'
                return {
                    type: TokenType.TemplateTail,
                    value,
                    raw: this.source.slice(start, this.index),
                    start,
                    end: this.index,
                    line: this.line,
                    column: startColumn
                };
            }

            if (ch === '$' && this.peekChar(1) === '{') {
                return {
                    type: TokenType.TemplateMiddle,
                    value,
                    raw: this.source.slice(start, this.index),
                    start,
                    end: this.index,
                    line: this.line,
                    column: startColumn
                };
            }

            if (this.isLineTerminator(ch)) {
                value += '\n';
                this.advanceLine();
                continue;
            }

            value += ch;
            this.advance();
        }

        return {
            type: TokenType.TemplateTail,
            value,
            raw: this.source.slice(start, this.index),
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Scan numeric literal
     */
    private scanNumericLiteral(): Token {
        const start = this.index;
        const startColumn = this.column;

        let value = '';

        // Check for hex, binary, or octal
        if (this.currentChar() === '0') {
            const next = this.peekChar(1).toLowerCase();
            if (next === 'x') {
                return this.scanHexLiteral(start, startColumn);
            }
            if (next === 'b') {
                return this.scanBinaryLiteral(start, startColumn);
            }
            if (next === 'o') {
                return this.scanOctalLiteral(start, startColumn);
            }
        }

        // Integer part
        while (!this.isEOF() && this.isDigit(this.currentChar())) {
            value += this.currentChar();
            this.advance();
        }

        // Decimal part
        if (this.currentChar() === '.' && this.isDigit(this.peekChar(1))) {
            value += this.currentChar();
            this.advance();
            while (!this.isEOF() && this.isDigit(this.currentChar())) {
                value += this.currentChar();
                this.advance();
            }
        }

        // Exponent part
        if (this.currentChar().toLowerCase() === 'e') {
            value += this.currentChar();
            this.advance();
            if (this.currentChar() === '+' || this.currentChar() === '-') {
                value += this.currentChar();
                this.advance();
            }
            while (!this.isEOF() && this.isDigit(this.currentChar())) {
                value += this.currentChar();
                this.advance();
            }
        }

        // BigInt suffix
        if (this.currentChar() === 'n') {
            value += this.currentChar();
            this.advance();
        }

        return {
            type: TokenType.NumericLiteral,
            value,
            raw: this.source.slice(start, this.index),
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Scan hexadecimal literal
     */
    private scanHexLiteral(start: number, startColumn: number): Token {
        let value = '0x';
        this.advance(); // skip '0'
        this.advance(); // skip 'x'

        while (!this.isEOF() && this.isHexDigit(this.currentChar())) {
            value += this.currentChar();
            this.advance();
        }

        return {
            type: TokenType.NumericLiteral,
            value,
            raw: this.source.slice(start, this.index),
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Scan binary literal
     */
    private scanBinaryLiteral(start: number, startColumn: number): Token {
        let value = '0b';
        this.advance(); // skip '0'
        this.advance(); // skip 'b'

        while (!this.isEOF() && (this.currentChar() === '0' || this.currentChar() === '1')) {
            value += this.currentChar();
            this.advance();
        }

        return {
            type: TokenType.NumericLiteral,
            value,
            raw: this.source.slice(start, this.index),
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Scan octal literal
     */
    private scanOctalLiteral(start: number, startColumn: number): Token {
        let value = '0o';
        this.advance(); // skip '0'
        this.advance(); // skip 'o'

        while (!this.isEOF() && this.isOctalDigit(this.currentChar())) {
            value += this.currentChar();
            this.advance();
        }

        return {
            type: TokenType.NumericLiteral,
            value,
            raw: this.source.slice(start, this.index),
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Scan identifier or keyword
     */
    private scanIdentifierOrKeyword(): Token {
        const start = this.index;
        const startColumn = this.column;

        while (!this.isEOF() && this.isIdentifierChar(this.currentChar())) {
            this.advance();
        }

        const value = this.source.slice(start, this.index);
        const type = KEYWORDS.has(value) ? TokenType.Keyword : TokenType.Identifier;

        return {
            type,
            value,
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Scan punctuator
     */
    private scanPunctuator(): Token {
        const start = this.index;
        const startColumn = this.column;

        // Try to match longest punctuator first
        for (const punct of PUNCTUATORS) {
            if (this.source.startsWith(punct, this.index)) {
                for (let i = 0; i < punct.length; i++) {
                    this.advance();
                }
                return {
                    type: TokenType.Punctuator,
                    value: punct,
                    start,
                    end: this.index,
                    line: this.line,
                    column: startColumn
                };
            }
        }

        // Unknown character, advance anyway
        const ch = this.currentChar();
        this.advance();
        return {
            type: TokenType.Punctuator,
            value: ch,
            start,
            end: this.index,
            line: this.line,
            column: startColumn
        };
    }

    /**
     * Get escaped character
     */
    private getEscapedChar(ch: string): string {
        switch (ch) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'b': return '\b';
            case 'f': return '\f';
            case 'v': return '\v';
            case '0': return '\0';
            case "'": return "'";
            case '"': return '"';
            case '\\': return '\\';
            case '`': return '`';
            default: return ch;
        }
    }

    /**
     * Get current character
     */
    private currentChar(): string {
        return this.source[this.index] || '';
    }

    /**
     * Peek character at offset
     */
    private peekChar(offset: number): string {
        return this.source[this.index + offset] || '';
    }

    /**
     * Advance one character
     */
    private advance(): void {
        if (!this.isEOF()) {
            this.index++;
            this.column++;
        }
    }

    /**
     * Advance line
     */
    private advanceLine(): void {
        if (this.currentChar() === '\r' && this.peekChar(1) === '\n') {
            this.index += 2;
        } else {
            this.index++;
        }
        this.line++;
        this.column = 1;
        this.lineStart = this.index;
    }

    /**
     * Character type checks
     */
    private isWhitespace(ch: string): boolean {
        return ch === ' ' || ch === '\t' || ch === '\v' || ch === '\f' || ch === '\u00A0' || ch === '\uFEFF';
    }

    private isLineTerminator(ch: string): boolean {
        return ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029';
    }

    private isDigit(ch: string): boolean {
        return ch >= '0' && ch <= '9';
    }

    private isHexDigit(ch: string): boolean {
        return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
    }

    private isOctalDigit(ch: string): boolean {
        return ch >= '0' && ch <= '7';
    }

    private isIdentifierStart(ch: string): boolean {
        return (ch >= 'a' && ch <= 'z') ||
            (ch >= 'A' && ch <= 'Z') ||
            ch === '_' ||
            ch === '$' ||
            ch.charCodeAt(0) > 127; // Unicode
    }

    private isIdentifierChar(ch: string): boolean {
        return this.isIdentifierStart(ch) || this.isDigit(ch);
    }

    /**
     * Create token helper
     */
    private createToken(type: TokenType, value: string, start: number, end: number): Token {
        return {
            type,
            value,
            start,
            end,
            line: this.line,
            column: this.column
        };
    }

    /**
     * Save current state for backtracking
     */
    saveState(): { index: number; line: number; column: number; lineStart: number } {
        return {
            index: this.index,
            line: this.line,
            column: this.column,
            lineStart: this.lineStart
        };
    }

    /**
     * Restore state for backtracking
     */
    restoreState(state: { index: number; line: number; column: number; lineStart: number }): void {
        this.index = state.index;
        this.line = state.line;
        this.column = state.column;
        this.lineStart = state.lineStart;
        this.lookahead = null;
    }
}

/**
 * Tokenize source code into array of tokens
 */
export function tokenize(source: string): Token[] {
    const lexer = new ArkTSLexer(source);
    const tokens: Token[] = [];

    while (true) {
        const token = lexer.nextToken();
        tokens.push(token);
        if (token.type === TokenType.EOF) {
            break;
        }
    }

    return tokens;
}

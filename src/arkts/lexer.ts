export enum TokenType {
    EOF = 'EOF',
    Whitespace = 'Whitespace',
    Newline = 'Newline',
    Comment = 'Comment',
    BlockComment = 'BlockComment',
    DocComment = 'DocComment',
    String = 'String',
    TemplateString = 'TemplateString',
    Number = 'Number',
    Identifier = 'Identifier',
    Keyword = 'Keyword',
    Decorator = 'Decorator',
    Operator = 'Operator',
    Punctuator = 'Punctuator',
    RegExp = 'RegExp'
}

export interface Token {
    type: TokenType;
    value: string;
    start: number;
    end: number;
    line: number;
    column: number;
}

const KEYWORDS = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for',
    'function', 'if', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null',
    'return', 'static', 'struct', 'super', 'switch', 'this', 'throw', 'true', 'try',
    'typeof', 'undefined', 'var', 'void', 'while', 'with', 'as', 'implements',
    'private', 'protected', 'public', 'readonly', 'type', 'from', 'of', 'async',
    'await', 'abstract', 'declare', 'namespace', 'module', 'get', 'set', 'is',
    'keyof', 'infer', 'never', 'unknown', 'any', 'lazy'
]);

const OPERATORS = [
    '>>>=', '===', '!==', '>>>', '<<=', '>>=', '**=', '&&=', '||=', '??=',
    '<=', '>=', '==', '!=', '++', '--', '<<', '>>', '&&', '||', '??',
    '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '=>', '**', '?.',
    '+', '-', '*', '/', '%', '<', '>', '&', '|', '^', '~', '!', '?', ':', '='
];

const PUNCTUATORS = ['{', '}', '(', ')', '[', ']', ';', ',', '.', '...'];

export class ArkTSLexer {
    private readonly text: string;
    private index = 0;
    private line = 1;
    private column = 1;
    private lookahead: Token | null = null;

    constructor(text: string) {
        this.text = text;
    }

    peekToken(): Token {
        if (!this.lookahead) {
            this.lookahead = this.nextTokenInternal();
        }
        return this.lookahead;
    }

    nextToken(): Token {
        if (this.lookahead) {
            const token = this.lookahead;
            this.lookahead = null;
            return token;
        }
        return this.nextTokenInternal();
    }

    private nextTokenInternal(): Token {
        if (this.index >= this.text.length) {
            return this.createToken(TokenType.EOF, '', this.index, this.index);
        }

        const ch = this.peekChar();

        if (ch === '\n') {
            const start = this.index;
            this.advance(1);
            return this.createToken(TokenType.Newline, '\n', start, this.index);
        }

        if (ch === '\r') {
            const start = this.index;
            if (this.peekChar(1) === '\n') {
                this.advance(2);
                return this.createToken(TokenType.Newline, '\r\n', start, this.index);
            }
            this.advance(1);
            return this.createToken(TokenType.Newline, '\r', start, this.index);
        }

        if (this.isWhitespace(ch)) {
            return this.readWhitespace();
        }

        if (this.match('//')) {
            return this.readLineComment();
        }

        if (this.match('/**')) {
            return this.readBlockComment(true);
        }

        if (this.match('/*')) {
            return this.readBlockComment(false);
        }

        if (ch === '@') {
            return this.readDecorator();
        }

        if (ch === '"' || ch === "'") {
            return this.readString();
        }

        if (ch === '`') {
            return this.readTemplateString();
        }

        if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peekChar(1)))) {
            return this.readNumber();
        }

        if (this.isIdentifierStart(ch)) {
            return this.readIdentifierOrKeyword();
        }

        const operator = this.readOperator();
        if (operator) {
            return operator;
        }

        const punctuator = this.readPunctuator();
        if (punctuator) {
            return punctuator;
        }

        const start = this.index;
        this.advance(1);
        return this.createToken(TokenType.Punctuator, ch, start, this.index);
    }

    private readWhitespace(): Token {
        const start = this.index;
        while (this.index < this.text.length) {
            const ch = this.peekChar();
            if (!this.isWhitespace(ch) || ch === '\n' || ch === '\r') {
                break;
            }
            this.advance(1);
        }
        return this.createToken(TokenType.Whitespace, this.text.slice(start, this.index), start, this.index);
    }

    private readLineComment(): Token {
        const start = this.index;
        this.advance(2);
        while (this.index < this.text.length && this.peekChar() !== '\n' && this.peekChar() !== '\r') {
            this.advance(1);
        }
        return this.createToken(TokenType.Comment, this.text.slice(start, this.index), start, this.index);
    }

    private readBlockComment(isDoc: boolean): Token {
        const start = this.index;
        this.advance(isDoc ? 3 : 2);
        while (this.index < this.text.length && !this.match('*/')) {
            this.advance(1);
        }
        if (this.match('*/')) {
            this.advance(2);
        }
        const type = isDoc ? TokenType.DocComment : TokenType.BlockComment;
        return this.createToken(type, this.text.slice(start, this.index), start, this.index);
    }

    private readDecorator(): Token {
        const start = this.index;
        this.advance(1);
        while (this.index < this.text.length && this.isIdentifierChar(this.peekChar())) {
            this.advance(1);
        }
        return this.createToken(TokenType.Decorator, this.text.slice(start, this.index), start, this.index);
    }

    private readString(): Token {
        const quote = this.peekChar();
        const start = this.index;
        this.advance(1);
        let escaped = false;
        while (this.index < this.text.length) {
            const ch = this.peekChar();
            if (!escaped && ch === quote) {
                this.advance(1);
                break;
            }
            if (!escaped && ch === '\\') {
                escaped = true;
                this.advance(1);
                continue;
            }
            escaped = false;
            this.advance(1);
        }
        return this.createToken(TokenType.String, this.text.slice(start, this.index), start, this.index);
    }

    private readTemplateString(): Token {
        const start = this.index;
        this.advance(1);
        let braceDepth = 0;
        while (this.index < this.text.length) {
            const ch = this.peekChar();
            if (ch === '\\') {
                this.advance(2);
                continue;
            }
            if (ch === '$' && this.peekChar(1) === '{') {
                this.advance(2);
                braceDepth++;
                continue;
            }
            if (ch === '{' && braceDepth > 0) {
                braceDepth++;
                this.advance(1);
                continue;
            }
            if (ch === '}' && braceDepth > 0) {
                braceDepth--;
                this.advance(1);
                continue;
            }
            if (ch === '`' && braceDepth === 0) {
                this.advance(1);
                break;
            }
            this.advance(1);
        }
        return this.createToken(TokenType.TemplateString, this.text.slice(start, this.index), start, this.index);
    }

    private readNumber(): Token {
        const start = this.index;
        if (this.match('0x') || this.match('0X')) {
            this.advance(2);
            while (this.index < this.text.length && this.isHexDigit(this.peekChar())) {
                this.advance(1);
            }
        } else if (this.match('0b') || this.match('0B')) {
            this.advance(2);
            while (this.index < this.text.length && (this.peekChar() === '0' || this.peekChar() === '1')) {
                this.advance(1);
            }
        } else if (this.match('0o') || this.match('0O')) {
            this.advance(2);
            while (this.index < this.text.length && this.isOctDigit(this.peekChar())) {
                this.advance(1);
            }
        } else {
            while (this.index < this.text.length && this.isDigit(this.peekChar())) {
                this.advance(1);
            }
            if (this.peekChar() === '.') {
                this.advance(1);
                while (this.index < this.text.length && this.isDigit(this.peekChar())) {
                    this.advance(1);
                }
            }
            if (this.peekChar().toLowerCase() === 'e') {
                this.advance(1);
                if (this.peekChar() === '+' || this.peekChar() === '-') {
                    this.advance(1);
                }
                while (this.index < this.text.length && this.isDigit(this.peekChar())) {
                    this.advance(1);
                }
            }
        }
        if (this.peekChar() === 'n') {
            this.advance(1);
        }
        return this.createToken(TokenType.Number, this.text.slice(start, this.index), start, this.index);
    }

    private readIdentifierOrKeyword(): Token {
        const start = this.index;
        this.advance(1);
        while (this.index < this.text.length && this.isIdentifierChar(this.peekChar())) {
            this.advance(1);
        }
        const value = this.text.slice(start, this.index);
        const type = KEYWORDS.has(value) ? TokenType.Keyword : TokenType.Identifier;
        return this.createToken(type, value, start, this.index);
    }

    private readOperator(): Token | null {
        for (const op of OPERATORS) {
            if (this.match(op)) {
                const start = this.index;
                this.advance(op.length);
                return this.createToken(TokenType.Operator, op, start, this.index);
            }
        }
        return null;
    }

    private readPunctuator(): Token | null {
        for (const punct of PUNCTUATORS) {
            if (this.match(punct)) {
                const start = this.index;
                this.advance(punct.length);
                return this.createToken(TokenType.Punctuator, punct, start, this.index);
            }
        }
        return null;
    }

    private isWhitespace(ch: string): boolean {
        return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\f' || ch === '\v';
    }

    private isDigit(ch: string): boolean {
        return /[0-9]/.test(ch);
    }

    private isHexDigit(ch: string): boolean {
        return /[0-9a-fA-F]/.test(ch);
    }

    private isOctDigit(ch: string): boolean {
        return /[0-7]/.test(ch);
    }

    private isIdentifierStart(ch: string): boolean {
        return /[A-Za-z_$]/.test(ch);
    }

    private isIdentifierChar(ch: string): boolean {
        return /[A-Za-z0-9_$]/.test(ch);
    }

    private match(value: string): boolean {
        return this.text.startsWith(value, this.index);
    }

    private peekChar(offset = 0): string {
        return this.text[this.index + offset] ?? '';
    }

    private advance(count: number): void {
        for (let i = 0; i < count; i += 1) {
            const ch = this.text[this.index];
            this.index += 1;
            if (ch === '\n') {
                this.line += 1;
                this.column = 1;
            } else {
                this.column += 1;
            }
        }
    }

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

    getPosition(): { index: number; line: number; column: number } {
        return { index: this.index, line: this.line, column: this.column };
    }

    setPosition(pos: { index: number; line: number; column: number }): void {
        this.index = pos.index;
        this.line = pos.line;
        this.column = pos.column;
        this.lookahead = null;
    }
}

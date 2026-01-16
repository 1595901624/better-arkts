import { ExprLiteral } from './ast';

export enum TokenType {
    EOF = 'EOF',
    Text = 'Text',
    Comment = 'Comment',
    TagOpen = 'TagOpen',
    TagClose = 'TagClose',
    TagEnd = 'TagEnd',
    TagSelfClose = 'TagSelfClose',
    Name = 'Name',
    Equals = 'Equals',
    String = 'String',
    UnquotedValue = 'UnquotedValue',
    InterpolationStart = 'InterpolationStart',
    InterpolationEnd = 'InterpolationEnd',
    Identifier = 'Identifier',
    Number = 'Number',
    Boolean = 'Boolean',
    Null = 'Null',
    Undefined = 'Undefined',
    Operator = 'Operator',
    Punctuator = 'Punctuator'
}

export interface Token {
    type: TokenType;
    value: string;
    start: number;
    end: number;
    line: number;
    column: number;
}

type Mode = 'data' | 'tag' | 'interp';

export class HmlLexer {
    private readonly text: string;
    private index = 0;
    private line = 1;
    private column = 1;
    private modeStack: Mode[] = ['data'];
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

    private currentMode(): Mode {
        return this.modeStack[this.modeStack.length - 1];
    }

    private pushMode(mode: Mode): void {
        this.modeStack.push(mode);
    }

    private popMode(): void {
        if (this.modeStack.length > 1) {
            this.modeStack.pop();
        }
    }

    private nextTokenInternal(): Token {
        if (this.index >= this.text.length) {
            return this.createToken(TokenType.EOF, '', this.index, this.index);
        }

        switch (this.currentMode()) {
            case 'data':
                return this.readDataToken();
            case 'tag':
                return this.readTagToken();
            case 'interp':
                return this.readInterpolationToken();
            default:
                return this.createToken(TokenType.EOF, '', this.index, this.index);
        }
    }

    private readDataToken(): Token {
        if (this.match('<!--')) {
            return this.readComment();
        }

        if (this.match('{{')) {
            const start = this.index;
            this.advance(2);
            this.pushMode('interp');
            return this.createToken(TokenType.InterpolationStart, '{{', start, this.index);
        }

        if (this.match('</')) {
            const start = this.index;
            this.advance(2);
            this.pushMode('tag');
            return this.createToken(TokenType.TagClose, '</', start, this.index);
        }

        if (this.peekChar() === '<') {
            const start = this.index;
            this.advance(1);
            this.pushMode('tag');
            return this.createToken(TokenType.TagOpen, '<', start, this.index);
        }

        const start = this.index;
        while (this.index < this.text.length && !this.match('<') && !this.match('{{')) {
            this.advance(1);
        }
        return this.createToken(TokenType.Text, this.text.slice(start, this.index), start, this.index);
    }

    private readTagToken(): Token {
        this.skipWhitespace();
        if (this.match('/>')) {
            const start = this.index;
            this.advance(2);
            this.popMode();
            return this.createToken(TokenType.TagSelfClose, '/>', start, this.index);
        }
        if (this.peekChar() === '>') {
            const start = this.index;
            this.advance(1);
            this.popMode();
            return this.createToken(TokenType.TagEnd, '>', start, this.index);
        }
        if (this.match('{{')) {
            const start = this.index;
            this.advance(2);
            this.pushMode('interp');
            return this.createToken(TokenType.InterpolationStart, '{{', start, this.index);
        }
        if (this.peekChar() === '=') {
            const start = this.index;
            this.advance(1);
            return this.createToken(TokenType.Equals, '=', start, this.index);
        }
        if (this.peekChar() === '"' || this.peekChar() === "'") {
            return this.readString();
        }
        if (this.index >= this.text.length) {
            return this.createToken(TokenType.EOF, '', this.index, this.index);
        }
        if (this.isNameStart(this.peekChar())) {
            return this.readName();
        }

        const start = this.index;
        this.advance(1);
        return this.createToken(TokenType.UnquotedValue, this.text.slice(start, this.index), start, this.index);
    }

    private readInterpolationToken(): Token {
        this.skipWhitespace();
        if (this.match('}}')) {
            const start = this.index;
            this.advance(2);
            this.popMode();
            return this.createToken(TokenType.InterpolationEnd, '}}', start, this.index);
        }

        if (this.match('//')) {
            this.advance(2);
            while (this.index < this.text.length && this.peekChar() !== '\n') {
                this.advance(1);
            }
            return this.readInterpolationToken();
        }

        if (this.match('/*')) {
            this.advance(2);
            while (this.index < this.text.length && !this.match('*/')) {
                this.advance(1);
            }
            if (this.match('*/')) {
                this.advance(2);
            }
            return this.readInterpolationToken();
        }

        if (this.index >= this.text.length) {
            return this.createToken(TokenType.EOF, '', this.index, this.index);
        }

        const ch = this.peekChar();
        if (this.isIdentifierStart(ch)) {
            return this.readIdentifier();
        }
        if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peekChar(1)))) {
            return this.readNumber();
        }
        if (ch === '"' || ch === "'") {
            return this.readString();
        }

        const operator = this.readOperatorOrPunctuator();
        if (operator) {
            const type = this.isOperator(operator) ? TokenType.Operator : TokenType.Punctuator;
            return this.createToken(type, operator, this.index - operator.length, this.index);
        }

        const start = this.index;
        this.advance(1);
        return this.createToken(TokenType.Punctuator, this.text.slice(start, this.index), start, this.index);
    }

    private readComment(): Token {
        const start = this.index;
        this.advance(4);
        while (this.index < this.text.length && !this.match('-->')) {
            this.advance(1);
        }
        if (this.match('-->')) {
            const end = this.index;
            const content = this.text.slice(start + 4, end);
            this.advance(3);
            return this.createToken(TokenType.Comment, content, start, this.index);
        }
        return this.createToken(TokenType.Comment, this.text.slice(start + 4), start, this.index);
    }

    private readName(): Token {
        const start = this.index;
        this.advance(1);
        while (this.index < this.text.length && this.isNameChar(this.peekChar())) {
            this.advance(1);
        }
        return this.createToken(TokenType.Name, this.text.slice(start, this.index), start, this.index);
    }

    private readIdentifier(): Token {
        const start = this.index;
        this.advance(1);
        while (this.index < this.text.length && this.isIdentifierChar(this.peekChar())) {
            this.advance(1);
        }
        const value = this.text.slice(start, this.index);
        if (value === 'true' || value === 'false') {
            return this.createToken(TokenType.Boolean, value, start, this.index);
        }
        if (value === 'null') {
            return this.createToken(TokenType.Null, value, start, this.index);
        }
        if (value === 'undefined') {
            return this.createToken(TokenType.Undefined, value, start, this.index);
        }
        return this.createToken(TokenType.Identifier, value, start, this.index);
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
        return this.createToken(TokenType.Number, this.text.slice(start, this.index), start, this.index);
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

    private readOperatorOrPunctuator(): string | null {
        const operators = [
            '===', '!==', '==', '!=', '>=', '<=', '&&', '||', '++', '--',
            '+=', '-=', '*=', '/=', '%=', '=>', '<<', '>>', '>>>',
            '+', '-', '*', '/', '%', '>', '<', '!', '~', '?', ':', '=',
            '&', '|', '^', '.', ',', '(', ')', '[', ']', '{', '}'
        ];
        for (const op of operators) {
            if (this.match(op)) {
                const start = this.index;
                this.advance(op.length);
                return this.text.slice(start, this.index);
            }
        }
        return null;
    }

    private isOperator(value: string): boolean {
        return /^(===|!==|==|!=|>=|<=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|=>|<<|>>|>>>|\+|-|\*|\/|%|>|<|!|~|\?|:|=|&|\||\^|\.)$/.test(value);
    }

    private skipWhitespace(): void {
        while (this.index < this.text.length) {
            const ch = this.peekChar();
            if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
                this.advance(1);
                continue;
            }
            break;
        }
    }

    private isNameStart(ch: string): boolean {
        return /[A-Za-z_:\-]/.test(ch);
    }

    private isNameChar(ch: string): boolean {
        return /[A-Za-z0-9_:\-\.]/.test(ch);
    }

    private isIdentifierStart(ch: string): boolean {
        return /[A-Za-z_$]/.test(ch);
    }

    private isIdentifierChar(ch: string): boolean {
        return /[A-Za-z0-9_$]/.test(ch);
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
}

export function tokenToLiteral(token: Token): ExprLiteral {
    if (token.type === TokenType.Boolean) {
        return { type: 'Literal', value: token.value === 'true', raw: token.value };
    }
    if (token.type === TokenType.Null) {
        return { type: 'Literal', value: null, raw: token.value };
    }
    if (token.type === TokenType.Number) {
        return { type: 'Literal', value: Number(token.value), raw: token.value };
    }
    if (token.type === TokenType.String) {
        const raw = token.value;
        const unquoted = raw.length >= 2 ? raw.slice(1, -1) : '';
        return { type: 'Literal', value: unquoted, raw };
    }
    return { type: 'Literal', value: token.value, raw: token.value };
}

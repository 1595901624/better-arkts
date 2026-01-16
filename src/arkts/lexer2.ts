
export enum TokenType {
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
	RegExp = 'RegExp',
	EOF = 'EOF'
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
	'import', 'export', 'default', 'from', 'as', 'lazy',
	'struct', 'class', 'interface', 'extends', 'implements',
	'function', 'return', 'if', 'else', 'for', 'while', 'do',
	'switch', 'case', 'break', 'continue',
	'try', 'catch', 'finally', 'throw',
	'new', 'this', 'super',
	'const', 'let', 'var',
	'public', 'private', 'protected',
	'static', 'readonly', 'abstract',
	'async', 'await',
	'get', 'set',
	'type', 'enum', 'namespace',
	'true', 'false', 'null', 'undefined'
]);

const OPERATORS = new Set([
	'===', '!==', '==', '!=', '<=', '>=', '=>',
	'++', '--', '&&', '||', '??',
	'+=', '-=', '*=', '/=', '%=', '??=',
	'<<', '>>', '>>>',
	'&', '|', '^', '~',
	'+', '-', '*', '/', '%',
	'<', '>', '=', '!', '?', ':',
	'.', '?.'
]);

const PUNCTUATORS = new Set([
	'{', '}', '(', ')', '[', ']',
	',', ';'
]);

export class ArkTSLexer2 {
	private readonly input: string;
	private position = 0;
	private line = 1;
	private column = 1;

	constructor(input: string) {
		this.input = input;
	}

	nextToken(): Token {
		if (this.position >= this.input.length) {
			return { type: TokenType.EOF, value: '', start: this.position, end: this.position, line: this.line, column: this.column };
		}

		const ch = this.peek();
		const start = this.position;
		const startLine = this.line;
		const startColumn = this.column;

		// Newlines
		if (ch === '\n' || ch === '\r') {
			const value = this.consumeNewline();
			return { type: TokenType.Newline, value, start, end: this.position, line: startLine, column: startColumn };
		}

		// Whitespace
		if (ch === ' ' || ch === '\t') {
			let value = '';
			while (this.position < this.input.length) {
				const c = this.peek();
				if (c === ' ' || c === '\t') {
					value += this.advanceChar();
				} else {
					break;
				}
			}
			return { type: TokenType.Whitespace, value, start, end: this.position, line: startLine, column: startColumn };
		}

		// Comments
		if (ch === '/' && this.peek(1) === '/') {
			this.advanceChar();
			this.advanceChar();
			let value = '//';
			while (this.position < this.input.length && this.peek() !== '\n' && this.peek() !== '\r') {
				value += this.advanceChar();
			}
			return { type: TokenType.Comment, value, start, end: this.position, line: startLine, column: startColumn };
		}

		if (ch === '/' && this.peek(1) === '*') {
			this.advanceChar();
			this.advanceChar();
			let value = '/*';
			const isDoc = this.peek() === '*';
			while (this.position < this.input.length) {
				if (this.peek() === '*' && this.peek(1) === '/') {
					value += this.advanceChar();
					value += this.advanceChar();
					break;
				}
				value += this.advanceChar();
			}
			return {
				type: isDoc ? TokenType.DocComment : TokenType.BlockComment,
				value,
				start,
				end: this.position,
				line: startLine,
				column: startColumn
			};
		}

		// Decorator
		if (ch === '@') {
			let value = '';
			value += this.advanceChar();
			while (this.position < this.input.length) {
				const c = this.peek();
				if (this.isIdentifierPart(c)) {
					value += this.advanceChar();
				} else {
					break;
				}
			}
			return { type: TokenType.Decorator, value, start, end: this.position, line: startLine, column: startColumn };
		}

		// String / Template
		if (ch === '"' || ch === "'" || ch === '`') {
			const quote = ch;
			const value = this.consumeString(quote);
			return {
				type: quote === '`' ? TokenType.TemplateString : TokenType.String,
				value,
				start,
				end: this.position,
				line: startLine,
				column: startColumn
			};
		}

		// Number
		if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peek(1)))) {
			const value = this.consumeNumber();
			return { type: TokenType.Number, value, start, end: this.position, line: startLine, column: startColumn };
		}

		// Identifier / Keyword
		if (this.isIdentifierStart(ch)) {
			let value = '';
			value += this.advanceChar();
			while (this.position < this.input.length && this.isIdentifierPart(this.peek())) {
				value += this.advanceChar();
			}
			const type = KEYWORDS.has(value) ? TokenType.Keyword : TokenType.Identifier;
			return { type, value, start, end: this.position, line: startLine, column: startColumn };
		}

		// RegExp literal (heuristic): starts with '/' and not a comment.
		if (ch === '/' && this.peek(1) !== '/' && this.peek(1) !== '*') {
			const value = this.consumeRegExp();
			if (value) {
				return { type: TokenType.RegExp, value, start, end: this.position, line: startLine, column: startColumn };
			}
		}

		// Punctuators
		if (PUNCTUATORS.has(ch)) {
			this.advanceChar();
			return { type: TokenType.Punctuator, value: ch, start, end: this.position, line: startLine, column: startColumn };
		}

		// Operators (max munch)
		const op = this.matchOperator();
		if (op) {
			for (let i = 0; i < op.length; i++) {
				this.advanceChar();
			}
			return { type: TokenType.Operator, value: op, start, end: this.position, line: startLine, column: startColumn };
		}

		// Fallback single char as punctuator
		this.advanceChar();
		return { type: TokenType.Punctuator, value: ch, start, end: this.position, line: startLine, column: startColumn };
	}

	private peek(ahead: number = 0): string {
		return this.input[this.position + ahead] ?? '';
	}

	private advanceChar(): string {
		const ch = this.input[this.position] ?? '';
		this.position++;
		if (ch === '\n') {
			this.line++;
			this.column = 1;
		} else {
			this.column++;
		}
		return ch;
	}

	private consumeNewline(): string {
		let value = '';
		const ch = this.peek();
		if (ch === '\r') {
			value += this.advanceChar();
			if (this.peek() === '\n') {
				value += this.advanceChar();
			}
		} else {
			value += this.advanceChar();
		}
		return value;
	}

	private consumeString(quote: string): string {
		let value = '';
		value += this.advanceChar();

		if (quote === '`') {
			let braceDepth = 0;
			while (this.position < this.input.length) {
				const ch = this.peek();
				value += this.advanceChar();

				if (ch === '\\') {
					if (this.position < this.input.length) {
						value += this.advanceChar();
					}
					continue;
				}

				if (ch === '`' && braceDepth === 0) {
					break;
				}

				// Enter ${ ... } expression
				if (ch === '$' && this.peek() === '{') {
					value += this.advanceChar(); // consume '{'
					braceDepth++;
					continue;
				}

				if (ch === '{' && braceDepth > 0) {
					braceDepth++;
					continue;
				}

				if (ch === '}' && braceDepth > 0) {
					braceDepth--;
					continue;
				}
			}
		} else {
			while (this.position < this.input.length) {
				const ch = this.peek();
				value += this.advanceChar();
				if (ch === '\\') {
					if (this.position < this.input.length) {
						value += this.advanceChar();
					}
					continue;
				}
				if (ch === quote) {
					break;
				}
			}
		}

		return value;
	}

	private consumeNumber(): string {
		let value = '';
		const startCh = this.peek();

		if (startCh === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
			value += this.advanceChar();
			value += this.advanceChar();
			while (this.isHexDigit(this.peek())) {
				value += this.advanceChar();
			}
			return value;
		}

		while (this.isDigit(this.peek())) {
			value += this.advanceChar();
		}
		if (this.peek() === '.' && this.isDigit(this.peek(1))) {
			value += this.advanceChar();
			while (this.isDigit(this.peek())) {
				value += this.advanceChar();
			}
		}
		if (this.peek() === 'e' || this.peek() === 'E') {
			const next = this.peek(1);
			if (this.isDigit(next) || next === '+' || next === '-') {
				value += this.advanceChar();
				if (this.peek() === '+' || this.peek() === '-') {
					value += this.advanceChar();
				}
				while (this.isDigit(this.peek())) {
					value += this.advanceChar();
				}
			}
		}

		return value;
	}

	private consumeRegExp(): string | null {
		const startPos = this.position;
		let value = '';

		if (this.peek() !== '/') {
			return null;
		}
		value += this.advanceChar();

		let inCharClass = false;
		while (this.position < this.input.length) {
			const ch = this.peek();
			if (ch === '\\') {
				value += this.advanceChar();
				if (this.position < this.input.length) {
					value += this.advanceChar();
				}
				continue;
			}
			if (ch === '[') {
				inCharClass = true;
				value += this.advanceChar();
				continue;
			}
			if (ch === ']' && inCharClass) {
				inCharClass = false;
				value += this.advanceChar();
				continue;
			}
			if (ch === '/' && !inCharClass) {
				value += this.advanceChar();
				break;
			}
			if (ch === '\n' || ch === '\r') {
				this.position = startPos;
				return null;
			}
			value += this.advanceChar();
		}

		while (this.isIdentifierPart(this.peek())) {
			value += this.advanceChar();
		}

		return value;
	}

	private matchOperator(): string | null {
		const maxLen = 3;
		for (let len = maxLen; len >= 1; len--) {
			const candidate = this.input.slice(this.position, this.position + len);
			if (OPERATORS.has(candidate)) {
				return candidate;
			}
		}
		return null;
	}

	private isDigit(ch: string): boolean {
		return ch >= '0' && ch <= '9';
	}

	private isHexDigit(ch: string): boolean {
		return (
			(ch >= '0' && ch <= '9') ||
			(ch >= 'a' && ch <= 'f') ||
			(ch >= 'A' && ch <= 'F')
		);
	}

	private isIdentifierStart(ch: string): boolean {
		return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
	}

	private isIdentifierPart(ch: string): boolean {
		return this.isIdentifierStart(ch) || this.isDigit(ch);
	}
}


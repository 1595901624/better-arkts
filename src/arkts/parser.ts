import { ArkTSLexer2, Token, TokenType } from './lexer2';

export interface SourceLocation {
	start: number;
	end: number;
	line: number;
	column: number;
}

export interface ParseError {
	message: string;
	line: number;
	column: number;
	start: number;
	end: number;
}

export interface DecoratorNode {
	type: 'Decorator';
	name: string;
	arguments?: string;
	location: SourceLocation;
}

export interface ImportNode {
	type: 'Import';
	raw: string;
	source: string;
	isLazy?: boolean;
	defaultImport?: string;
	namedImports?: string[];
	namespaceImport?: string;
	location: SourceLocation;
}

export interface ExportNode {
	type: 'Export';
	raw: string;
	isDefault?: boolean;
	declaration?: TopLevelNode;
	location: SourceLocation;
}

export interface ParameterNode {
	type: 'Parameter';
	name: string;
	parameterType?: string;
	defaultValue?: string;
	isOptional?: boolean;
	isRest?: boolean;
	decorators: DecoratorNode[];
}

export interface PropertyMember {
	type: 'Property';
	name: string;
	decorators: DecoratorNode[];
	propertyType?: string;
	initializer?: string;
	visibility?: 'public' | 'private' | 'protected';
	isStatic?: boolean;
	isReadonly?: boolean;
	isOptional?: boolean;
	location: SourceLocation;
}

export interface MethodMember {
	type: 'Method';
	name: string;
	decorators: DecoratorNode[];
	parameters: ParameterNode[];
	returnType?: string;
	body?: string;
	visibility?: 'public' | 'private' | 'protected';
	isStatic?: boolean;
	isAsync?: boolean;
	isAbstract?: boolean;
	location: SourceLocation;
}

export interface UIAttribute {
	type: 'UIAttribute';
	name: string;
	arguments: string;
}

export interface UIComponent {
	type: 'UIComponent';
	name: string;
	arguments?: string;
	attributes: UIAttribute[];
	children: UIComponent[];
	isConditional: boolean;
	isLoop: boolean;
	condition?: string;
	loopExpression?: string;
}

export interface BuildMethodMember {
	type: 'BuildMethod';
	decorators: DecoratorNode[];
	body: UIComponent[];
	rawBody: string;
	location: SourceLocation;
}

export type MemberNode = PropertyMember | MethodMember | BuildMethodMember;

export interface StructNode {
	type: 'Struct';
	name: string;
	decorators: DecoratorNode[];
	members: MemberNode[];
	extends?: string;
	implements?: string[];
	location: SourceLocation;
}

export interface ClassNode {
	type: 'Class';
	name: string;
	decorators: DecoratorNode[];
	members: MemberNode[];
	extends?: string;
	implements?: string[];
	isAbstract?: boolean;
	location: SourceLocation;
}

export interface InterfaceNode {
	type: 'Interface';
	name: string;
	members: MemberNode[];
	extends?: string[];
	location: SourceLocation;
}

export interface FunctionNode {
	type: 'Function';
	name: string;
	decorators: DecoratorNode[];
	parameters: ParameterNode[];
	returnType?: string;
	body?: string;
	isAsync?: boolean;
	isGenerator?: boolean;
	location: SourceLocation;
}

export interface ExpressionNode {
	type: 'Expression';
	raw: string;
	location: SourceLocation;
}

export type TopLevelNode =
	| ImportNode
	| ExportNode
	| StructNode
	| ClassNode
	| InterfaceNode
	| FunctionNode
	| ExpressionNode;

export interface ArkTSDocument {
	type: 'Document';
	children: TopLevelNode[];
	imports: ImportNode[];
	exports: ExportNode[];
	structs: StructNode[];
	classes: ClassNode[];
	interfaces: InterfaceNode[];
	functions: FunctionNode[];
}

export class ArkTSParser {
	private readonly sourceText: string;
	private readonly lexer: ArkTSLexer2;
	private tokens: Token[] = [];
	private tokenIndex: number = 0;
	private current: Token;
	public readonly errors: ParseError[] = [];

	constructor(text: string) {
		this.sourceText = text;
		this.lexer = new ArkTSLexer2(text);
		this.tokenizeAll();
		this.current = this.tokens[0] ?? this.createEOF();
	}

	parseDocument(): ArkTSDocument {
		const doc: ArkTSDocument = {
			type: 'Document',
			children: [],
			imports: [],
			exports: [],
			structs: [],
			classes: [],
			interfaces: [],
			functions: []
		};

		while (!this.isEOF()) {
			this.skipWhitespaceAndComments();
			if (this.isEOF()) {
				break;
			}
			const node = this.parseTopLevel();
			if (!node) {
				continue;
			}
			doc.children.push(node);
			switch (node.type) {
				case 'Import':
					doc.imports.push(node);
					break;
				case 'Export':
					doc.exports.push(node);
					break;
				case 'Struct':
					doc.structs.push(node);
					break;
				case 'Class':
					doc.classes.push(node);
					break;
				case 'Interface':
					doc.interfaces.push(node);
					break;
				case 'Function':
					doc.functions.push(node);
					break;
				default:
					break;
			}
		}

		return doc;
	}

	private tokenizeAll(): void {
		while (true) {
			const token = this.lexer.nextToken();
			this.tokens.push(token);
			if (token.type === TokenType.EOF) {
				break;
			}
		}
	}

	private createEOF(): Token {
		return { type: TokenType.EOF, value: '', start: 0, end: 0, line: 1, column: 1 };
	}

	private parseTopLevel(): TopLevelNode | null {
		const decorators = this.parseDecorators();

		if (this.isKeyword('import')) {
			return this.parseImport();
		}
		if (this.isKeyword('export')) {
			return this.parseExport(decorators);
		}
		if (this.isKeyword('struct')) {
			return this.parseStruct(decorators);
		}
		if (this.isKeyword('class') || this.isKeyword('abstract')) {
			return this.parseClass(decorators);
		}
		if (this.isKeyword('interface')) {
			return this.parseInterface();
		}
		if (this.isKeyword('function') || this.isKeyword('async')) {
			return this.parseFunction(decorators);
		}
		if (this.isKeyword('const') || this.isKeyword('let') || this.isKeyword('var')) {
			return this.parseVariableLike();
		}
		if (this.isKeyword('type')) {
			return this.parseVariableLike();
		}
		if (this.isKeyword('enum')) {
			return this.parseEnum();
		}

		// Fallback: consume one token to avoid infinite loop
		this.advance();
		return null;
	}

	private parseDecorators(): DecoratorNode[] {
		const decorators: DecoratorNode[] = [];
		while (this.current.type === TokenType.Decorator) {
			const dec = this.parseDecorator();
			if (dec) {
				decorators.push(dec);
			}
			this.skipWhitespaceAndComments();
		}
		return decorators;
	}

	private parseDecorator(): DecoratorNode | null {
		if (this.current.type !== TokenType.Decorator) {
			return null;
		}

		const name = this.current.value.slice(1);
		const start = this.current.start;
		const line = this.current.line;
		const column = this.current.column;

		this.advance();
		this.skipWhitespaceAndComments();

		let args: string | undefined;
		if (this.isPunctuator('(')) {
			args = this.consumeBalanced('(', ')');
		}

		return {
			type: 'Decorator',
			name,
			arguments: args,
			location: { start, end: this.current.start, line, column }
		};
	}

	private parseImport(): ImportNode {
		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		let raw = '';
		while (this.current.type !== TokenType.EOF) {
			raw += this.current.value;
			if (this.current.type === TokenType.Newline || this.isPunctuator(';')) {
				if (this.isPunctuator(';')) {
					this.advance();
				}
				break;
			}
			this.advance();
		}

		const trimmed = raw.trim();
		const isLazy = /^import\s+lazy\b/.test(trimmed);
		const sourceMatch = trimmed.match(/\bfrom\s+['"]([^'"]+)['"]/);
		const source = sourceMatch ? sourceMatch[1] : '';

		const defaultMatch = trimmed.match(/\bimport\s+(?:lazy\s+)?([A-Za-z_$][\w$]*)\s+from\b/);
		const defaultImport = defaultMatch ? defaultMatch[1] : undefined;

		const namedMatch = trimmed.match(/\{([^}]+)\}/);
		const namedImports = namedMatch
			? namedMatch[1].split(',').map(s => s.trim()).filter(Boolean)
			: undefined;

		const namespaceMatch = trimmed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
		const namespaceImport = namespaceMatch ? namespaceMatch[1] : undefined;

		return {
			type: 'Import',
			raw: trimmed,
			source,
			isLazy: isLazy || undefined,
			defaultImport,
			namedImports,
			namespaceImport,
			location: { start, end: this.current.start, line: startLine, column: startColumn }
		};
	}

	private parseExport(decorators: DecoratorNode[]): ExportNode {
		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		this.advance(); // export
		this.skipWhitespaceAndComments();

		const isDefault = this.isKeyword('default');
		if (isDefault) {
			this.advance();
			this.skipWhitespaceAndComments();
		}

		const moreDecorators = this.parseDecorators();
		const allDecorators = [...decorators, ...moreDecorators];

		let declaration: TopLevelNode | undefined;
		if (this.isKeyword('struct')) {
			declaration = this.parseStruct(allDecorators);
		} else if (this.isKeyword('class') || this.isKeyword('abstract')) {
			declaration = this.parseClass(allDecorators);
		} else if (this.isKeyword('interface')) {
			declaration = this.parseInterface();
		} else if (this.isKeyword('function') || this.isKeyword('async')) {
			declaration = this.parseFunction(allDecorators);
		} else if (this.isKeyword('const') || this.isKeyword('let') || this.isKeyword('var') || this.isKeyword('type')) {
			declaration = this.parseVariableLike();
		} else if (this.isKeyword('enum')) {
			declaration = this.parseEnum();
		}

		let raw = 'export';
		if (isDefault) {
			raw += ' default';
		}

		return {
			type: 'Export',
			raw,
			isDefault,
			declaration,
			location: { start, end: this.current.start, line: startLine, column: startColumn }
		};
	}

	private parseStruct(decorators: DecoratorNode[]): StructNode {
		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		this.advance(); // struct
		this.skipWhitespaceAndComments();

		let name = 'Unknown';
		if (this.current.type === TokenType.Identifier) {
			name = this.current.value;
			this.advance();
		}

		this.skipWhitespaceAndComments();

		let extendsClause: string | undefined;
		let implementsClause: string[] | undefined;

		if (this.isKeyword('extends')) {
			this.advance();
			this.skipWhitespaceAndComments();
			extendsClause = this.readUntil(['{', 'implements']).trim() || undefined;
		}

		if (this.isKeyword('implements')) {
			this.advance();
			this.skipWhitespaceAndComments();
			const implString = this.readUntil(['{']);
			const impl = implString.split(',').map(s => s.trim()).filter(Boolean);
			implementsClause = impl.length > 0 ? impl : undefined;
		}

		const members = this.parseStructMembers();
		return {
			type: 'Struct',
			name,
			decorators,
			members,
			extends: extendsClause,
			implements: implementsClause,
			location: { start, end: this.current.start, line: startLine, column: startColumn }
		};
	}

	private parseClass(decorators: DecoratorNode[]): ClassNode {
		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		let isAbstract = false;
		if (this.isKeyword('abstract')) {
			isAbstract = true;
			this.advance();
			this.skipWhitespaceAndComments();
		}

		this.advance(); // class
		this.skipWhitespaceAndComments();

		let name = 'Unknown';
		if (this.current.type === TokenType.Identifier) {
			name = this.current.value;
			this.advance();
		}

		this.skipWhitespaceAndComments();

		let extendsClause: string | undefined;
		let implementsClause: string[] | undefined;

		if (this.isKeyword('extends')) {
			this.advance();
			this.skipWhitespaceAndComments();
			extendsClause = this.readUntil(['{', 'implements']).trim() || undefined;
		}

		if (this.isKeyword('implements')) {
			this.advance();
			this.skipWhitespaceAndComments();
			const implString = this.readUntil(['{']);
			const impl = implString.split(',').map(s => s.trim()).filter(Boolean);
			implementsClause = impl.length > 0 ? impl : undefined;
		}

		const members = this.parseClassMembers();
		return {
			type: 'Class',
			name,
			decorators,
			members,
			extends: extendsClause,
			implements: implementsClause,
			isAbstract: isAbstract || undefined,
			location: { start, end: this.current.start, line: startLine, column: startColumn }
		};
	}

	private parseInterface(): InterfaceNode {
		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		this.advance(); // interface
		this.skipWhitespaceAndComments();

		let name = 'Unknown';
		if (this.current.type === TokenType.Identifier) {
			name = this.current.value;
			this.advance();
		}

		this.skipWhitespaceAndComments();

		// Generic params
		if (this.isOperator('<')) {
			this.consumeBalanced('<', '>');
			this.skipWhitespaceAndComments();
		}

		let extendsClause: string[] | undefined;
		if (this.isKeyword('extends')) {
			this.advance();
			this.skipWhitespaceAndComments();
			const extString = this.readUntil(['{']);
			const ext = extString.split(',').map(s => s.trim()).filter(Boolean);
			extendsClause = ext.length > 0 ? ext : undefined;
		}

		// For now, we don't parse interface members precisely.
		const members: MemberNode[] = [];
		if (this.isPunctuator('{')) {
			this.consumeBalanced('{', '}');
		}

		return {
			type: 'Interface',
			name,
			members,
			extends: extendsClause,
			location: { start, end: this.current.start, line: startLine, column: startColumn }
		};
	}

	private parseFunction(decorators: DecoratorNode[]): FunctionNode {
		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		let isAsync = false;
		let isGenerator = false;

		if (this.isKeyword('async')) {
			isAsync = true;
			this.advance();
			this.skipWhitespaceAndComments();
		}

		this.advance(); // function
		this.skipWhitespaceAndComments();

		if (this.isOperator('*')) {
			isGenerator = true;
			this.advance();
			this.skipWhitespaceAndComments();
		}

		let name = '';
		if (this.current.type === TokenType.Identifier) {
			name = this.current.value;
			this.advance();
		}

		this.skipWhitespaceAndComments();

		if (this.isOperator('<')) {
			this.consumeBalanced('<', '>');
			this.skipWhitespaceAndComments();
		}

		const parameters = this.parseParameters();

		let returnType: string | undefined;
		this.skipWhitespaceAndComments();
		if (this.isOperator(':')) {
			this.advance();
			this.skipWhitespaceAndComments();
			returnType = this.readTypeAnnotation();
		}

		let body: string | undefined;
		this.skipWhitespaceAndComments();
		if (this.isPunctuator('{')) {
			body = this.consumeBalanced('{', '}');
		}

		return {
			type: 'Function',
			name,
			decorators,
			parameters,
			returnType,
			body,
			isAsync: isAsync || undefined,
			isGenerator: isGenerator || undefined,
			location: { start, end: this.current.start, line: startLine, column: startColumn }
		};
	}

	private parseEnum(): ExpressionNode {
		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		let raw = '';
		while (this.current.type !== TokenType.EOF) {
			if (this.isPunctuator('{')) {
				raw += this.consumeBalanced('{', '}');
				break;
			}
			raw += this.current.value;
			this.advance();
		}
		return {
			type: 'Expression',
			raw: raw.trim(),
			location: { start, end: this.current.start, line: startLine, column: startColumn }
		};
	}

	private parseVariableLike(): ExpressionNode {
		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		let raw = '';
		while (this.current.type !== TokenType.EOF) {
			if (this.isPunctuator(';') || this.current.type === TokenType.Newline) {
				raw += this.current.value;
				this.advance();
				break;
			}
			if (this.isPunctuator('{')) {
				raw += this.consumeBalanced('{', '}');
				continue;
			}
			if (this.isPunctuator('(')) {
				raw += this.consumeBalanced('(', ')');
				continue;
			}
			if (this.isPunctuator('[')) {
				raw += this.consumeBalanced('[', ']');
				continue;
			}
			if (this.isOperator('<')) {
				raw += this.consumeBalanced('<', '>');
				continue;
			}
			raw += this.current.value;
			this.advance();
		}

		return {
			type: 'Expression',
			raw: raw.trim(),
			location: { start, end: this.current.start, line: startLine, column: startColumn }
		};
	}

	private parseStructMembers(): MemberNode[] {
		const members: MemberNode[] = [];
		if (!this.isPunctuator('{')) {
			return members;
		}
		this.advance();
		while (this.current.type !== TokenType.EOF && !this.isPunctuator('}')) {
			this.skipWhitespaceAndComments();
			if (this.isPunctuator('}')) {
				break;
			}
			const decorators = this.parseDecorators();
			const member = this.parseMember(decorators);
			if (member) {
				members.push(member);
			}
		}
		if (this.isPunctuator('}')) {
			this.advance();
		}
		return members;
	}

	private parseClassMembers(): MemberNode[] {
		const members: MemberNode[] = [];
		if (!this.isPunctuator('{')) {
			return members;
		}
		this.advance();
		while (this.current.type !== TokenType.EOF && !this.isPunctuator('}')) {
			this.skipWhitespaceAndComments();
			if (this.isPunctuator('}')) {
				break;
			}
			const decorators = this.parseDecorators();
			const member = this.parseMember(decorators);
			if (member && member.type !== 'BuildMethod') {
				members.push(member);
			}
		}
		if (this.isPunctuator('}')) {
			this.advance();
		}
		return members;
	}

	private parseMember(decorators: DecoratorNode[]): MemberNode | null {
		this.skipWhitespaceAndComments();

		let visibility: 'public' | 'private' | 'protected' | undefined;
		let isStatic = false;
		let isReadonly = false;
		let isAsync = false;
		let isAbstract = false;

		while (true) {
			if (this.isKeyword('public')) {
				visibility = 'public';
				this.advance();
				this.skipWhitespaceAndComments();
			} else if (this.isKeyword('private')) {
				visibility = 'private';
				this.advance();
				this.skipWhitespaceAndComments();
			} else if (this.isKeyword('protected')) {
				visibility = 'protected';
				this.advance();
				this.skipWhitespaceAndComments();
			} else if (this.isKeyword('static')) {
				isStatic = true;
				this.advance();
				this.skipWhitespaceAndComments();
			} else if (this.isKeyword('readonly')) {
				isReadonly = true;
				this.advance();
				this.skipWhitespaceAndComments();
			} else if (this.isKeyword('async')) {
				isAsync = true;
				this.advance();
				this.skipWhitespaceAndComments();
			} else if (this.isKeyword('abstract')) {
				isAbstract = true;
				this.advance();
				this.skipWhitespaceAndComments();
			} else {
				break;
			}
		}

		// Detect build() { ... }
		if ((this.current.type === TokenType.Identifier || this.current.type === TokenType.Keyword) && this.current.value === 'build') {
			const pos = this.savePosition();
			this.advance();
			this.skipWhitespaceAndComments();
			if (this.isPunctuator('(')) {
				this.advance();
				this.skipWhitespaceAndComments();
				if (this.isPunctuator(')')) {
					this.advance();
					this.skipWhitespaceAndComments();
					if (this.isPunctuator('{')) {
						return this.parseBuildMethod(decorators);
					}
				}
			}
			this.restorePosition(pos);
		}

		if (this.current.type !== TokenType.Identifier && this.current.type !== TokenType.Keyword) {
			this.advance();
			return null;
		}

		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		const name = this.current.value;
		this.advance();
		this.skipWhitespaceAndComments();

		const isOptional = this.isOperator('?');
		if (isOptional) {
			this.advance();
			this.skipWhitespaceAndComments();
		}

		if (this.isPunctuator('(') || this.isOperator('<')) {
			return this.parseMethod(
				name,
				decorators,
				visibility,
				isStatic,
				isAsync,
				isAbstract,
				{ start, line: startLine, column: startColumn }
			);
		}

		return this.parseProperty(
			name,
			decorators,
			visibility,
			isStatic,
			isReadonly,
			isOptional,
			{ start, line: startLine, column: startColumn }
		);
	}

	private parseBuildMethod(decorators: DecoratorNode[]): BuildMethodMember {
		const start = this.current.start;
		const startLine = this.current.line;
		const startColumn = this.current.column;

		if (!this.isPunctuator('{')) {
			return {
				type: 'BuildMethod',
				decorators,
				body: [],
				rawBody: '',
				location: { start, end: this.current.start, line: startLine, column: startColumn }
			};
		}

		const rawBodyWithBraces = this.consumeBalanced('{', '}');
		const bodyContent = rawBodyWithBraces.slice(1, -1);
		const uiComponents = this.parseUIComponents(bodyContent);

		return {
			type: 'BuildMethod',
			decorators,
			body: uiComponents,
			rawBody: bodyContent,
			location: { start, end: this.current.start, line: startLine, column: startColumn }
		};
	}

	private parseMethod(
		name: string,
		decorators: DecoratorNode[],
		visibility: 'public' | 'private' | 'protected' | undefined,
		isStatic: boolean,
		isAsync: boolean,
		isAbstract: boolean,
		startInfo: { start: number; line: number; column: number }
	): MethodMember {
		let typeParams = '';
		if (this.isOperator('<')) {
			typeParams = this.consumeBalanced('<', '>');
		}
		void typeParams;

		const parameters = this.parseParameters();

		let returnType: string | undefined;
		this.skipWhitespaceAndComments();
		if (this.isOperator(':')) {
			this.advance();
			this.skipWhitespaceAndComments();
			returnType = this.readTypeAnnotation();
		}

		let body: string | undefined;
		this.skipWhitespaceAndComments();
		if (this.isPunctuator('{')) {
			body = this.consumeBalanced('{', '}');
		}

		return {
			type: 'Method',
			name,
			decorators,
			parameters,
			returnType,
			body,
			visibility,
			isStatic: isStatic || undefined,
			isAsync: isAsync || undefined,
			isAbstract: isAbstract || undefined,
			location: { start: startInfo.start, end: this.current.start, line: startInfo.line, column: startInfo.column }
		};
	}

	private parseProperty(
		name: string,
		decorators: DecoratorNode[],
		visibility: 'public' | 'private' | 'protected' | undefined,
		isStatic: boolean,
		isReadonly: boolean,
		isOptional: boolean,
		startInfo: { start: number; line: number; column: number }
	): PropertyMember {
		let propertyType: string | undefined;
		if (this.isOperator(':')) {
			this.advance();
			this.skipWhitespaceAndComments();
			propertyType = this.readTypeAnnotation();
		}

		let initializer: string | undefined;
		this.skipWhitespaceAndComments();
		if (this.isOperator('=')) {
			this.advance();
			this.skipWhitespaceAndComments();
			initializer = this.readExpression();
		}

		this.skipWhitespaceAndComments();
		if (this.isPunctuator(';') || this.current.type === TokenType.Newline) {
			this.advance();
		}

		return {
			type: 'Property',
			name,
			decorators,
			propertyType,
			initializer,
			visibility,
			isStatic: isStatic || undefined,
			isReadonly: isReadonly || undefined,
			isOptional: isOptional || undefined,
			location: { start: startInfo.start, end: this.current.start, line: startInfo.line, column: startInfo.column }
		};
	}

	private parseParameters(): ParameterNode[] {
		const params: ParameterNode[] = [];
		if (!this.isPunctuator('(')) {
			return params;
		}

		this.advance();
		while (this.current.type !== TokenType.EOF && !this.isPunctuator(')')) {
			this.skipWhitespaceAndComments();
			if (this.isPunctuator(')')) {
				break;
			}
			const param = this.parseParameter();
			if (param) {
				params.push(param);
			}
			this.skipWhitespaceAndComments();
			if (this.isPunctuator(',')) {
				this.advance();
			}
		}

		if (this.isPunctuator(')')) {
			this.advance();
		}
		return params;
	}

	private parseParameter(): ParameterNode | null {
		const decorators = this.parseDecorators();
		this.skipWhitespaceAndComments();

		const isRest = this.isPunctuator('...');
		if (isRest) {
			this.advance();
			this.skipWhitespaceAndComments();
		}

		if (this.current.type !== TokenType.Identifier) {
			return null;
		}

		const name = this.current.value;
		this.advance();
		this.skipWhitespaceAndComments();

		const isOptional = this.isOperator('?');
		if (isOptional) {
			this.advance();
			this.skipWhitespaceAndComments();
		}

		let parameterType: string | undefined;
		if (this.isOperator(':')) {
			this.advance();
			this.skipWhitespaceAndComments();
			parameterType = this.readTypeAnnotation();
		}

		let defaultValue: string | undefined;
		this.skipWhitespaceAndComments();
		if (this.isOperator('=')) {
			this.advance();
			this.skipWhitespaceAndComments();
			defaultValue = this.readExpression();
		}

		return {
			type: 'Parameter',
			name,
			parameterType,
			defaultValue,
			isOptional: isOptional || undefined,
			isRest: isRest || undefined,
			decorators
		};
	}

	private parseUIComponents(content: string): UIComponent[] {
		const parser = new UIComponentParser(content);
		return parser.parse();
	}

	private consumeBalanced(open: string, close: string): string {
		// Uses token stream to find the matching delimiter but slices from the original source.
		if (!this.isValue(open)) {
			return '';
		}

		const openToken = this.current;
		let depth = 0;
		while (this.current.type !== TokenType.EOF) {
			if (this.isValue(open)) {
				depth++;
			} else if (this.isValue(close)) {
				depth--;
				if (depth === 0) {
					const closeToken = this.current;
					this.advance();
					return this.sourceText.slice(openToken.start, closeToken.end);
				}
			}
			this.advance();
		}

		// Unterminated; best-effort slice to EOF
		return this.sourceText.slice(openToken.start);
	}

	private readUntil(stop: string[]): string {
		const stopSet = new Set(stop);
		let result = '';
		while (this.current.type !== TokenType.EOF) {
			if (this.isPunctuator('{')) {
				break;
			}
			if (stopSet.has(this.current.value)) {
				break;
			}
			if (this.current.type === TokenType.Keyword && stopSet.has(this.current.value)) {
				break;
			}
			result += this.current.value;
			this.advance();
		}
		return result;
	}

	private readTypeAnnotation(): string {
		let type = '';
		let depth = 0;

		while (this.current.type !== TokenType.EOF) {
			if (this.isValue('{') || this.isValue('(') || this.isValue('[') || this.isValue('<')) {
				depth++;
			}
			if (this.isValue('}') || this.isValue(')') || this.isValue(']') || this.isValue('>')) {
				depth--;
			}

			if (depth < 0) {
				break;
			}

			if (depth === 0) {
				// Stop before initializer, end-of-decl, or method body
				if (this.isValue('=') || this.isValue(',') || this.isValue(';') || this.isValue('{') || this.isValue(')')) {
					break;
				}
				if (this.current.type === TokenType.Newline) {
					break;
				}
			}

			type += this.current.value;
			this.advance();
		}

		return type.trim();
	}

	private readExpression(): string {
		let expr = '';
		let depth = 0;

		while (this.current.type !== TokenType.EOF) {
			if (this.isValue('{') || this.isValue('(') || this.isValue('[')) {
				depth++;
			}
			if (this.isValue('}') || this.isValue(')') || this.isValue(']')) {
				if (depth === 0) {
					break;
				}
				depth--;
			}

			if (depth === 0) {
				if (this.isValue(',') || this.isValue(';')) {
					break;
				}
				if (this.current.type === TokenType.Newline) {
					break;
				}
			}

			expr += this.current.value;
			this.advance();
		}

		return expr.trim();
	}

	private skipWhitespaceAndComments(): void {
		while (
			this.current.type === TokenType.Whitespace ||
			this.current.type === TokenType.Newline ||
			this.current.type === TokenType.Comment ||
			this.current.type === TokenType.BlockComment ||
			this.current.type === TokenType.DocComment
		) {
			this.advance();
		}
	}

	private isPunctuator(value: string): boolean {
		return this.current.type === TokenType.Punctuator && this.current.value === value;
	}

	private isOperator(value: string): boolean {
		return this.current.type === TokenType.Operator && this.current.value === value;
	}

	private isKeyword(value: string): boolean {
		return this.current.type === TokenType.Keyword && this.current.value === value;
	}

	private isValue(value: string): boolean {
		return this.current.value === value;
	}

	private isEOF(): boolean {
		return this.current.type === TokenType.EOF;
	}

	private advance(): Token {
		const token = this.current;
		this.tokenIndex++;
		this.current = this.tokens[this.tokenIndex] ?? this.createEOF();
		return token;
	}

	private savePosition(): number {
		return this.tokenIndex;
	}

	private restorePosition(pos: number): void {
		this.tokenIndex = pos;
		this.current = this.tokens[this.tokenIndex] ?? this.createEOF();
	}

	private reportError(message: string): void {
		this.errors.push({
			message,
			line: this.current.line,
			column: this.current.column,
			start: this.current.start,
			end: this.current.end
		});
	}
}

class UIComponentParser {
	private readonly content: string;
	private index = 0;

	constructor(content: string) {
		this.content = content;
	}

	parse(): UIComponent[] {
		const components: UIComponent[] = [];
		while (this.index < this.content.length) {
			this.skipWhitespace();
			if (this.index >= this.content.length) {
				break;
			}
			const component = this.parseComponent();
			if (component) {
				components.push(component);
			} else {
				this.index++;
			}
		}
		return components;
	}

	private parseComponent(): UIComponent | null {
		this.skipWhitespace();

		const nameMatch = this.content.slice(this.index).match(/^([A-Z][a-zA-Z0-9_]*)\s*\(/);
		if (!nameMatch) {
			const ifMatch = this.content.slice(this.index).match(/^if\s*\(/);
			if (ifMatch) {
				return this.parseIfComponent();
			}
			const forEachMatch = this.content.slice(this.index).match(/^ForEach\s*\(/);
			if (forEachMatch) {
				return this.parseForEachComponent();
			}
			const lazyForEachMatch = this.content.slice(this.index).match(/^LazyForEach\s*\(/);
			if (lazyForEachMatch) {
				return this.parseForEachComponent('LazyForEach');
			}
			return null;
		}

		const name = nameMatch[1];
		this.index += name.length;
		this.skipWhitespace();

		let args = '';
		if (this.peek() === '(') {
			args = this.consumeBalanced('(', ')');
		}

		const attributes = this.parseAttributes();
		const children = this.parseChildren();

		return {
			type: 'UIComponent',
			name,
			arguments: args,
			attributes,
			children,
			isConditional: false,
			isLoop: false
		};
	}

	private parseIfComponent(): UIComponent {
		this.index += 2; // if
		this.skipWhitespace();

		let condition = '';
		if (this.peek() === '(') {
			condition = this.consumeBalanced('(', ')');
		}

		this.skipWhitespace();
		let children: UIComponent[] = [];
		if (this.peek() === '{') {
			const body = this.consumeBalanced('{', '}');
			const parser = new UIComponentParser(body.slice(1, -1));
			children = parser.parse();
		}

		return {
			type: 'UIComponent',
			name: 'If',
			attributes: [],
			children,
			isConditional: true,
			condition,
			isLoop: false
		};
	}

	private parseForEachComponent(name: 'ForEach' | 'LazyForEach' = 'ForEach'): UIComponent {
		this.index += name.length;
		this.skipWhitespace();
		let loopExpression = '';
		if (this.peek() === '(') {
			loopExpression = this.consumeBalanced('(', ')');
		}
		return {
			type: 'UIComponent',
			name,
			arguments: loopExpression,
			attributes: [],
			children: [],
			isConditional: false,
			isLoop: true,
			loopExpression
		};
	}

	private parseAttributes(): UIAttribute[] {
		const attributes: UIAttribute[] = [];
		while (this.index < this.content.length) {
			this.skipWhitespace();
			if (this.peek() !== '.') {
				break;
			}
			this.index++;
			const attrMatch = this.content.slice(this.index).match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
			if (!attrMatch) {
				break;
			}
			const attrName = attrMatch[1];
			this.index += attrName.length;
			this.skipWhitespace();
			let attrArgs = '';
			if (this.peek() === '(') {
				attrArgs = this.consumeBalanced('(', ')');
			}
			attributes.push({
				type: 'UIAttribute',
				name: attrName,
				arguments: attrArgs
			});
		}
		return attributes;
	}

	private parseChildren(): UIComponent[] {
		this.skipWhitespace();
		if (this.peek() !== '{') {
			return [];
		}
		const body = this.consumeBalanced('{', '}');
		const parser = new UIComponentParser(body.slice(1, -1));
		return parser.parse();
	}

	private skipWhitespace(): void {
		while (this.index < this.content.length) {
			const ch = this.content[this.index];
			if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
				this.index++;
				continue;
			}
			if (this.content.slice(this.index, this.index + 2) === '//') {
				while (this.index < this.content.length && this.content[this.index] !== '\n') {
					this.index++;
				}
				continue;
			}
			if (this.content.slice(this.index, this.index + 2) === '/*') {
				this.index += 2;
				while (this.index < this.content.length && this.content.slice(this.index, this.index + 2) !== '*/') {
					this.index++;
				}
				if (this.content.slice(this.index, this.index + 2) === '*/') {
					this.index += 2;
				}
				continue;
			}
			break;
		}
	}

	private peek(): string {
		return this.content[this.index] ?? '';
	}

	private consumeBalanced(open: string, close: string): string {
		let result = '';
		let depth = 0;
		if (this.peek() !== open) {
			return result;
		}

		result += this.content[this.index];
		depth = 1;
		this.index++;

		while (this.index < this.content.length && depth > 0) {
			const ch = this.content[this.index];
			if (ch === '"' || ch === "'" || ch === '`') {
				result += this.consumeString(ch);
				continue;
			}
			if (ch === open) {
				depth++;
			} else if (ch === close) {
				depth--;
			}
			result += ch;
			this.index++;
		}

		return result;
	}

	private consumeString(quote: string): string {
		let result = this.content[this.index];
		this.index++;

		if (quote === '`') {
			let braceDepth = 0;
			while (this.index < this.content.length) {
				const ch = this.content[this.index];
				result += ch;
				this.index++;

				if (ch === '\\') {
					if (this.index < this.content.length) {
						result += this.content[this.index];
						this.index++;
					}
					continue;
				}

				if (ch === '$' && this.peek() === '{') {
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
				if (ch === '`' && braceDepth === 0) {
					break;
				}
			}
		} else {
			while (this.index < this.content.length) {
				const ch = this.content[this.index];
				result += ch;
				this.index++;
				if (ch === '\\') {
					if (this.index < this.content.length) {
						result += this.content[this.index];
						this.index++;
					}
					continue;
				}
				if (ch === quote) {
					break;
				}
			}
		}

		return result;
	}
}

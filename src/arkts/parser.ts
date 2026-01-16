import {
    ArkTSDocument,
    ArkTSImport,
    ArkTSExport,
    ArkTSDecorator,
    ArkTSStruct,
    ArkTSClass,
    ArkTSInterface,
    ArkTSFunction,
    ArkTSMethod,
    ArkTSProperty,
    ArkTSParameter,
    ArkTSBuildMethod,
    ArkTSUIComponent,
    ArkTSUIAttribute,
    ArkTSComment,
    ArkTSNode,
    ARKTS_DECORATORS,
    ARKTS_UI_COMPONENTS
} from './ast';
import { ArkTSLexer, Token, TokenType } from './lexer';

export interface ParseError {
    message: string;
    line: number;
    column: number;
    start: number;
    end: number;
}

export class ArkTSParser {
    private lexer: ArkTSLexer;
    private current: Token;
    private tokens: Token[] = [];
    private tokenIndex = 0;
    public readonly errors: ParseError[] = [];

    constructor(text: string) {
        this.lexer = new ArkTSLexer(text);
        this.tokenizeAll();
        this.current = this.tokens[0] ?? this.createEOF();
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
            if (node) {
                doc.children.push(node);
                if (node.type === 'Import') {
                    doc.imports.push(node as ArkTSImport);
                } else if (node.type === 'Export') {
                    doc.exports.push(node as ArkTSExport);
                } else if (node.type === 'Struct') {
                    doc.structs.push(node as ArkTSStruct);
                } else if (node.type === 'Class') {
                    doc.classes.push(node as ArkTSClass);
                } else if (node.type === 'Interface') {
                    doc.interfaces.push(node as ArkTSInterface);
                } else if (node.type === 'Function') {
                    doc.functions.push(node as ArkTSFunction);
                }
            }
        }

        return doc;
    }

    private parseTopLevel(): ArkTSNode | null {
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
            return this.parseVariableDeclaration();
        }

        if (this.isKeyword('type')) {
            return this.parseTypeAlias();
        }

        if (this.isKeyword('enum')) {
            return this.parseEnum();
        }

        this.advance();
        return null;
    }

    private parseDecorators(): ArkTSDecorator[] {
        const decorators: ArkTSDecorator[] = [];
        while (this.current.type === TokenType.Decorator) {
            const decorator = this.parseDecorator();
            if (decorator) {
                decorators.push(decorator);
            }
            this.skipWhitespaceAndComments();
        }
        return decorators;
    }

    private parseDecorator(): ArkTSDecorator | null {
        if (this.current.type !== TokenType.Decorator) {
            return null;
        }

        const name = this.current.value.slice(1);
        const start = this.current.start;
        this.advance();
        this.skipWhitespace();

        let args: string | undefined;
        if (this.isPunctuator('(')) {
            args = this.consumeBalanced('(', ')');
        }

        return {
            type: 'Decorator',
            name,
            arguments: args,
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseImport(): ArkTSImport {
        const start = this.current.start;
        const startLine = this.current.line;
        let raw = '';

        while (this.current.type !== TokenType.EOF) {
            raw += this.current.value;
            if (this.current.type === TokenType.Newline || (this.isPunctuator(';'))) {
                if (this.isPunctuator(';')) {
                    this.advance();
                }
                break;
            }
            this.advance();
        }

        const sourceMatch = raw.match(/from\s+['"]([^'"]+)['"]/);
        const source = sourceMatch ? sourceMatch[1] : '';

        const defaultMatch = raw.match(/import\s+(\w+)\s+from/);
        const defaultImport = defaultMatch ? defaultMatch[1] : undefined;

        const namedMatch = raw.match(/\{([^}]+)\}/);
        const namedImports = namedMatch
            ? namedMatch[1].split(',').map(s => s.trim()).filter(s => s)
            : undefined;

        const namespaceMatch = raw.match(/\*\s+as\s+(\w+)/);
        const namespaceImport = namespaceMatch ? namespaceMatch[1] : undefined;

        return {
            type: 'Import',
            raw: raw.trim(),
            source,
            defaultImport,
            namedImports,
            namespaceImport,
            location: { start, end: this.current.start, line: startLine, column: 1 }
        };
    }

    private parseExport(decorators: ArkTSDecorator[]): ArkTSExport {
        const start = this.current.start;
        this.advance();
        this.skipWhitespace();

        const isDefault = this.isKeyword('default');
        if (isDefault) {
            this.advance();
            this.skipWhitespace();
        }

        let declaration: ArkTSNode | undefined;
        const moreDecorators = this.parseDecorators();
        const allDecorators = [...decorators, ...moreDecorators];

        if (this.isKeyword('struct')) {
            declaration = this.parseStruct(allDecorators);
        } else if (this.isKeyword('class') || this.isKeyword('abstract')) {
            declaration = this.parseClass(allDecorators);
        } else if (this.isKeyword('interface')) {
            declaration = this.parseInterface();
        } else if (this.isKeyword('function') || this.isKeyword('async')) {
            declaration = this.parseFunction(allDecorators);
        } else if (this.isKeyword('const') || this.isKeyword('let') || this.isKeyword('var')) {
            declaration = this.parseVariableDeclaration();
        } else if (this.isKeyword('type')) {
            declaration = this.parseTypeAlias();
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
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseStruct(decorators: ArkTSDecorator[]): ArkTSStruct {
        const start = this.current.start;
        this.advance();
        this.skipWhitespace();

        let name = 'Unknown';
        if (this.current.type === TokenType.Identifier) {
            name = this.current.value;
            this.advance();
        }

        this.skipWhitespace();

        let extendsClause: string | undefined;
        let implementsClause: string[] | undefined;

        if (this.isKeyword('extends')) {
            this.advance();
            this.skipWhitespace();
            extendsClause = this.readUntil(['{', 'implements']);
        }

        if (this.isKeyword('implements')) {
            this.advance();
            this.skipWhitespace();
            const implString = this.readUntil(['{']);
            implementsClause = implString.split(',').map(s => s.trim()).filter(s => s);
        }

        const members = this.parseStructMembers();

        return {
            type: 'Struct',
            name,
            decorators,
            members,
            extends: extendsClause?.trim(),
            implements: implementsClause,
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseStructMembers(): (ArkTSProperty | ArkTSMethod | ArkTSBuildMethod)[] {
        const members: (ArkTSProperty | ArkTSMethod | ArkTSBuildMethod)[] = [];

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

    private parseMember(decorators: ArkTSDecorator[]): ArkTSProperty | ArkTSMethod | ArkTSBuildMethod | null {
        this.skipWhitespace();

        let visibility: 'public' | 'private' | 'protected' | undefined;
        let isStatic = false;
        let isReadonly = false;
        let isAsync = false;
        let isAbstract = false;

        while (true) {
            if (this.isKeyword('public')) {
                visibility = 'public';
                this.advance();
                this.skipWhitespace();
            } else if (this.isKeyword('private')) {
                visibility = 'private';
                this.advance();
                this.skipWhitespace();
            } else if (this.isKeyword('protected')) {
                visibility = 'protected';
                this.advance();
                this.skipWhitespace();
            } else if (this.isKeyword('static')) {
                isStatic = true;
                this.advance();
                this.skipWhitespace();
            } else if (this.isKeyword('readonly')) {
                isReadonly = true;
                this.advance();
                this.skipWhitespace();
            } else if (this.isKeyword('async')) {
                isAsync = true;
                this.advance();
                this.skipWhitespace();
            } else if (this.isKeyword('abstract')) {
                isAbstract = true;
                this.advance();
                this.skipWhitespace();
            } else {
                break;
            }
        }

        if (this.current.type === TokenType.Identifier && this.current.value === 'build') {
            const pos = this.savePosition();
            this.advance();
            this.skipWhitespace();
            if (this.isPunctuator('(')) {
                this.advance();
                this.skipWhitespace();
                if (this.isPunctuator(')')) {
                    this.advance();
                    this.skipWhitespace();
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

        const name = this.current.value;
        this.advance();
        this.skipWhitespace();

        const isOptional = this.isOperator('?');
        if (isOptional) {
            this.advance();
            this.skipWhitespace();
        }

        if (this.isPunctuator('(') || this.isOperator('<')) {
            return this.parseMethod(name, decorators, visibility, isStatic, isAsync, isAbstract);
        }

        return this.parseProperty(name, decorators, visibility, isStatic, isReadonly, isOptional);
    }

    private parseBuildMethod(decorators: ArkTSDecorator[]): ArkTSBuildMethod {
        const start = this.current.start;

        if (!this.isPunctuator('{')) {
            return {
                type: 'BuildMethod',
                decorators,
                body: [],
                rawBody: '',
                location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
            };
        }

        const rawBody = this.consumeBalanced('{', '}');
        const bodyContent = rawBody.slice(1, -1);
        const uiComponents = this.parseUIComponents(bodyContent);

        return {
            type: 'BuildMethod',
            decorators,
            body: uiComponents,
            rawBody: bodyContent,
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseUIComponents(content: string): ArkTSUIComponent[] {
        const components: ArkTSUIComponent[] = [];
        const parser = new UIComponentParser(content);
        return parser.parse();
    }

    private parseMethod(
        name: string,
        decorators: ArkTSDecorator[],
        visibility: 'public' | 'private' | 'protected' | undefined,
        isStatic: boolean,
        isAsync: boolean,
        isAbstract: boolean
    ): ArkTSMethod {
        const start = this.current.start;
        let typeParams = '';
        if (this.isOperator('<')) {
            typeParams = this.consumeBalanced('<', '>');
        }

        const parameters = this.parseParameters();

        let returnType: string | undefined;
        this.skipWhitespace();
        if (this.isOperator(':')) {
            this.advance();
            this.skipWhitespace();
            returnType = this.readTypeAnnotation();
        }

        let body: string | undefined;
        this.skipWhitespace();
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
            isStatic,
            isAsync,
            isAbstract,
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseProperty(
        name: string,
        decorators: ArkTSDecorator[],
        visibility: 'public' | 'private' | 'protected' | undefined,
        isStatic: boolean,
        isReadonly: boolean,
        isOptional: boolean
    ): ArkTSProperty {
        const start = this.current.start;

        let propertyType: string | undefined;
        if (this.isOperator(':')) {
            this.advance();
            this.skipWhitespace();
            propertyType = this.readTypeAnnotation();
        }

        let initializer: string | undefined;
        this.skipWhitespace();
        if (this.isOperator('=')) {
            this.advance();
            this.skipWhitespace();
            initializer = this.readExpression();
        }

        this.skipWhitespace();
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
            isStatic,
            isReadonly,
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseParameters(): ArkTSParameter[] {
        const params: ArkTSParameter[] = [];

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

            this.skipWhitespace();
            if (this.isPunctuator(',')) {
                this.advance();
            }
        }

        if (this.isPunctuator(')')) {
            this.advance();
        }

        return params;
    }

    private parseParameter(): ArkTSParameter | null {
        const decorators = this.parseDecorators();
        this.skipWhitespace();

        const isRest = this.isPunctuator('...');
        if (isRest) {
            this.advance();
            this.skipWhitespace();
        }

        if (this.current.type !== TokenType.Identifier) {
            return null;
        }

        const name = this.current.value;
        this.advance();
        this.skipWhitespace();

        const isOptional = this.isOperator('?');
        if (isOptional) {
            this.advance();
            this.skipWhitespace();
        }

        let parameterType: string | undefined;
        if (this.isOperator(':')) {
            this.advance();
            this.skipWhitespace();
            parameterType = this.readTypeAnnotation();
        }

        let defaultValue: string | undefined;
        this.skipWhitespace();
        if (this.isOperator('=')) {
            this.advance();
            this.skipWhitespace();
            defaultValue = this.readExpression();
        }

        return {
            type: 'Parameter',
            name,
            parameterType,
            defaultValue,
            isOptional,
            isRest,
            decorators
        };
    }

    private parseClass(decorators: ArkTSDecorator[]): ArkTSClass {
        const start = this.current.start;
        let isAbstract = false;

        if (this.isKeyword('abstract')) {
            isAbstract = true;
            this.advance();
            this.skipWhitespace();
        }

        this.advance();
        this.skipWhitespace();

        let name = 'Unknown';
        if (this.current.type === TokenType.Identifier) {
            name = this.current.value;
            this.advance();
        }

        this.skipWhitespace();

        let extendsClause: string | undefined;
        let implementsClause: string[] | undefined;

        if (this.isKeyword('extends')) {
            this.advance();
            this.skipWhitespace();
            extendsClause = this.readUntil(['{', 'implements']).trim();
        }

        if (this.isKeyword('implements')) {
            this.advance();
            this.skipWhitespace();
            const implString = this.readUntil(['{']);
            implementsClause = implString.split(',').map(s => s.trim()).filter(s => s);
        }

        const members = this.parseClassMembers();

        return {
            type: 'Class',
            name,
            decorators,
            members,
            extends: extendsClause,
            implements: implementsClause,
            isAbstract,
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseClassMembers(): (ArkTSProperty | ArkTSMethod)[] {
        const members: (ArkTSProperty | ArkTSMethod)[] = [];

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
                members.push(member as ArkTSProperty | ArkTSMethod);
            }
        }

        if (this.isPunctuator('}')) {
            this.advance();
        }

        return members;
    }

    private parseInterface(): ArkTSInterface {
        const start = this.current.start;
        this.advance();
        this.skipWhitespace();

        let name = 'Unknown';
        if (this.current.type === TokenType.Identifier) {
            name = this.current.value;
            this.advance();
        }

        this.skipWhitespace();

        if (this.isOperator('<')) {
            this.consumeBalanced('<', '>');
            this.skipWhitespace();
        }

        let extendsClause: string[] | undefined;
        if (this.isKeyword('extends')) {
            this.advance();
            this.skipWhitespace();
            const extString = this.readUntil(['{']);
            extendsClause = extString.split(',').map(s => s.trim()).filter(s => s);
        }

        const members: (ArkTSProperty | ArkTSMethod)[] = [];
        if (this.isPunctuator('{')) {
            this.consumeBalanced('{', '}');
        }

        return {
            type: 'Interface',
            name,
            members,
            extends: extendsClause,
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseFunction(decorators: ArkTSDecorator[]): ArkTSFunction {
        const start = this.current.start;
        let isAsync = false;
        let isGenerator = false;

        if (this.isKeyword('async')) {
            isAsync = true;
            this.advance();
            this.skipWhitespace();
        }

        this.advance();
        this.skipWhitespace();

        if (this.isOperator('*')) {
            isGenerator = true;
            this.advance();
            this.skipWhitespace();
        }

        let name = '';
        if (this.current.type === TokenType.Identifier) {
            name = this.current.value;
            this.advance();
        }

        this.skipWhitespace();

        if (this.isOperator('<')) {
            this.consumeBalanced('<', '>');
            this.skipWhitespace();
        }

        const parameters = this.parseParameters();

        let returnType: string | undefined;
        this.skipWhitespace();
        if (this.isOperator(':')) {
            this.advance();
            this.skipWhitespace();
            returnType = this.readTypeAnnotation();
        }

        let body: string | undefined;
        this.skipWhitespace();
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
            isAsync,
            isGenerator,
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseVariableDeclaration(): ArkTSNode {
        const start = this.current.start;
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
            raw += this.current.value;
            this.advance();
        }

        return {
            type: 'Expression',
            raw: raw.trim(),
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseTypeAlias(): ArkTSNode {
        const start = this.current.start;
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
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private parseEnum(): ArkTSNode {
        const start = this.current.start;
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
            location: { start, end: this.current.start, line: this.current.line, column: this.current.column }
        };
    }

    private readTypeAnnotation(): string {
        let type = '';
        let depth = 0;

        while (this.current.type !== TokenType.EOF) {
            if (this.isPunctuator('{') || this.isPunctuator('(') || this.isPunctuator('[') || this.isOperator('<')) {
                depth++;
            }
            if (this.isPunctuator('}') || this.isPunctuator(')') || this.isPunctuator(']') || this.isOperator('>')) {
                depth--;
            }

            if (depth < 0) {
                break;
            }
            if (depth === 0) {
                if (this.isPunctuator('=') || this.isPunctuator(',') || this.isPunctuator(';') || this.isPunctuator('{') || this.isPunctuator(')')) {
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
            if (this.isPunctuator('{') || this.isPunctuator('(') || this.isPunctuator('[')) {
                depth++;
            }
            if (this.isPunctuator('}') || this.isPunctuator(')') || this.isPunctuator(']')) {
                if (depth === 0) {
                    break;
                }
                depth--;
            }

            if (depth === 0) {
                if (this.isPunctuator(',') || this.isPunctuator(';')) {
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

    private readUntil(stopKeywords: string[]): string {
        let result = '';

        while (this.current.type !== TokenType.EOF) {
            if (this.isPunctuator('{')) {
                break;
            }
            if (stopKeywords.some(kw => this.isKeyword(kw))) {
                break;
            }
            result += this.current.value;
            this.advance();
        }

        return result;
    }

    private consumeBalanced(open: string, close: string): string {
        let result = '';
        let depth = 0;

        if (!this.isPunctuator(open) && !this.isOperator(open)) {
            return result;
        }

        result += this.current.value;
        depth = 1;
        this.advance();

        while (this.current.type !== TokenType.EOF && depth > 0) {
            if (this.isPunctuator(open) || this.isOperator(open)) {
                depth++;
            }
            if (this.isPunctuator(close) || this.isOperator(close)) {
                depth--;
            }
            result += this.current.value;
            this.advance();
        }

        return result;
    }

    private skipWhitespace(): void {
        while (this.current.type === TokenType.Whitespace) {
            this.advance();
        }
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

    parse(): ArkTSUIComponent[] {
        const components: ArkTSUIComponent[] = [];

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

    private parseComponent(): ArkTSUIComponent | null {
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

    private parseIfComponent(): ArkTSUIComponent {
        this.index += 2;
        this.skipWhitespace();

        let condition = '';
        if (this.peek() === '(') {
            condition = this.consumeBalanced('(', ')');
        }

        this.skipWhitespace();

        let children: ArkTSUIComponent[] = [];
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

    private parseForEachComponent(): ArkTSUIComponent {
        this.index += 7;
        this.skipWhitespace();

        let loopExpression = '';
        if (this.peek() === '(') {
            loopExpression = this.consumeBalanced('(', ')');
        }

        return {
            type: 'UIComponent',
            name: 'ForEach',
            arguments: loopExpression,
            attributes: [],
            children: [],
            isConditional: false,
            isLoop: true,
            loopExpression
        };
    }

    private parseAttributes(): ArkTSUIAttribute[] {
        const attributes: ArkTSUIAttribute[] = [];

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

    private parseChildren(): ArkTSUIComponent[] {
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

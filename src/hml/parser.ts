import {
    ExprAssignment,
    ExprBinary,
    ExprCall,
    ExprConditional,
    ExprGrouping,
    ExprIdentifier,
    ExprLiteral,
    ExprLogical,
    ExprMember,
    ExprObject,
    ExprProperty,
    ExprUnary,
    ExprArray,
    HmlAttribute,
    HmlAttributeValue,
    HmlComment,
    HmlDocument,
    HmlElement,
    HmlInterpolation,
    HmlNode,
    HmlText,
    ExprNode
} from './ast';
import { HmlLexer, Token, TokenType, tokenToLiteral } from './lexer';

const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
    'meta', 'param', 'source', 'track', 'wbr'
]);

const ASSIGNMENT_OPERATORS = new Set([
    '=', '+=', '-=', '*=', '/=', '%='
]);

const LOGICAL_OPERATORS = new Set(['||', '&&']);
const EQUALITY_OPERATORS = new Set(['==', '!=', '===', '!==']);
const RELATIONAL_OPERATORS = new Set(['<', '>', '<=', '>=']);
const ADDITIVE_OPERATORS = new Set(['+', '-']);
const MULTIPLICATIVE_OPERATORS = new Set(['*', '/', '%']);
const UNARY_OPERATORS = new Set(['+', '-', '!', '~']);

export interface ParseError {
    message: string;
    token: Token;
}

export class HmlParser {
    private lexer: HmlLexer;
    private current: Token;
    public readonly errors: ParseError[] = [];

    constructor(text: string) {
        this.lexer = new HmlLexer(text);
        this.current = this.lexer.nextToken();
    }

    parseDocument(): HmlDocument {
        const children: HmlNode[] = [];
        while (this.current.type !== TokenType.EOF) {
            const node = this.parseNode();
            if (node) {
                children.push(node);
            } else {
                this.advance();
            }
        }
        return { type: 'Document', children };
    }

    private parseNode(): HmlNode | null {
        const token = this.current;
        switch (token.type) {
            case TokenType.Text:
                return this.parseText();
            case TokenType.Comment:
                return this.parseComment();
            case TokenType.TagOpen:
                return this.parseElement();
            case TokenType.TagClose:
                this.reportError('Unexpected closing tag', this.current);
                this.consumeUntil(TokenType.TagEnd);
                if (this.current.type === TokenType.TagEnd) {
                    this.advance();
                }
                return null;
            case TokenType.InterpolationStart:
                return this.parseInterpolation();
            default:
                return null;
        }
    }

    private parseText(): HmlText {
        const token = this.current;
        this.advance();
        return { type: 'Text', value: token.value };
    }

    private parseComment(): HmlComment {
        const token = this.current;
        this.advance();
        return { type: 'Comment', value: token.value };
    }

    private parseInterpolation(): HmlInterpolation {
        this.expect(TokenType.InterpolationStart);
        const expression = this.parseExpression();
        if (this.current.type === TokenType.InterpolationEnd) {
            this.advance();
        } else {
            this.reportError('Missing interpolation end', this.current);
        }
        return { type: 'Interpolation', expression };
    }

    private parseElement(): HmlElement {
        this.expect(TokenType.TagOpen);
        let tagName = 'unknown';
        if (this.current.type === TokenType.Name) {
            tagName = this.current.value;
            this.advance();
        } else {
            this.reportError('Missing tag name', this.current);
        }

        const attributes: HmlAttribute[] = [];
        while (this.current.type === TokenType.Name) {
            attributes.push(this.parseAttribute());
        }

        if (this.current.type === TokenType.TagSelfClose) {
            this.advance();
            return { type: 'Element', tagName, attributes, children: [], selfClosing: true };
        }

        if (this.current.type === TokenType.TagEnd) {
            this.advance();
        } else {
            this.reportError('Missing tag end', this.current);
            this.consumeUntil(TokenType.TagEnd);
            if (this.isCurrent(TokenType.TagEnd)) {
                this.advance();
            }
        }

        if (VOID_TAGS.has(tagName)) {
            return { type: 'Element', tagName, attributes, children: [], selfClosing: true };
        }

        const children: HmlNode[] = [];
        while (this.current.type !== TokenType.EOF) {
            if (this.current.type === TokenType.TagClose) {
                const matches = this.parseClosingTag(tagName);
                if (matches) {
                    return { type: 'Element', tagName, attributes, children, selfClosing: false };
                }
                continue;
            }
            const node = this.parseNode();
            if (node) {
                children.push(node);
            } else {
                this.advance();
            }
        }

        return { type: 'Element', tagName, attributes, children, selfClosing: false };
    }

    private parseAttribute(): HmlAttribute {
        const name = this.current.value;
        this.advance();
        const nextTokenType = this.current.type;
        if (nextTokenType !== TokenType.Equals) {
            return { name, valueKind: 'boolean' };
        }
        this.advance();

        let value: HmlAttributeValue | undefined;
        let valueKind: HmlAttribute['valueKind'] = 'string';

        const valueToken = this.current;
        if (valueToken.type === TokenType.String) {
            const raw = valueToken.value;
            const quote = raw.startsWith('"') ? '"' : "'";
            value = { value: raw.slice(1, -1), quote };
            valueKind = 'string';
            this.advance();
        } else if (valueToken.type === TokenType.InterpolationStart) {
            this.advance();
            const expression = this.parseExpression();
            if (this.current.type === TokenType.InterpolationEnd) {
                this.advance();
            } else {
                this.reportError('Missing interpolation end in attribute', this.current);
            }
            value = { value: '', expression };
            valueKind = 'expression';
        } else if (valueToken.type === TokenType.Name || valueToken.type === TokenType.UnquotedValue) {
            value = { value: valueToken.value };
            valueKind = 'unquoted';
            this.advance();
        } else {
            this.reportError('Missing attribute value', this.current);
            value = { value: '' };
            valueKind = 'unquoted';
        }

        return { name, value, valueKind };
    }

    private parseExpression(): ExprNode {
        if (this.current.type === TokenType.InterpolationEnd) {
            return { type: 'Literal', value: null, raw: 'null' };
        }
        return this.parseAssignment();
    }

    private parseAssignment(): ExprNode {
        const left = this.parseConditional();
        if (this.current.type === TokenType.Operator && ASSIGNMENT_OPERATORS.has(this.current.value)) {
            const operator = this.current.value;
            this.advance();
            const right = this.parseAssignment();
            const node: ExprAssignment = { type: 'AssignmentExpression', operator, left, right };
            return node;
        }
        return left;
    }

    private parseConditional(): ExprNode {
        const test = this.parseLogicalOr();
        if (this.current.type === TokenType.Operator && this.current.value === '?') {
            this.advance();
            const consequent = this.parseExpression();
            this.expectOperator(':');
            const alternate = this.parseExpression();
            const node: ExprConditional = { type: 'ConditionalExpression', test, consequent, alternate };
            return node;
        }
        return test;
    }

    private parseLogicalOr(): ExprNode {
        let left = this.parseLogicalAnd();
        while (this.current.type === TokenType.Operator && LOGICAL_OPERATORS.has(this.current.value) && this.current.value === '||') {
            const operator = this.current.value;
            this.advance();
            const right = this.parseLogicalAnd();
            const node: ExprLogical = { type: 'LogicalExpression', operator, left, right };
            left = node;
        }
        return left;
    }

    private parseLogicalAnd(): ExprNode {
        let left = this.parseEquality();
        while (this.current.type === TokenType.Operator && LOGICAL_OPERATORS.has(this.current.value) && this.current.value === '&&') {
            const operator = this.current.value;
            this.advance();
            const right = this.parseEquality();
            const node: ExprLogical = { type: 'LogicalExpression', operator, left, right };
            left = node;
        }
        return left;
    }

    private parseEquality(): ExprNode {
        let left = this.parseRelational();
        while (this.current.type === TokenType.Operator && EQUALITY_OPERATORS.has(this.current.value)) {
            const operator = this.current.value;
            this.advance();
            const right = this.parseRelational();
            const node: ExprBinary = { type: 'BinaryExpression', operator, left, right };
            left = node;
        }
        return left;
    }

    private parseRelational(): ExprNode {
        let left = this.parseAdditive();
        while (this.current.type === TokenType.Operator && RELATIONAL_OPERATORS.has(this.current.value)) {
            const operator = this.current.value;
            this.advance();
            const right = this.parseAdditive();
            const node: ExprBinary = { type: 'BinaryExpression', operator, left, right };
            left = node;
        }
        return left;
    }

    private parseAdditive(): ExprNode {
        let left = this.parseMultiplicative();
        while (this.current.type === TokenType.Operator && ADDITIVE_OPERATORS.has(this.current.value)) {
            const operator = this.current.value;
            this.advance();
            const right = this.parseMultiplicative();
            const node: ExprBinary = { type: 'BinaryExpression', operator, left, right };
            left = node;
        }
        return left;
    }

    private parseMultiplicative(): ExprNode {
        let left = this.parseUnary();
        while (this.current.type === TokenType.Operator && MULTIPLICATIVE_OPERATORS.has(this.current.value)) {
            const operator = this.current.value;
            this.advance();
            const right = this.parseUnary();
            const node: ExprBinary = { type: 'BinaryExpression', operator, left, right };
            left = node;
        }
        return left;
    }

    private parseUnary(): ExprNode {
        if (this.current.type === TokenType.Operator && UNARY_OPERATORS.has(this.current.value)) {
            const operator = this.current.value;
            this.advance();
            const argument = this.parseUnary();
            const node: ExprUnary = { type: 'UnaryExpression', operator, argument };
            return node;
        }
        return this.parsePostfix();
    }

    private parsePostfix(): ExprNode {
        let expr = this.parsePrimary();
        while (true) {
            if (this.current.type === TokenType.Operator && this.current.value === '.') {
                this.advance();
                const propertyToken = this.current;
                if (propertyToken.type === TokenType.Identifier || propertyToken.type === TokenType.Name) {
                    const property: ExprIdentifier = { type: 'Identifier', name: propertyToken.value };
                    this.advance();
                    expr = { type: 'MemberExpression', object: expr, property, computed: false };
                    continue;
                }
                this.reportError('Expected property name after .', this.current);
                break;
            }
            if (this.current.type === TokenType.Punctuator && this.current.value === '[') {
                this.advance();
                const property = this.parseExpression();
                this.expectPunctuator(']');
                expr = { type: 'MemberExpression', object: expr, property, computed: true };
                continue;
            }
            if (this.current.type === TokenType.Punctuator && this.current.value === '(') {
                const args = this.parseArguments();
                expr = { type: 'CallExpression', callee: expr, arguments: args };
                continue;
            }
            break;
        }
        return expr;
    }

    private parseArguments(): ExprNode[] {
        this.expectPunctuator('(');
        const args: ExprNode[] = [];
        while (this.current.type !== TokenType.Punctuator || this.current.value !== ')') {
            if (this.current.type === TokenType.EOF || this.current.type === TokenType.InterpolationEnd) {
                this.reportError('Unterminated argument list', this.current);
                break;
            }
            const arg = this.parseExpression();
            args.push(arg);
            if (this.current.type === TokenType.Punctuator && this.current.value === ',') {
                this.advance();
                continue;
            }
            break;
        }
        this.expectPunctuator(')');
        return args;
    }

    private parsePrimary(): ExprNode {
        switch (this.current.type) {
            case TokenType.Identifier:
            case TokenType.Name: {
                const node: ExprIdentifier = { type: 'Identifier', name: this.current.value };
                this.advance();
                return node;
            }
            case TokenType.Boolean:
            case TokenType.Null:
            case TokenType.Number:
            case TokenType.String: {
                const literal: ExprLiteral = tokenToLiteral(this.current);
                this.advance();
                return literal;
            }
            case TokenType.Punctuator:
                if (this.current.value === '(') {
                    this.advance();
                    const expression = this.parseExpression();
                    this.expectPunctuator(')');
                    const node: ExprGrouping = { type: 'GroupingExpression', expression };
                    return node;
                }
                if (this.current.value === '[') {
                    return this.parseArray();
                }
                if (this.current.value === '{') {
                    return this.parseObject();
                }
                break;
            default:
                break;
        }
        this.reportError('Unexpected expression token', this.current);
        const fallback: ExprIdentifier = { type: 'Identifier', name: '_' };
        this.advance();
        return fallback;
    }

    private parseArray(): ExprArray {
        this.expectPunctuator('[');
        const elements: ExprNode[] = [];
        while (this.current.type !== TokenType.Punctuator || this.current.value !== ']') {
            if (this.current.type === TokenType.EOF || this.current.type === TokenType.InterpolationEnd) {
                this.reportError('Unterminated array literal', this.current);
                break;
            }
            const element = this.parseExpression();
            elements.push(element);
            if (this.current.type === TokenType.Punctuator && this.current.value === ',') {
                this.advance();
                continue;
            }
            break;
        }
        this.expectPunctuator(']');
        return { type: 'ArrayExpression', elements };
    }

    private parseObject(): ExprObject {
        this.expectPunctuator('{');
        const properties: ExprProperty[] = [];
        while (this.current.type !== TokenType.Punctuator || this.current.value !== '}') {
            if (this.current.type === TokenType.EOF || this.current.type === TokenType.InterpolationEnd) {
                this.reportError('Unterminated object literal', this.current);
                break;
            }
            const key = this.parsePropertyKey();
            let value: ExprNode = key;
            let shorthand = true;
            if (this.current.type === TokenType.Punctuator && this.current.value === ':') {
                this.advance();
                value = this.parseExpression();
                shorthand = false;
            }
            properties.push({ type: 'Property', key, value, shorthand });
            if (this.current.type === TokenType.Punctuator && this.current.value === ',') {
                this.advance();
                continue;
            }
            break;
        }
        this.expectPunctuator('}');
        return { type: 'ObjectExpression', properties };
    }

    private parsePropertyKey(): ExprNode {
        if (this.current.type === TokenType.Identifier || this.current.type === TokenType.Name) {
            const key: ExprIdentifier = { type: 'Identifier', name: this.current.value };
            this.advance();
            return key;
        }
        if (this.current.type === TokenType.String || this.current.type === TokenType.Number || this.current.type === TokenType.Boolean) {
            const literal = tokenToLiteral(this.current);
            this.advance();
            return literal;
        }
        if (this.current.type === TokenType.Punctuator && this.current.value === '[') {
            this.advance();
            const expression = this.parseExpression();
            this.expectPunctuator(']');
            return expression;
        }
        this.reportError('Invalid object key', this.current);
        const fallback: ExprIdentifier = { type: 'Identifier', name: '_' };
        this.advance();
        return fallback;
    }

    private expect(type: TokenType): void {
        if (this.current.type === type) {
            this.advance();
            return;
        }
        this.reportError(`Expected token ${type}`, this.current);
    }

    private expectOperator(operator: string): void {
        if (this.current.type === TokenType.Operator && this.current.value === operator) {
            this.advance();
            return;
        }
        this.reportError(`Expected operator ${operator}`, this.current);
    }

    private expectPunctuator(punctuator: string): void {
        if (this.current.type === TokenType.Punctuator && this.current.value === punctuator) {
            this.advance();
            return;
        }
        this.reportError(`Expected punctuator ${punctuator}`, this.current);
    }

    private advance(): Token {
        const token = this.current;
        this.current = this.lexer.nextToken();
        return token;
    }

    private consumeUntil(type: TokenType): void {
        while (this.current.type !== TokenType.EOF && this.current.type !== type) {
            this.advance();
        }
    }

    private reportError(message: string, token: Token): void {
        this.errors.push({ message, token });
    }

    private parseClosingTag(expected: string): boolean {
        const tokenType = this.current.type;
        if (tokenType !== TokenType.TagClose) {
            return false;
        }
        this.advance();
        let name = '';
        const nameToken = this.current;
        if (nameToken.type === TokenType.Name) {
            name = nameToken.value;
            this.advance();
        } else {
            this.reportError('Missing closing tag name', this.current);
        }
        if (this.isCurrent(TokenType.TagEnd)) {
            this.advance();
        } else {
            this.reportError('Missing closing tag end', this.current);
            this.consumeUntil(TokenType.TagEnd);
            if (this.isCurrent(TokenType.TagEnd)) {
                this.advance();
            }
        }
        if (name !== expected) {
            this.reportError(`Expected closing tag </${expected}>`, this.current);
            return false;
        }
        return true;
    }

    private isCurrent(type: TokenType): boolean {
        return this.current.type === type;
    }
}

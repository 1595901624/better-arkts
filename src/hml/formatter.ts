import {
    ExprNode,
    ExprLiteral,
    ExprAssignment,
    ExprBinary,
    ExprCall,
    ExprConditional,
    ExprGrouping,
    ExprIdentifier,
    ExprLogical,
    ExprMember,
    ExprObject,
    ExprArray,
    ExprProperty,
    ExprUnary,
    HmlDocument,
    HmlElement,
    HmlNode,
    HmlText,
    HmlInterpolation,
    HmlComment,
    HmlAttribute
} from './ast';

export interface FormatOptions {
    indentSize: number;
    eol: string;
    maxLineLength: number;
}

const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
    'meta', 'param', 'source', 'track', 'wbr'
]);

const INLINE_TAGS = new Set([
    'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'em',
    'i', 'img', 'input', 'kbd', 'label', 'q', 's', 'samp', 'small', 'span',
    'strong', 'sub', 'sup', 'time', 'u', 'var'
]);

export function formatDocument(document: HmlDocument, options: FormatOptions): string {
    const parts: string[] = [];
    for (const child of document.children) {
        const formatted = formatNode(child, 0, options);
        if (formatted.trim().length === 0) {
            continue;
        }
        parts.push(formatted);
    }
    return parts.join(options.eol);
}

function formatNode(node: HmlNode, indentLevel: number, options: FormatOptions): string {
    switch (node.type) {
        case 'Element':
            return formatElement(node, indentLevel, options);
        case 'Text':
            return formatText(node, indentLevel, options, false);
        case 'Interpolation':
            return indent(options, indentLevel) + formatInterpolation(node, options);
        case 'Comment':
            return indent(options, indentLevel) + `<!--${node.value}-->`;
        default:
            return '';
    }
}

function formatElement(element: HmlElement, indentLevel: number, options: FormatOptions): string {
    const indentText = indent(options, indentLevel);
    const isVoid = element.selfClosing || VOID_TAGS.has(element.tagName);
    const attributeStrings = formatAttributes(element.attributes, indentLevel, options);
    const openTagSingle = `<${element.tagName}${attributeStrings.singleLine}${isVoid ? ' />' : '>'}`;

    if (isVoid) {
        return indentText + openTagSingle;
    }

    const inlineContent = isInlineElement(element);
    if (inlineContent) {
        const content = formatInlineChildren(element.children, options);
        return indentText + `<${element.tagName}${attributeStrings.singleLine}>` + content + `</${element.tagName}>`;
    }

    const openTag = attributeStrings.multiline
        ? `<${element.tagName}${attributeStrings.multiline}>`
        : openTagSingle;

    const lines: string[] = [];
    lines.push(indentText + openTag);
    for (const child of element.children) {
        const formatted = formatNode(child, indentLevel + 1, options);
        if (formatted.trim().length === 0) {
            continue;
        }
        lines.push(formatted);
    }
    lines.push(`${indentText}</${element.tagName}>`);
    return lines.join(options.eol);
}

function formatAttributes(attributes: HmlAttribute[], indentLevel: number, options: FormatOptions): { singleLine: string; multiline: string | null } {
    if (attributes.length === 0) {
        return { singleLine: '', multiline: null };
    }
    const parts = attributes.map((attr) => formatAttribute(attr, options));
    const singleLine = ' ' + parts.join(' ');

    const shouldWrap = parts.some((part) => part.includes(options.eol)) || singleLine.length > options.maxLineLength;
    if (!shouldWrap) {
        return { singleLine, multiline: null };
    }

    const multiline = options.eol + parts.map((part) => indent(options, indentLevel + 1) + part).join(options.eol);
    return { singleLine, multiline };
}

function formatAttribute(attribute: HmlAttribute, options: FormatOptions): string {
    if (attribute.valueKind === 'boolean' || !attribute.value) {
        return attribute.name;
    }
    if (attribute.valueKind === 'expression' && attribute.value.expression) {
        return `${attribute.name}="{{ ${formatExpression(attribute.value.expression)} }}"`;
    }
    if (attribute.valueKind === 'string') {
        const quote = attribute.value.quote ?? '"';
        return `${attribute.name}=${quote}${attribute.value.value}${quote}`;
    }
    return `${attribute.name}=${attribute.value.value}`;
}

function formatInlineChildren(children: HmlNode[], options: FormatOptions): string {
    const parts: string[] = [];
    for (const child of children) {
        if (child.type === 'Text') {
            parts.push(normalizeInlineText(child.value));
            continue;
        }
        if (child.type === 'Interpolation') {
            parts.push(formatInterpolation(child, options));
            continue;
        }
        if (child.type === 'Comment') {
            parts.push(`<!--${child.value}-->`);
            continue;
        }
        parts.push(formatNode(child, 0, options));
    }
    return parts.join('');
}

function formatText(node: HmlText, indentLevel: number, options: FormatOptions, inline: boolean): string {
    if (inline) {
        return normalizeInlineText(node.value);
    }
    const trimmed = node.value.replace(/\s+/g, ' ').trim();
    if (!trimmed) {
        return '';
    }
    return indent(options, indentLevel) + trimmed;
}

function normalizeInlineText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function formatInterpolation(node: HmlInterpolation, options: FormatOptions): string {
    return `{{ ${formatExpression(node.expression)} }}`;
}

function isInlineElement(element: HmlElement): boolean {
    if (INLINE_TAGS.has(element.tagName)) {
        return true;
    }
    if (element.children.length === 0) {
        return true;
    }
    return element.children.every((child) => child.type === 'Text' || child.type === 'Interpolation');
}

function indent(options: FormatOptions, level: number): string {
    return ' '.repeat(options.indentSize * level);
}

function formatExpression(node: ExprNode, parentPrecedence = 0): string {
    switch (node.type) {
        case 'Identifier':
            return (node as ExprIdentifier).name;
        case 'Literal':
            return formatLiteral(node as ExprLiteral);
        case 'UnaryExpression': {
            const unary = node as ExprUnary;
            const expr = formatExpression(unary.argument, 9);
            return wrapIfNeeded(unary.operator + expr, 9, parentPrecedence);
        }
        case 'BinaryExpression': {
            const binary = node as ExprBinary;
            const prec = getBinaryPrecedence(binary.operator);
            const left = formatExpression(binary.left, prec);
            const right = formatExpression(binary.right, prec + 1);
            return wrapIfNeeded(`${left} ${binary.operator} ${right}`, prec, parentPrecedence);
        }
        case 'LogicalExpression': {
            const logical = node as ExprLogical;
            const prec = logical.operator === '||' ? 3 : 4;
            const left = formatExpression(logical.left, prec);
            const right = formatExpression(logical.right, prec + 1);
            return wrapIfNeeded(`${left} ${logical.operator} ${right}`, prec, parentPrecedence);
        }
        case 'ConditionalExpression': {
            const cond = node as ExprConditional;
            const prec = 2;
            const test = formatExpression(cond.test, prec);
            const consequent = formatExpression(cond.consequent, prec);
            const alternate = formatExpression(cond.alternate, prec);
            return wrapIfNeeded(`${test} ? ${consequent} : ${alternate}`, prec, parentPrecedence);
        }
        case 'AssignmentExpression': {
            const assign = node as ExprAssignment;
            const prec = 1;
            const left = formatExpression(assign.left, prec);
            const right = formatExpression(assign.right, prec);
            return wrapIfNeeded(`${left} ${assign.operator} ${right}`, prec, parentPrecedence);
        }
        case 'MemberExpression': {
            const member = node as ExprMember;
            const obj = formatExpression(member.object, 10);
            const prop = member.computed
                ? `[${formatExpression(member.property, 0)}]`
                : `.${formatExpression(member.property, 10)}`;
            return wrapIfNeeded(`${obj}${prop}`, 10, parentPrecedence);
        }
        case 'CallExpression': {
            const call = node as ExprCall;
            const callee = formatExpression(call.callee, 10);
            const args = call.arguments.map((arg) => formatExpression(arg, 0)).join(', ');
            return wrapIfNeeded(`${callee}(${args})`, 10, parentPrecedence);
        }
        case 'ArrayExpression': {
            const array = node as ExprArray;
            const elements = array.elements.map((el) => formatExpression(el, 0)).join(', ');
            return `[${elements}]`;
        }
        case 'ObjectExpression': {
            const object = node as ExprObject;
            const props = object.properties.map((prop) => formatProperty(prop)).join(', ');
            return `{ ${props} }`;
        }
        case 'Property':
            return formatProperty(node as ExprProperty);
        case 'GroupingExpression': {
            const grouping = node as ExprGrouping;
            return `(${formatExpression(grouping.expression, 0)})`;
        }
        default:
            return '';
    }
}

function formatProperty(property: ExprProperty): string {
    const key = formatExpression(property.key, 0);
    if (property.shorthand) {
        return key;
    }
    return `${key}: ${formatExpression(property.value, 0)}`;
}

function formatLiteral(literal: ExprLiteral): string {
    if (typeof literal.value === 'string') {
        return literal.raw.startsWith('"') || literal.raw.startsWith("'") ? literal.raw : `"${literal.value}"`;
    }
    return String(literal.value);
}

function getBinaryPrecedence(operator: string): number {
    if (operator === '||') {
        return 3;
    }
    if (operator === '&&') {
        return 4;
    }
    if (['==', '!=', '===', '!=='].includes(operator)) {
        return 5;
    }
    if (['<', '>', '<=', '>='].includes(operator)) {
        return 6;
    }
    if (['+', '-'].includes(operator)) {
        return 7;
    }
    if (['*', '/', '%'].includes(operator)) {
        return 8;
    }
    return 9;
}

function wrapIfNeeded(text: string, precedence: number, parentPrecedence: number): string {
    return precedence < parentPrecedence ? `(${text})` : text;
}

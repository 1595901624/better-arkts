import type {
    ArkTSDocument,
    DecoratorNode,
    ExportNode,
    FunctionNode,
    ImportNode,
    InterfaceNode,
    MemberNode,
    MethodMember,
    ParameterNode,
    PropertyMember,
    StructNode,
    ClassNode,
    BuildMethodMember,
    UIComponent,
    UIAttribute,
    TopLevelNode
} from './parser';

export interface FormatOptions {
    indentSize: number;
    eol: string;
    maxLineLength: number;
    singleQuote: boolean;
    semicolon: boolean;
    trailingComma: boolean;
    bracketSpacing: boolean;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
    indentSize: 2,
    eol: '\n',
    maxLineLength: 120,
    singleQuote: true,
    semicolon: false,
    trailingComma: false,
    bracketSpacing: true
};

export function formatDocument(document: ArkTSDocument, options: FormatOptions = DEFAULT_FORMAT_OPTIONS): string {
    const parts: string[] = [];
    let lastNodeType: string | null = null;

    for (const child of document.children) {
        const formatted = formatNode(child, 0, options);
        if (formatted) {
            if (lastNodeType !== null && needsBlankLineBetween(lastNodeType, child.type)) {
                parts.push('');
            }
            parts.push(formatted);
            lastNodeType = child.type;
        }
    }

    return parts.join(options.eol) + options.eol;
}

function needsBlankLineBetween(prevType: string, currentType: string): boolean {
    const significantTypes = new Set(['Struct', 'Class', 'Interface', 'Function', 'Export']);

    if (prevType === 'Import' && currentType !== 'Import') {
        return true;
    }

    if (significantTypes.has(prevType) || significantTypes.has(currentType)) {
        return true;
    }

    return false;
}

function needsBlankLineBetweenMembers(prevType: string, currentType: string): boolean {
    if (prevType === 'Property' && currentType === 'Method') {
        return true;
    }
    if (prevType === 'Property' && currentType === 'BuildMethod') {
        return true;
    }
    if (prevType === 'Method' && currentType === 'Method') {
        return true;
    }
    if (prevType === 'Method' && currentType === 'BuildMethod') {
        return true;
    }
    if (prevType === 'BuildMethod' && currentType === 'Method') {
        return true;
    }
    if (prevType === 'BuildMethod' && currentType === 'BuildMethod') {
        return true;
    }
    return false;
}

function formatNode(node: TopLevelNode, indentLevel: number, options: FormatOptions): string {
    switch (node.type) {
        case 'Import':
            return formatImport(node, options);
        case 'Export':
            return formatExport(node, indentLevel, options);
        case 'Struct':
            return formatStruct(node, indentLevel, options);
        case 'Class':
            return formatClass(node, indentLevel, options);
        case 'Interface':
            return formatInterface(node, indentLevel, options);
        case 'Function':
            return formatFunction(node, indentLevel, options);
        case 'Expression':
            return indent(options, indentLevel) + node.raw;
        default:
            return '';
    }
}

function formatImport(node: ImportNode, options: FormatOptions): string {
    const quote = options.singleQuote ? "'" : '"';
    const semi = options.semicolon ? ';' : '';

    if (node.namespaceImport) {
        return `import * as ${node.namespaceImport} from ${quote}${node.source}${quote}${semi}`;
    }

    const parts: string[] = [];
    if (node.defaultImport) {
        parts.push(node.defaultImport);
    }

    if (node.namedImports && node.namedImports.length > 0) {
        const named = options.bracketSpacing
            ? `{ ${node.namedImports.join(', ')} }`
            : `{${node.namedImports.join(', ')}}`;
        parts.push(named);
    }

    if (parts.length === 0 && node.source) {
        return `import ${quote}${node.source}${quote}${semi}`;
    }

    return `import ${parts.join(', ')} from ${quote}${node.source}${quote}${semi}`;
}

function formatExport(node: ExportNode, indentLevel: number, options: FormatOptions): string {
    const parts: string[] = [];
    parts.push('export');
    if (node.isDefault) {
        parts.push('default');
    }

    if (node.declaration) {
        const decl = formatNode(node.declaration as TopLevelNode, indentLevel, options);
        return parts.join(' ') + ' ' + decl.trimStart();
    }

    return parts.join(' ');
}

function formatStruct(node: StructNode, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator));
    }

    let structLine = `${ind}struct ${node.name}`;
    if (node.extends) {
        structLine += ` extends ${node.extends}`;
    }
    if (node.implements && node.implements.length > 0) {
        structLine += ` implements ${node.implements.join(', ')}`;
    }
    structLine += ' {';
    lines.push(structLine);

    let lastMemberType: string | null = null;
    for (const member of node.members) {
        const memberStr = formatMember(member, indentLevel + 1, options);
        if (memberStr) {
            if (lastMemberType !== null && needsBlankLineBetweenMembers(lastMemberType, member.type)) {
                // sample.ets keeps the blank line between state properties and build() empty,
                // but uses indented blank lines between other member groups.
                if (lastMemberType === 'Property' && member.type === 'BuildMethod') {
                    lines.push('');
                } else {
                    lines.push(indent(options, indentLevel + 1));
                }
            }
            lines.push(memberStr);
            lastMemberType = member.type;
        }
    }

    lines.push(`${ind}}`);
    return lines.join(options.eol);
}

function formatClass(node: ClassNode, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator));
    }

    let classLine = ind;
    if (node.isAbstract) {
        classLine += 'abstract ';
    }
    classLine += `class ${node.name}`;
    if (node.extends) {
        classLine += ` extends ${node.extends}`;
    }
    if (node.implements && node.implements.length > 0) {
        classLine += ` implements ${node.implements.join(', ')}`;
    }
    classLine += ' {';
    lines.push(classLine);

    let lastMemberType: string | null = null;
    for (const member of node.members) {
        const memberStr = formatMember(member, indentLevel + 1, options);
        if (memberStr) {
            if (lastMemberType !== null && needsBlankLineBetweenMembers(lastMemberType, member.type)) {
                lines.push(indent(options, indentLevel + 1));
            }
            lines.push(memberStr);
            lastMemberType = member.type;
        }
    }

    lines.push(`${ind}}`);
    return lines.join(options.eol);
}

function formatInterface(node: InterfaceNode, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    let interfaceLine = `${ind}interface ${node.name}`;
    if (node.extends && node.extends.length > 0) {
        interfaceLine += ` extends ${node.extends.join(', ')}`;
    }
    interfaceLine += ' {';
    lines.push(interfaceLine);

    for (const member of node.members) {
        const memberStr = formatMember(member, indentLevel + 1, options);
        if (memberStr) {
            lines.push(memberStr);
        }
    }

    lines.push(`${ind}}`);
    return lines.join(options.eol);
}

function formatFunction(node: FunctionNode, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator));
    }

    let funcLine = ind;
    if (node.isAsync) {
        funcLine += 'async ';
    }
    funcLine += 'function ';
    if (node.isGenerator) {
        funcLine += '* ';
    }
    funcLine += node.name;
    funcLine += formatParameters(node.parameters, options);
    if (node.returnType) {
        funcLine += `: ${node.returnType}`;
    }

    if (node.body) {
        funcLine += ' ' + formatBody(node.body, indentLevel, options);
        lines.push(funcLine);
    } else {
        funcLine += options.semicolon ? ';' : '';
        lines.push(funcLine);
    }

    return lines.join(options.eol);
}

function formatMember(member: MemberNode, indentLevel: number, options: FormatOptions): string {
    switch (member.type) {
        case 'Property':
            return formatProperty(member, indentLevel, options);
        case 'Method':
            return formatMethod(member, indentLevel, options);
        case 'BuildMethod':
            return formatBuildMethod(member, indentLevel, options);
        default:
            return '';
    }
}

function formatProperty(node: PropertyMember, indentLevel: number, options: FormatOptions): string {
    const ind = indent(options, indentLevel);

    let propLine = ind;
    for (const decorator of node.decorators) {
        propLine += formatDecorator(decorator) + ' ';
    }

    if (node.visibility) {
        propLine += node.visibility + ' ';
    }

    if (node.isStatic) {
        propLine += 'static ';
    }

    if (node.isReadonly) {
        propLine += 'readonly ';
    }

    propLine += node.name;
    if (node.isOptional) {
        propLine += '?';
    }

    if (node.propertyType) {
        propLine += `: ${node.propertyType}`;
    }

    if (node.initializer) {
        propLine += ` = ${node.initializer}`;
    }

    propLine += options.semicolon ? ';' : '';
    return propLine;
}

function formatMethod(node: MethodMember, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator));
    }

    let methodLine = ind;
    if (node.visibility) {
        methodLine += node.visibility + ' ';
    }

    if (node.isAbstract) {
        methodLine += 'abstract ';
    }

    if (node.isStatic) {
        methodLine += 'static ';
    }

    if (node.isAsync) {
        methodLine += 'async ';
    }

    methodLine += node.name;
    methodLine += formatParameters(node.parameters, options);

    if (node.returnType) {
        methodLine += `: ${node.returnType}`;
    }

    if (node.body) {
        const hasBuilderDecorator = node.decorators.some(d => d.name === 'Builder' || d.name === 'LocalBuilder');
        if (hasBuilderDecorator) {
            methodLine += ' ' + formatBuilderBody(node.body, indentLevel, options);
        } else {
            methodLine += ' ' + formatBody(node.body, indentLevel, options);
        }
        lines.push(methodLine);
    } else {
        methodLine += options.semicolon ? ';' : '';
        lines.push(methodLine);
    }

    return lines.join(options.eol);
}

function formatBuilderBody(body: string, indentLevel: number, options: FormatOptions): string {
    if (!body.startsWith('{')) {
        return `{${options.eol}${indent(options, indentLevel + 1)}${body.trim()}${options.eol}${indent(options, indentLevel)}}`;
    }

    const content = body.slice(1, -1).trim();
    if (!content) {
        return '{}';
    }

    const formattedBody = formatBuildBody(content, indentLevel + 1, options);
    if (!formattedBody) {
        return '{}';
    }

    return `{${options.eol}${formattedBody}${options.eol}${indent(options, indentLevel)}}`;
}

function formatBuildMethod(node: BuildMethodMember, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator));
    }

    lines.push(`${ind}build() {`);

    const formattedBody = formatBuildBody(node.rawBody, indentLevel + 1, options);
    if (formattedBody) {
        lines.push(formattedBody);
    }

    lines.push(`${ind}}`);
    return lines.join(options.eol);
}

function formatBuildBody(rawBody: string, indentLevel: number, options: FormatOptions): string {
    if (!rawBody.trim()) {
        return '';
    }

    return reindentBlock(rawBody, indentLevel, options);
}

function formatUIComponent(component: UIComponent, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    if (component.isConditional && component.name === 'If') {
        lines.push(`${ind}if ${component.condition} {`);
        for (const child of component.children) {
            const childStr = formatUIComponent(child, indentLevel + 1, options);
            if (childStr) {
                lines.push(childStr);
            }
        }
        lines.push(`${ind}}`);
        return lines.join(options.eol);
    }

    if (component.isLoop && component.name === 'ForEach') {
        lines.push(`${ind}ForEach${component.arguments || '()'}`);
        return lines.join(options.eol);
    }

    let componentLine = `${ind}${component.name}${component.arguments || '()'}`;

    for (const attr of component.attributes) {
        componentLine += options.eol + ind + '  ' + formatUIAttribute(attr);
    }

    if (component.children.length > 0) {
        componentLine += ' {';
        lines.push(componentLine);
        for (const child of component.children) {
            const childStr = formatUIComponent(child, indentLevel + 1, options);
            if (childStr) {
                lines.push(childStr);
            }
        }
        lines.push(`${ind}}`);
    } else {
        lines.push(componentLine);
    }

    return lines.join(options.eol);
}

function formatUIAttribute(attr: UIAttribute): string {
    return `.${attr.name}${attr.arguments}`;
}

function formatDecorator(decorator: DecoratorNode): string {
    let result = `@${decorator.name}`;
    if (decorator.arguments) {
        result += decorator.arguments;
    }
    return result;
}

function formatParameters(params: ParameterNode[], options: FormatOptions): string {
    if (params.length === 0) {
        return '()';
    }

    const paramStrings = params.map(p => formatParameter(p));
    const singleLine = `(${paramStrings.join(', ')})`;

    if (singleLine.length <= options.maxLineLength) {
        return singleLine;
    }

    return `(${options.eol}  ${paramStrings.join(',' + options.eol + '  ')}${options.trailingComma ? ',' : ''}${options.eol})`;
}

function formatParameter(param: ParameterNode): string {
    let result = '';
    for (const decorator of param.decorators) {
        result += formatDecorator(decorator) + ' ';
    }
    if (param.isRest) {
        result += '...';
    }
    result += param.name;
    if (param.isOptional) {
        result += '?';
    }
    if (param.parameterType) {
        result += `: ${param.parameterType}`;
    }
    if (param.defaultValue) {
        result += ` = ${param.defaultValue}`;
    }
    return result;
}

function formatBody(body: string, indentLevel: number, options: FormatOptions): string {
    if (!body.startsWith('{')) {
        return `{${options.eol}${indent(options, indentLevel + 1)}${body.trim()}${options.eol}${indent(options, indentLevel)}}`;
    }

    const content = body.slice(1, -1);
    if (!content.trim()) {
        return '{}';
    }

    const formatted = reindentBlock(content, indentLevel + 1, options);
    if (!formatted) {
        return '{}';
    }
    return `{${options.eol}${formatted}${options.eol}${indent(options, indentLevel)}}`;
}

function indent(options: FormatOptions, level: number): string {
    return ' '.repeat(options.indentSize * level);
}

function reindentBlock(raw: string, baseIndentLevel: number, options: FormatOptions): string {
    const lines = raw.split(/\r?\n/);
    const result: string[] = [];

    let currentIndent = 0;
    let lastWasEmpty = false;

    let inSwitchBlock = false;
    let switchCaseIndent = 0;
    let inDocComment = false;

    let prevTrimmedLine = '';
    let prevChainIndent = 0;

    // For each open '{', we push an associated extra indent contributed by the opening line.
    const braceExtraIndentStack: number[] = [];

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        if (!trimmed) {
            if (!lastWasEmpty && result.length > 0) {
                result.push(indent(options, baseIndentLevel + currentIndent + sum(braceExtraIndentStack)));
                lastWasEmpty = true;
            }
            continue;
        }
        lastWasEmpty = false;

        // Doc comments: normalize leading stars but keep them aligned.
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

        // Detect switch start
        if (trimmed.match(/^switch\s*\(/)) {
            inSwitchBlock = true;
            switchCaseIndent = 0;
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

        // switch-case indentation
        if (inSwitchBlock && trimmed.match(/^(case\s+.+:|default\s*:)/)) {
            switchCaseIndent = 1;
            result.push(indent(options, baseIndentLevel + indentBefore + braceExtraSum) + trimmed);
        } else if (inSwitchBlock && switchCaseIndent > 0 && !trimmed.startsWith('}')) {
            result.push(indent(options, baseIndentLevel + indentBefore + braceExtraSum + 1) + trimmed);
        } else {
            result.push(indent(options, baseIndentLevel + indentBefore + braceExtraSum + chainIndentForLine) + trimmed);
        }

        // Update state (brace nesting) while ignoring braces inside strings.
        const { openBraces, closeBraces } = countBracesOutsideStrings(trimmed);

        // Pop for closes (after printing so closing braces keep the extra indent of the block).
        for (let c = 0; c < closeBraces; c++) {
            braceExtraIndentStack.pop();
        }

        // Update current indent
        currentIndent += openBraces - closeBraces;
        currentIndent = Math.max(0, currentIndent);

        // Push for opens
        for (let o = 0; o < openBraces; o++) {
            braceExtraIndentStack.push(isChainLine ? chainIndentForLine : 0);
        }

        if (inSwitchBlock && currentIndent === 0 && trimmed === '}') {
            inSwitchBlock = false;
            switchCaseIndent = 0;
        }

        prevTrimmedLine = trimmed;
        prevChainIndent = isChainLine ? chainIndentForLine : 0;
    }

    while (result.length > 0 && result[result.length - 1].trim() === '') {
        result.pop();
    }

    return result.join(options.eol);
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

// Exported for potential future use (not yet wired into build-body formatting).
export const __internal = {
    formatBuildBody,
    formatUIComponent,
    formatUIAttribute
};

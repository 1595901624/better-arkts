import {
    ArkTSDocument,
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
    ArkTSDecorator,
    ArkTSNode,
    ARKTS_DECORATORS
} from './ast';

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
    semicolon: true,
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

function formatNode(node: ArkTSNode, indentLevel: number, options: FormatOptions): string {
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
            return indent(options, indentLevel) + (node as any).raw;
        default:
            return '';
    }
}

function formatImport(node: any, options: FormatOptions): string {
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

function formatExport(node: any, indentLevel: number, options: FormatOptions): string {
    const parts: string[] = [];
    parts.push('export');

    if (node.isDefault) {
        parts.push('default');
    }

    if (node.declaration) {
        const decl = formatNode(node.declaration, indentLevel, options);
        return parts.join(' ') + ' ' + decl.trimStart();
    }

    return parts.join(' ');
}

function formatStruct(node: ArkTSStruct, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator, options));
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
                lines.push('');
            }
            lines.push(memberStr);
            lastMemberType = member.type;
        }
    }

    lines.push(`${ind}}`);
    return lines.join(options.eol);
}

function formatClass(node: ArkTSClass, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator, options));
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
                lines.push('');
            }
            lines.push(memberStr);
            lastMemberType = member.type;
        }
    }

    lines.push(`${ind}}`);
    return lines.join(options.eol);
}

function formatInterface(node: ArkTSInterface, indentLevel: number, options: FormatOptions): string {
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

function formatFunction(node: ArkTSFunction, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator, options));
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

function formatMember(member: ArkTSProperty | ArkTSMethod | ArkTSBuildMethod, indentLevel: number, options: FormatOptions): string {
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

function formatProperty(node: ArkTSProperty, indentLevel: number, options: FormatOptions): string {
    const ind = indent(options, indentLevel);

    let propLine = ind;
    
    for (const decorator of node.decorators) {
        propLine += formatDecorator(decorator, options) + ' ';
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
    if (node.propertyType) {
        propLine += `: ${node.propertyType}`;
    }
    if (node.initializer) {
        propLine += ` = ${node.initializer}`;
    }
    propLine += options.semicolon ? ';' : '';

    return propLine;
}

function formatMethod(node: ArkTSMethod, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator, options));
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

function formatBuildMethod(node: ArkTSBuildMethod, indentLevel: number, options: FormatOptions): string {
    const lines: string[] = [];
    const ind = indent(options, indentLevel);

    for (const decorator of node.decorators) {
        lines.push(ind + formatDecorator(decorator, options));
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
    
    const lines = rawBody.split(/\r?\n/);
    const result: string[] = [];
    let currentIndent = 0;
    let lastWasEmpty = false;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            if (!lastWasEmpty && result.length > 0) {
                result.push('');
                lastWasEmpty = true;
            }
            continue;
        }
        lastWasEmpty = false;
        
        const closeBraceCount = (trimmed.match(/^\}+/g) || []).join('').length;
        if (closeBraceCount > 0 && trimmed.startsWith('}')) {
            currentIndent = Math.max(0, currentIndent - closeBraceCount);
        }
        
        result.push(indent(options, indentLevel + currentIndent) + trimmed);
        
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;
        currentIndent += openBraces - closeBraces;
        currentIndent = Math.max(0, currentIndent);
    }
    
    while (result.length > 0 && result[result.length - 1] === '') {
        result.pop();
    }
    
    return result.join(options.eol);
}

function formatUIComponent(component: ArkTSUIComponent, indentLevel: number, options: FormatOptions): string {
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
        componentLine += options.eol + ind + '  ' + formatUIAttribute(attr, options);
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
    } else if (component.attributes.length > 0) {
        lines.push(componentLine);
    } else {
        lines.push(componentLine);
    }

    return lines.join(options.eol);
}

function formatUIAttribute(attr: ArkTSUIAttribute, options: FormatOptions): string {
    return `.${attr.name}${attr.arguments}`;
}

function formatDecorator(decorator: ArkTSDecorator, options: FormatOptions): string {
    let result = `@${decorator.name}`;
    if (decorator.arguments) {
        result += decorator.arguments;
    }
    return result;
}

function formatParameters(params: ArkTSParameter[], options: FormatOptions): string {
    if (params.length === 0) {
        return '()';
    }

    const paramStrings = params.map(p => formatParameter(p, options));
    const singleLine = `(${paramStrings.join(', ')})`;

    if (singleLine.length <= options.maxLineLength) {
        return singleLine;
    }

    return `(${options.eol}  ${paramStrings.join(',' + options.eol + '  ')}${options.trailingComma ? ',' : ''}${options.eol})`;
}

function formatParameter(param: ArkTSParameter, options: FormatOptions): string {
    let result = '';

    for (const decorator of param.decorators) {
        result += formatDecorator(decorator, options) + ' ';
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

    const lines = content.split(/\r?\n/);
    const formattedLines: string[] = [];
    let currentIndent = 0;
    let lastWasEmpty = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            if (!lastWasEmpty && formattedLines.length > 0) {
                formattedLines.push('');
                lastWasEmpty = true;
            }
            continue;
        }
        lastWasEmpty = false;
        
        const closeBraceCount = (trimmed.match(/^\}+/g) || []).join('').length;
        if (closeBraceCount > 0 && trimmed.startsWith('}')) {
            currentIndent = Math.max(0, currentIndent - closeBraceCount);
        }
        
        formattedLines.push(indent(options, indentLevel + 1 + currentIndent) + trimmed);
        
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;
        currentIndent += openBraces - closeBraces;
        currentIndent = Math.max(0, currentIndent);
    }

    while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === '') {
        formattedLines.pop();
    }

    if (formattedLines.length === 0) {
        return '{}';
    }

    return `{${options.eol}${formattedLines.join(options.eol)}${options.eol}${indent(options, indentLevel)}}`;
}

function indent(options: FormatOptions, level: number): string {
    return ' '.repeat(options.indentSize * level);
}

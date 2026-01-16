/**
 * ArkTS AST (Abstract Syntax Tree) Type Definitions
 * 
 * This module defines all AST node types for ArkTS language parsing.
 * ArkTS is a TypeScript-based language for HarmonyOS UI development.
 */

// ============================================================================
// Source Location
// ============================================================================

export interface SourceLocation {
    start: Position;
    end: Position;
}

export interface Position {
    line: number;
    column: number;
    offset: number;
}

// ============================================================================
// Base Node
// ============================================================================

export interface BaseNode {
    type: string;
    loc?: SourceLocation;
}

// ============================================================================
// Program (Root)
// ============================================================================

export interface Program extends BaseNode {
    type: 'Program';
    body: Statement[];
    comments?: Comment[];
}

// ============================================================================
// Comments
// ============================================================================

export interface Comment extends BaseNode {
    type: 'LineComment' | 'BlockComment';
    value: string;
}

// ============================================================================
// Statements
// ============================================================================

export type Statement =
    | ImportDeclaration
    | ExportDeclaration
    | VariableDeclaration
    | FunctionDeclaration
    | ClassDeclaration
    | StructDeclaration
    | InterfaceDeclaration
    | TypeAliasDeclaration
    | EnumDeclaration
    | ExpressionStatement
    | BlockStatement
    | IfStatement
    | SwitchStatement
    | ForStatement
    | ForOfStatement
    | ForInStatement
    | WhileStatement
    | DoWhileStatement
    | ReturnStatement
    | BreakStatement
    | ContinueStatement
    | ThrowStatement
    | TryStatement
    | EmptyStatement;

// ============================================================================
// Import/Export Declarations
// ============================================================================

export interface ImportDeclaration extends BaseNode {
    type: 'ImportDeclaration';
    specifiers: ImportSpecifier[];
    source: StringLiteral;
    isLazy?: boolean; // ArkTS supports lazy import
}

export interface ImportSpecifier extends BaseNode {
    type: 'ImportSpecifier' | 'ImportDefaultSpecifier' | 'ImportNamespaceSpecifier';
    local: Identifier;
    imported?: Identifier;
}

export interface ExportDeclaration extends BaseNode {
    type: 'ExportDeclaration';
    declaration?: Declaration;
    specifiers?: ExportSpecifier[];
    source?: StringLiteral;
    isDefault?: boolean;
}

export interface ExportSpecifier extends BaseNode {
    type: 'ExportSpecifier';
    local: Identifier;
    exported: Identifier;
}

// ============================================================================
// Variable Declaration
// ============================================================================

export interface VariableDeclaration extends BaseNode {
    type: 'VariableDeclaration';
    kind: 'let' | 'const' | 'var';
    declarations: VariableDeclarator[];
}

export interface VariableDeclarator extends BaseNode {
    type: 'VariableDeclarator';
    id: Pattern;
    init?: Expression;
    typeAnnotation?: TypeAnnotation;
}

// ============================================================================
// Function Declaration
// ============================================================================

export interface FunctionDeclaration extends BaseNode {
    type: 'FunctionDeclaration';
    id: Identifier | null;
    params: Parameter[];
    body: BlockStatement;
    returnType?: TypeAnnotation;
    async?: boolean;
    generator?: boolean;
    decorators?: Decorator[];
}

export interface Parameter extends BaseNode {
    type: 'Parameter';
    name: Identifier | Pattern;
    typeAnnotation?: TypeAnnotation;
    optional?: boolean;
    defaultValue?: Expression;
    decorators?: Decorator[];
}

// ============================================================================
// Class Declaration
// ============================================================================

export interface ClassDeclaration extends BaseNode {
    type: 'ClassDeclaration';
    id: Identifier;
    superClass?: Expression;
    implements?: TypeReference[];
    body: ClassBody;
    decorators?: Decorator[];
}

export interface ClassBody extends BaseNode {
    type: 'ClassBody';
    members: ClassMember[];
}

export type ClassMember =
    | PropertyDeclaration
    | MethodDeclaration
    | ConstructorDeclaration
    | GetterDeclaration
    | SetterDeclaration;

export interface PropertyDeclaration extends BaseNode {
    type: 'PropertyDeclaration';
    key: Identifier | StringLiteral;
    value?: Expression;
    typeAnnotation?: TypeAnnotation;
    accessibility?: 'public' | 'private' | 'protected';
    static?: boolean;
    readonly?: boolean;
    decorators?: Decorator[];
}

export interface MethodDeclaration extends BaseNode {
    type: 'MethodDeclaration';
    key: Identifier | StringLiteral;
    params: Parameter[];
    body: BlockStatement;
    returnType?: TypeAnnotation;
    accessibility?: 'public' | 'private' | 'protected';
    static?: boolean;
    async?: boolean;
    decorators?: Decorator[];
}

export interface ConstructorDeclaration extends BaseNode {
    type: 'ConstructorDeclaration';
    params: Parameter[];
    body: BlockStatement;
    accessibility?: 'public' | 'private' | 'protected';
}

export interface GetterDeclaration extends BaseNode {
    type: 'GetterDeclaration';
    key: Identifier | StringLiteral;
    body: BlockStatement;
    returnType?: TypeAnnotation;
    accessibility?: 'public' | 'private' | 'protected';
    static?: boolean;
}

export interface SetterDeclaration extends BaseNode {
    type: 'SetterDeclaration';
    key: Identifier | StringLiteral;
    param: Parameter;
    body: BlockStatement;
    accessibility?: 'public' | 'private' | 'protected';
    static?: boolean;
}

// ============================================================================
// Struct Declaration (ArkTS specific)
// ============================================================================

export interface StructDeclaration extends BaseNode {
    type: 'StructDeclaration';
    id: Identifier;
    body: StructBody;
    decorators?: Decorator[];
}

export interface StructBody extends BaseNode {
    type: 'StructBody';
    members: StructMember[];
}

export type StructMember =
    | PropertyDeclaration
    | MethodDeclaration
    | BuildMethodDeclaration
    | BuilderDeclaration;

export interface BuildMethodDeclaration extends BaseNode {
    type: 'BuildMethodDeclaration';
    body: UIDescription;
}

export interface BuilderDeclaration extends BaseNode {
    type: 'BuilderDeclaration';
    id: Identifier;
    params: Parameter[];
    body: UIDescription;
    decorators?: Decorator[];
}

// ============================================================================
// UI Description (ArkTS specific)
// ============================================================================

export interface UIDescription extends BaseNode {
    type: 'UIDescription';
    root: UIComponent | IfUIStatement | ForEachStatement | null;
}

export interface UIComponent extends BaseNode {
    type: 'UIComponent';
    name: Identifier;
    arguments: Expression[];
    children: UIChild[];
    chainedCalls: ChainedCall[];
}

export type UIChild = UIComponent | IfUIStatement | ForEachStatement | LazyForEachStatement;

export interface ChainedCall extends BaseNode {
    type: 'ChainedCall';
    name: Identifier;
    arguments: Expression[];
}

export interface IfUIStatement extends BaseNode {
    type: 'IfUIStatement';
    test: Expression;
    consequent: UIChild[];
    alternate?: UIChild[] | IfUIStatement;
}

export interface ForEachStatement extends BaseNode {
    type: 'ForEachStatement';
    array: Expression;
    itemCallback: ArrowFunctionExpression | FunctionExpression;
    keyGenerator?: ArrowFunctionExpression | FunctionExpression;
}

export interface LazyForEachStatement extends BaseNode {
    type: 'LazyForEachStatement';
    dataSource: Expression;
    itemCallback: ArrowFunctionExpression | FunctionExpression;
    keyGenerator?: ArrowFunctionExpression | FunctionExpression;
}

// ============================================================================
// Interface Declaration
// ============================================================================

export interface InterfaceDeclaration extends BaseNode {
    type: 'InterfaceDeclaration';
    id: Identifier;
    extends?: TypeReference[];
    body: InterfaceBody;
}

export interface InterfaceBody extends BaseNode {
    type: 'InterfaceBody';
    members: InterfaceMember[];
}

export type InterfaceMember =
    | PropertySignature
    | MethodSignature
    | IndexSignature;

export interface PropertySignature extends BaseNode {
    type: 'PropertySignature';
    key: Identifier | StringLiteral;
    typeAnnotation?: TypeAnnotation;
    optional?: boolean;
    readonly?: boolean;
}

export interface MethodSignature extends BaseNode {
    type: 'MethodSignature';
    key: Identifier | StringLiteral;
    params: Parameter[];
    returnType?: TypeAnnotation;
    optional?: boolean;
}

export interface IndexSignature extends BaseNode {
    type: 'IndexSignature';
    key: Identifier;
    keyType: TypeAnnotation;
    valueType: TypeAnnotation;
    readonly?: boolean;
}

// ============================================================================
// Type Alias Declaration
// ============================================================================

export interface TypeAliasDeclaration extends BaseNode {
    type: 'TypeAliasDeclaration';
    id: Identifier;
    typeParameters?: TypeParameter[];
    typeAnnotation: TypeAnnotation;
}

// ============================================================================
// Enum Declaration
// ============================================================================

export interface EnumDeclaration extends BaseNode {
    type: 'EnumDeclaration';
    id: Identifier;
    members: EnumMember[];
}

export interface EnumMember extends BaseNode {
    type: 'EnumMember';
    id: Identifier;
    initializer?: Expression;
}

// ============================================================================
// Decorators
// ============================================================================

export interface Decorator extends BaseNode {
    type: 'Decorator';
    expression: Expression;
}

// ============================================================================
// Type Annotations
// ============================================================================

export type TypeAnnotation =
    | TypeReference
    | UnionType
    | IntersectionType
    | ArrayType
    | TupleType
    | FunctionType
    | ObjectType
    | LiteralType
    | KeywordType
    | GenericType
    | ConditionalType;

export interface TypeReference extends BaseNode {
    type: 'TypeReference';
    typeName: Identifier | QualifiedName;
    typeArguments?: TypeAnnotation[];
}

export interface QualifiedName extends BaseNode {
    type: 'QualifiedName';
    left: Identifier | QualifiedName;
    right: Identifier;
}

export interface UnionType extends BaseNode {
    type: 'UnionType';
    types: TypeAnnotation[];
}

export interface IntersectionType extends BaseNode {
    type: 'IntersectionType';
    types: TypeAnnotation[];
}

export interface ArrayType extends BaseNode {
    type: 'ArrayType';
    elementType: TypeAnnotation;
}

export interface TupleType extends BaseNode {
    type: 'TupleType';
    elementTypes: TypeAnnotation[];
}

export interface FunctionType extends BaseNode {
    type: 'FunctionType';
    params: Parameter[];
    returnType: TypeAnnotation;
    typeParameters?: TypeParameter[];
}

export interface ObjectType extends BaseNode {
    type: 'ObjectType';
    members: (PropertySignature | MethodSignature | IndexSignature)[];
}

export interface LiteralType extends BaseNode {
    type: 'LiteralType';
    literal: StringLiteral | NumericLiteral | BooleanLiteral;
}

export interface KeywordType extends BaseNode {
    type: 'KeywordType';
    keyword: 'string' | 'number' | 'boolean' | 'void' | 'null' | 'undefined' | 'any' | 'unknown' | 'never' | 'object';
}

export interface GenericType extends BaseNode {
    type: 'GenericType';
    typeName: Identifier;
    typeArguments: TypeAnnotation[];
}

export interface ConditionalType extends BaseNode {
    type: 'ConditionalType';
    checkType: TypeAnnotation;
    extendsType: TypeAnnotation;
    trueType: TypeAnnotation;
    falseType: TypeAnnotation;
}

export interface TypeParameter extends BaseNode {
    type: 'TypeParameter';
    name: Identifier;
    constraint?: TypeAnnotation;
    default?: TypeAnnotation;
}

// ============================================================================
// Control Flow Statements
// ============================================================================

export interface BlockStatement extends BaseNode {
    type: 'BlockStatement';
    body: Statement[];
}

export interface IfStatement extends BaseNode {
    type: 'IfStatement';
    test: Expression;
    consequent: Statement;
    alternate?: Statement;
}

export interface SwitchStatement extends BaseNode {
    type: 'SwitchStatement';
    discriminant: Expression;
    cases: SwitchCase[];
}

export interface SwitchCase extends BaseNode {
    type: 'SwitchCase';
    test: Expression | null; // null for default case
    consequent: Statement[];
}

export interface ForStatement extends BaseNode {
    type: 'ForStatement';
    init?: VariableDeclaration | Expression;
    test?: Expression;
    update?: Expression;
    body: Statement;
}

export interface ForOfStatement extends BaseNode {
    type: 'ForOfStatement';
    left: VariableDeclaration | Pattern;
    right: Expression;
    body: Statement;
    await?: boolean;
}

export interface ForInStatement extends BaseNode {
    type: 'ForInStatement';
    left: VariableDeclaration | Pattern;
    right: Expression;
    body: Statement;
}

export interface WhileStatement extends BaseNode {
    type: 'WhileStatement';
    test: Expression;
    body: Statement;
}

export interface DoWhileStatement extends BaseNode {
    type: 'DoWhileStatement';
    test: Expression;
    body: Statement;
}

export interface ReturnStatement extends BaseNode {
    type: 'ReturnStatement';
    argument?: Expression;
}

export interface BreakStatement extends BaseNode {
    type: 'BreakStatement';
    label?: Identifier;
}

export interface ContinueStatement extends BaseNode {
    type: 'ContinueStatement';
    label?: Identifier;
}

export interface ThrowStatement extends BaseNode {
    type: 'ThrowStatement';
    argument: Expression;
}

export interface TryStatement extends BaseNode {
    type: 'TryStatement';
    block: BlockStatement;
    handler?: CatchClause;
    finalizer?: BlockStatement;
}

export interface CatchClause extends BaseNode {
    type: 'CatchClause';
    param?: Pattern;
    body: BlockStatement;
}

export interface EmptyStatement extends BaseNode {
    type: 'EmptyStatement';
}

export interface ExpressionStatement extends BaseNode {
    type: 'ExpressionStatement';
    expression: Expression;
}

// ============================================================================
// Expressions
// ============================================================================

export type Expression =
    | Identifier
    | Literal
    | ThisExpression
    | SuperExpression
    | ArrayExpression
    | ObjectExpression
    | FunctionExpression
    | ArrowFunctionExpression
    | UnaryExpression
    | UpdateExpression
    | BinaryExpression
    | AssignmentExpression
    | LogicalExpression
    | MemberExpression
    | ConditionalExpression
    | CallExpression
    | NewExpression
    | SequenceExpression
    | TemplateLiteral
    | TaggedTemplateExpression
    | SpreadElement
    | AwaitExpression
    | AsExpression;

export interface Identifier extends BaseNode {
    type: 'Identifier';
    name: string;
}

export type Literal =
    | StringLiteral
    | NumericLiteral
    | BooleanLiteral
    | NullLiteral
    | RegExpLiteral;

export interface StringLiteral extends BaseNode {
    type: 'StringLiteral';
    value: string;
    raw: string;
}

export interface NumericLiteral extends BaseNode {
    type: 'NumericLiteral';
    value: number;
    raw: string;
}

export interface BooleanLiteral extends BaseNode {
    type: 'BooleanLiteral';
    value: boolean;
}

export interface NullLiteral extends BaseNode {
    type: 'NullLiteral';
}

export interface RegExpLiteral extends BaseNode {
    type: 'RegExpLiteral';
    pattern: string;
    flags: string;
}

export interface ThisExpression extends BaseNode {
    type: 'ThisExpression';
}

export interface SuperExpression extends BaseNode {
    type: 'SuperExpression';
}

export interface ArrayExpression extends BaseNode {
    type: 'ArrayExpression';
    elements: (Expression | SpreadElement | null)[];
}

export interface ObjectExpression extends BaseNode {
    type: 'ObjectExpression';
    properties: (ObjectProperty | SpreadElement)[];
}

export interface ObjectProperty extends BaseNode {
    type: 'ObjectProperty';
    key: Expression;
    value: Expression;
    computed?: boolean;
    shorthand?: boolean;
    method?: boolean;
}

export interface FunctionExpression extends BaseNode {
    type: 'FunctionExpression';
    id?: Identifier;
    params: Parameter[];
    body: BlockStatement;
    returnType?: TypeAnnotation;
    async?: boolean;
    generator?: boolean;
}

export interface ArrowFunctionExpression extends BaseNode {
    type: 'ArrowFunctionExpression';
    params: Parameter[];
    body: Expression | BlockStatement;
    returnType?: TypeAnnotation;
    async?: boolean;
}

export interface UnaryExpression extends BaseNode {
    type: 'UnaryExpression';
    operator: '+' | '-' | '!' | '~' | 'typeof' | 'void' | 'delete';
    argument: Expression;
    prefix: boolean;
}

export interface UpdateExpression extends BaseNode {
    type: 'UpdateExpression';
    operator: '++' | '--';
    argument: Expression;
    prefix: boolean;
}

export interface BinaryExpression extends BaseNode {
    type: 'BinaryExpression';
    operator: string;
    left: Expression;
    right: Expression;
}

export interface AssignmentExpression extends BaseNode {
    type: 'AssignmentExpression';
    operator: string;
    left: Pattern | MemberExpression;
    right: Expression;
}

export interface LogicalExpression extends BaseNode {
    type: 'LogicalExpression';
    operator: '||' | '&&' | '??';
    left: Expression;
    right: Expression;
}

export interface MemberExpression extends BaseNode {
    type: 'MemberExpression';
    object: Expression;
    property: Expression;
    computed: boolean;
    optional?: boolean;
}

export interface ConditionalExpression extends BaseNode {
    type: 'ConditionalExpression';
    test: Expression;
    consequent: Expression;
    alternate: Expression;
}

export interface CallExpression extends BaseNode {
    type: 'CallExpression';
    callee: Expression;
    arguments: (Expression | SpreadElement)[];
    optional?: boolean;
    typeArguments?: TypeAnnotation[];
}

export interface NewExpression extends BaseNode {
    type: 'NewExpression';
    callee: Expression;
    arguments: (Expression | SpreadElement)[];
    typeArguments?: TypeAnnotation[];
}

export interface SequenceExpression extends BaseNode {
    type: 'SequenceExpression';
    expressions: Expression[];
}

export interface TemplateLiteral extends BaseNode {
    type: 'TemplateLiteral';
    quasis: TemplateElement[];
    expressions: Expression[];
}

export interface TemplateElement extends BaseNode {
    type: 'TemplateElement';
    value: {
        raw: string;
        cooked: string;
    };
    tail: boolean;
}

export interface TaggedTemplateExpression extends BaseNode {
    type: 'TaggedTemplateExpression';
    tag: Expression;
    quasi: TemplateLiteral;
}

export interface SpreadElement extends BaseNode {
    type: 'SpreadElement';
    argument: Expression;
}

export interface AwaitExpression extends BaseNode {
    type: 'AwaitExpression';
    argument: Expression;
}

export interface AsExpression extends BaseNode {
    type: 'AsExpression';
    expression: Expression;
    typeAnnotation: TypeAnnotation;
}

// ============================================================================
// Patterns
// ============================================================================

export type Pattern =
    | Identifier
    | ObjectPattern
    | ArrayPattern
    | RestElement
    | AssignmentPattern;

export interface ObjectPattern extends BaseNode {
    type: 'ObjectPattern';
    properties: (ObjectPatternProperty | RestElement)[];
}

export interface ObjectPatternProperty extends BaseNode {
    type: 'ObjectPatternProperty';
    key: Identifier | StringLiteral;
    value: Pattern;
    computed?: boolean;
    shorthand?: boolean;
}

export interface ArrayPattern extends BaseNode {
    type: 'ArrayPattern';
    elements: (Pattern | null)[];
}

export interface RestElement extends BaseNode {
    type: 'RestElement';
    argument: Pattern;
}

export interface AssignmentPattern extends BaseNode {
    type: 'AssignmentPattern';
    left: Pattern;
    right: Expression;
}

// ============================================================================
// Declaration (union type)
// ============================================================================

export type Declaration =
    | VariableDeclaration
    | FunctionDeclaration
    | ClassDeclaration
    | StructDeclaration
    | InterfaceDeclaration
    | TypeAliasDeclaration
    | EnumDeclaration;

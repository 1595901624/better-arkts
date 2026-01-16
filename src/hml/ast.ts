export type HmlNode = HmlDocument | HmlElement | HmlText | HmlComment | HmlInterpolation;

export interface SourceLocation {
    start: number;
    end: number;
    line: number;
    column: number;
}

export interface HmlDocument {
    type: 'Document';
    children: HmlNode[];
}

export interface HmlElement {
    type: 'Element';
    tagName: string;
    attributes: HmlAttribute[];
    children: HmlNode[];
    selfClosing: boolean;
}

export interface HmlAttribute {
    name: string;
    value?: HmlAttributeValue;
    valueKind: 'string' | 'expression' | 'boolean' | 'unquoted';
}

export interface HmlAttributeValue {
    value: string;
    quote?: '"' | "'";
    expression?: ExprNode;
}

export interface HmlText {
    type: 'Text';
    value: string;
}

export interface HmlComment {
    type: 'Comment';
    value: string;
}

export interface HmlInterpolation {
    type: 'Interpolation';
    expression: ExprNode;
}

export type ExprNode =
    | ExprIdentifier
    | ExprLiteral
    | ExprUnary
    | ExprBinary
    | ExprLogical
    | ExprConditional
    | ExprAssignment
    | ExprMember
    | ExprCall
    | ExprArray
    | ExprObject
    | ExprProperty
    | ExprGrouping;

export interface ExprIdentifier {
    type: 'Identifier';
    name: string;
}

export interface ExprLiteral {
    type: 'Literal';
    value: string | number | boolean | null;
    raw: string;
}

export interface ExprUnary {
    type: 'UnaryExpression';
    operator: string;
    argument: ExprNode;
}

export interface ExprBinary {
    type: 'BinaryExpression';
    operator: string;
    left: ExprNode;
    right: ExprNode;
}

export interface ExprLogical {
    type: 'LogicalExpression';
    operator: string;
    left: ExprNode;
    right: ExprNode;
}

export interface ExprConditional {
    type: 'ConditionalExpression';
    test: ExprNode;
    consequent: ExprNode;
    alternate: ExprNode;
}

export interface ExprAssignment {
    type: 'AssignmentExpression';
    operator: string;
    left: ExprNode;
    right: ExprNode;
}

export interface ExprMember {
    type: 'MemberExpression';
    object: ExprNode;
    property: ExprNode;
    computed: boolean;
}

export interface ExprCall {
    type: 'CallExpression';
    callee: ExprNode;
    arguments: ExprNode[];
}

export interface ExprArray {
    type: 'ArrayExpression';
    elements: ExprNode[];
}

export interface ExprObject {
    type: 'ObjectExpression';
    properties: ExprProperty[];
}

export interface ExprProperty {
    type: 'Property';
    key: ExprNode;
    value: ExprNode;
    shorthand: boolean;
}

export interface ExprGrouping {
    type: 'GroupingExpression';
    expression: ExprNode;
}

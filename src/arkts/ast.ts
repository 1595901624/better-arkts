export interface SourceLocation {
    start: number;
    end: number;
    line: number;
    column: number;
}

export type ArkTSNode =
    | ArkTSDocument
    | ArkTSImport
    | ArkTSExport
    | ArkTSDecorator
    | ArkTSStruct
    | ArkTSClass
    | ArkTSInterface
    | ArkTSFunction
    | ArkTSMethod
    | ArkTSProperty
    | ArkTSParameter
    | ArkTSBuildMethod
    | ArkTSUIComponent
    | ArkTSUIAttribute
    | ArkTSBlock
    | ArkTSStatement
    | ArkTSExpression
    | ArkTSComment
    | ArkTSTypeAnnotation;

export interface ArkTSDocument {
    type: 'Document';
    children: ArkTSNode[];
    imports: ArkTSImport[];
    exports: ArkTSExport[];
    structs: ArkTSStruct[];
    classes: ArkTSClass[];
    interfaces: ArkTSInterface[];
    functions: ArkTSFunction[];
}

export interface ArkTSImport {
    type: 'Import';
    raw: string;
    defaultImport?: string;
    namedImports?: string[];
    namespaceImport?: string;
    source: string;
    location?: SourceLocation;
}

export interface ArkTSExport {
    type: 'Export';
    raw: string;
    isDefault: boolean;
    declaration?: ArkTSNode;
    location?: SourceLocation;
}

export interface ArkTSDecorator {
    type: 'Decorator';
    name: string;
    arguments?: string;
    location?: SourceLocation;
}

export interface ArkTSStruct {
    type: 'Struct';
    name: string;
    decorators: ArkTSDecorator[];
    members: (ArkTSProperty | ArkTSMethod | ArkTSBuildMethod)[];
    extends?: string;
    implements?: string[];
    location?: SourceLocation;
}

export interface ArkTSClass {
    type: 'Class';
    name: string;
    decorators: ArkTSDecorator[];
    members: (ArkTSProperty | ArkTSMethod)[];
    extends?: string;
    implements?: string[];
    isAbstract: boolean;
    location?: SourceLocation;
}

export interface ArkTSInterface {
    type: 'Interface';
    name: string;
    members: (ArkTSProperty | ArkTSMethod)[];
    extends?: string[];
    location?: SourceLocation;
}

export interface ArkTSFunction {
    type: 'Function';
    name: string;
    decorators: ArkTSDecorator[];
    parameters: ArkTSParameter[];
    returnType?: string;
    body?: string;
    isAsync: boolean;
    isGenerator: boolean;
    location?: SourceLocation;
}

export interface ArkTSMethod {
    type: 'Method';
    name: string;
    decorators: ArkTSDecorator[];
    parameters: ArkTSParameter[];
    returnType?: string;
    body?: string;
    visibility?: 'public' | 'private' | 'protected';
    isStatic: boolean;
    isAsync: boolean;
    isAbstract: boolean;
    location?: SourceLocation;
}

export interface ArkTSProperty {
    type: 'Property';
    name: string;
    decorators: ArkTSDecorator[];
    propertyType?: string;
    initializer?: string;
    visibility?: 'public' | 'private' | 'protected';
    isStatic: boolean;
    isReadonly: boolean;
    location?: SourceLocation;
}

export interface ArkTSParameter {
    type: 'Parameter';
    name: string;
    parameterType?: string;
    defaultValue?: string;
    isOptional: boolean;
    isRest: boolean;
    decorators: ArkTSDecorator[];
}

export interface ArkTSBuildMethod {
    type: 'BuildMethod';
    decorators: ArkTSDecorator[];
    body: ArkTSUIComponent[];
    rawBody: string;
    location?: SourceLocation;
}

export interface ArkTSUIComponent {
    type: 'UIComponent';
    name: string;
    arguments?: string;
    attributes: ArkTSUIAttribute[];
    children: ArkTSUIComponent[];
    isConditional: boolean;
    condition?: string;
    isLoop: boolean;
    loopExpression?: string;
    location?: SourceLocation;
}

export interface ArkTSUIAttribute {
    type: 'UIAttribute';
    name: string;
    arguments: string;
    location?: SourceLocation;
}

export interface ArkTSBlock {
    type: 'Block';
    statements: ArkTSStatement[];
    raw: string;
    location?: SourceLocation;
}

export interface ArkTSStatement {
    type: 'Statement';
    kind: 'variable' | 'expression' | 'if' | 'for' | 'while' | 'return' | 'throw' | 'try' | 'switch' | 'break' | 'continue' | 'other';
    raw: string;
    location?: SourceLocation;
}

export interface ArkTSExpression {
    type: 'Expression';
    raw: string;
    location?: SourceLocation;
}

export interface ArkTSComment {
    type: 'Comment';
    value: string;
    isBlock: boolean;
    isDoc: boolean;
    location?: SourceLocation;
}

export interface ArkTSTypeAnnotation {
    type: 'TypeAnnotation';
    raw: string;
    location?: SourceLocation;
}

export const ARKTS_DECORATORS = new Set([
    'Entry',
    'Component',
    'CustomDialog',
    'Preview',
    'State',
    'Prop',
    'Link',
    'Provide',
    'Consume',
    'ObjectLink',
    'StorageProp',
    'StorageLink',
    'LocalStorageProp',
    'LocalStorageLink',
    'Watch',
    'Observed',
    'Track',
    'Builder',
    'BuilderParam',
    'LocalBuilder',
    'Extend',
    'Styles',
    'Concurrent',
    'Sendable',
    'Reusable',
    'Require',
    'Once',
    'Trace',
    'Type',
    'AnimatableExtend',
    'ObservedV2',
    'Local',
    'Param',
    'Event',
    'Provider',
    'Consumer',
    'Computed',
    'Monitor',
    'ComponentV2'
]);

export const ARKTS_UI_COMPONENTS = new Set([
    'Column',
    'Row',
    'Stack',
    'Flex',
    'RelativeContainer',
    'Grid',
    'GridItem',
    'GridRow',
    'GridCol',
    'List',
    'ListItem',
    'ListItemGroup',
    'Swiper',
    'Tabs',
    'TabContent',
    'Navigation',
    'NavRouter',
    'NavDestination',
    'Stepper',
    'StepperItem',
    'Scroll',
    'WaterFlow',
    'FlowItem',
    'Text',
    'Span',
    'Button',
    'Image',
    'TextInput',
    'TextArea',
    'Search',
    'Toggle',
    'Checkbox',
    'CheckboxGroup',
    'Radio',
    'Rating',
    'Select',
    'Slider',
    'Counter',
    'DatePicker',
    'TimePicker',
    'TextPicker',
    'CalendarPicker',
    'Progress',
    'LoadingProgress',
    'Marquee',
    'Gauge',
    'DataPanel',
    'QRCode',
    'Badge',
    'Blank',
    'Divider',
    'Menu',
    'MenuItem',
    'MenuItemGroup',
    'ContextMenu',
    'AlertDialog',
    'ActionSheet',
    'CustomDialog',
    'Popup',
    'Panel',
    'SideBarContainer',
    'Refresh',
    'Web',
    'RichText',
    'RichEditor',
    'Video',
    'XComponent',
    'Canvas',
    'Circle',
    'Ellipse',
    'Line',
    'Path',
    'Polygon',
    'Polyline',
    'Rect',
    'Shape',
    'ImageAnimator',
    'PatternLock',
    'PluginComponent',
    'RemoteWindow',
    'FormComponent',
    'Hyperlink',
    'ImageSpan',
    'ContainerSpan',
    'SymbolSpan',
    'SymbolGlyph',
    'FormLink',
    'RowSplit',
    'ColumnSplit',
    'FolderStack',
    'NodeContainer',
    'MediaCachedImage',
    'AbilityComponent',
    'EmbeddedComponent',
    'UIExtensionComponent',
    'IsolatedComponent',
    'Component3D',
    'Scene',
    'ArcSwiper',
    'ScrollBar',
    'AlphabetIndexer',
    'LazyForEach',
    'ForEach',
    'If',
    'Repeat'
]);

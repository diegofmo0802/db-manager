import { schemaError } from '../Error.js';
import JSONSchema from './JSONSchema.js';

export class Schema<S extends Schema.Schema> {
    constructor(
        public readonly schema: S
    ) {}
    public get infer(): Schema.Infer.schema<this['schema']> {
        return {} as Schema.Infer.schema<this['schema']>;
    }
    public get jsonSchema(): JSONSchema.schema {
        return this.toJsonSchema();
    }
    public get jsonSchemaJSON(): string {
        return JSON.stringify(this.jsonSchema);
    }
    public get uniques(): string[] {
        return this.listUniques();
    }
    /**
     * generate an object with the doc data and verify is is valid
     * @param doc the object to verify
     * @returns the object with the data
     * @throws schemaError if the object is not valid
    */
    public generateValidData(doc: Schema.Infer.schema<this['schema']>, partial: boolean = false): Schema.Infer.schema<this['schema']> {
        const data: any = {};
        const iterable = partial ? doc : this.schema;
        for (const key in iterable) {
            const prop = this.schema[key];
            const value = this.isKeyOfSchema(doc, key) ? doc[key] : undefined;
            data[key] = this.propertyData(value, prop, key);
            if (data[key] === undefined) delete data[key];
        }
        console.log(data);
        return data;
    }
    /**
     * verify and return the data
     * @param value the value to verify
     * @param prop the property to verify
     * @param key the key of the property
     * @returns the data
     * @throws schemaError if the data is not valid
    */
    protected propertyData(value: any, prop: Schema.property, key: string, partial: boolean = false): any {
        if (value === undefined || value === null) {
            if ('default' in prop) return prop.default;
            if (prop.nullable && prop.nullable === true) return null;
            if (prop.required && prop.required === true) throw new schemaError(`Property ${key} is required but not provided`);
        }
        switch (prop.type) {
            case 'string':
                this.validateString(value, prop, key);
                return value;
            case 'number':
                this.validateNumber(value, prop, key);
                return value;
            case 'boolean': return value;
            case 'object': return this.objectData(value, prop, key, partial);
            case 'array': return this.arrayData(value, prop, key);
            default: throw new schemaError(`Unknown type in property ${key}`);
        }
    }
    /**
     * validate a string
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
     */
    protected validateString(value: string, prop: Schema.Property.String, key: string) {
        if (!value) return;
        if (prop.minLength !== undefined && value.length < prop.minLength) {
            throw new schemaError(`Property ${key} must have a minimum length of ${prop.minLength}`);
        }
        if (prop.maxLength !== undefined && value.length > prop.maxLength) {
            throw new schemaError(`Property ${key} must have a maximum length of ${prop.maxLength}`);
        }
        if (prop.pattern !== undefined && !prop.pattern.test(value)) {
            throw new schemaError(`Property ${key} must match the pattern ${prop.pattern}`);
        }
    }
    /**
     * validate a number
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
     */
    protected validateNumber(value: number, prop: Schema.Property.Number, key: string) {
        if (!value) return;
        if (prop.minimum !== undefined && value < prop.minimum) {
            throw new schemaError(`Property ${key} must be greater than or equal to ${prop.minimum}`);
        }
        if (prop.maximum !== undefined && value > prop.maximum) {
            throw new schemaError(`Property ${key} must be less than or equal to ${prop.maximum}`);
        }
    }
    /**
     * validate a object
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @returns the data
     * @throws schemaError if the data is not valid
     */
    protected objectData(value: any, prop: Schema.Property.Object, key: string, partial: boolean): any {
        const handler = new Schema(prop.schema);
        return handler.generateValidData(value, partial);
    }
    /**
     * validate a array
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @returns the data
     * @throws schemaError if the data is not valid
     */
    protected arrayData(value: any, prop: Schema.Property.Array, key: string): any {
        if (!value) return value;
        if (!Array.isArray(value)) throw new schemaError(`Value for key "${key}" must be an array`);
        if (prop.minimum !== undefined && value.length < prop.minimum) {
            throw new schemaError(`Array ${key} must have at least ${prop.minimum} items`);
        }
        if (prop.maximum !== undefined && value.length > prop.maximum) {
            throw new schemaError(`Array ${key} must have at most ${prop.maximum} items`);
        }
        return value.map((item, index) => 
            this.propertyData(item, prop.property, `${key}[${index}]`)
        );
    }
    protected listUniques(doc?: Schema.Schema, parentKey?: string): string[] {
        const uniques: string[] = [];
        if (!doc) doc = this.schema;
        for (const key in doc) {
            const prop = doc[key];
            if (prop.unique) uniques.push(parentKey ? `${parentKey}.${key}` : key);
            if (prop.type === 'object') {
                uniques.push(...this.listUniques(prop.schema, parentKey ? `${parentKey}.${key}` : key));
            }
        }
        return uniques;
    }
    /**
     * convert a schema to a JSON schema
     * @param schema the schema to convert
     * @returns the JSON schema
    */
    protected toJsonSchema(schema?: Schema.Schema): JSONSchema.schema {
        if (!schema) schema = this.schema;
        const sch: JSONSchema.schema = {};
        sch.type = 'object';
        sch.properties = {};
        sch.required = [];
        for (const key in schema) {
            const prop = schema[key];
            let subSch: JSONSchema.schema = {};
            subSch.type = prop.nullable ? [prop.type, 'null'] : prop.type;
            if (prop.required) sch.required.push(key);
            switch (prop.type) {
                case 'string': {
                    if (prop.minLength !== undefined) subSch.minLength = prop.minLength;
                    if (prop.maxLength !== undefined) subSch.maxLength = prop.maxLength;
                    break;
                }
                case 'boolean': break;
                case 'number':
                case 'array': {
                    if (prop.minimum !== undefined) subSch.minimum = prop.minimum;
                    if (prop.maximum !== undefined) subSch.maximum = prop.maximum;
                    break;
                }    
                case 'object': {
                    subSch = this.toJsonSchema(prop.schema);
                    break;
                }
            }    
            sch.properties[key] = subSch;
        }
        return sch;
    }
    /**
     * -- TYPE GUARD --
     * verify if the key is in the schema
     * @param doc the object to verify
     * @param key the key to verify
     * @returns true if the key is in the schema
     */
    private isKeyOfSchema(
        doc: Schema.Infer.schema<this['schema']>, 
        key: keyof this['schema']
    ): key is keyof typeof doc {
        return key in doc;
    }
}

export namespace Schema {
    export interface Document {
        [Key: string]: any;
    }
    export interface TypeMap<Doc extends Document = Document> {
        string: string;
        number: number;
        boolean: boolean;
        object: Doc;
        array: Doc[];
    }
    export namespace Property {
        interface Base<T extends keyof TypeMap, Doc extends Document = Document> {
            type: T;
            required?: boolean;
            nullable?: boolean;
            unique?: boolean;
            default?: TypeMap<Doc>[T] | null;
        }
        export interface String extends Base<'string'> {
            pattern?: RegExp;
            minLength?: number;
            maxLength?: number;
        }
        export interface Number extends Base<'number'> {
            minimum?: number;
            maximum?: number;
        }
        export interface Boolean extends Base<'boolean'> {}
        export interface Object<Doc extends Document = Document> extends Base<'object'> {
            schema: Schema<Doc>;
        }
        export interface Array<Doc extends Document = Document> extends Base<'array'> {
            property: property<Doc>;
            minimum?: number;
            maximum?: number;
        }
        export interface Map<Doc extends Document = Document> {
            string: String;
            number: Number;
            boolean: Boolean;
            object: Object<Doc>;
            array: Array<Doc>;
        }
    }
    export type property<Doc extends Document = Document> = Property.Map<Doc>[keyof Property.Map];
    export interface Schema<Doc extends Document = Document> {
        [Key: string]: property<Doc>;
    }
    export namespace Infer {
        export type propertyType<P extends Schema.property> = (
            P extends Property.String  ? string  :
            P extends Property.Number  ? number  :
            P extends Property.Boolean ? boolean :
            P extends Property.Object  ? schema<P['schema']> :
            P extends Property.Array   ? propertyType<P['property']>[] :
            never
        );
        export type property<P extends Schema.property> = (
            P['required'] extends true ?
                propertyType<P> :
            undefined extends P['default'] ?
                undefined extends P['nullable'] ?
                    propertyType<P> | undefined :
                    P['nullable'] extends true ?
                        propertyType<P> | null :
                        propertyType<P>
                : P['default'] extends null ?
                    propertyType<P> | null :
                    propertyType<P>
        );
        export type schema<S extends Schema> = {
            [K in keyof S as S[K]['required'] extends true ? K : never]: property<S[K]>
        } & {
            [K in keyof S as S[K]['required'] extends true ? never : K]?: property<S[K]>
        };
        export type schemaBase<S extends Schema> = {
            [K in keyof S]: property<S[K]>
        };
    }
}

export default Schema;
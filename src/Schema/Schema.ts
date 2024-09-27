import { Utilities } from 'saml.servercore';
import { schemaError } from '../Error.js';
import JSONSchema from './JSONSchema.js';

export class Schema<S extends Schema.Schema> {
    constructor(
        public readonly schema: S
    ) {
        this.validateStructure();
    }
    /**
     * Validates the overall structure of the schema.
     * @param schema Optional partial schema to validate, defaults to the full schema.
     * @param parentKey The key path to the current schema, used for error reporting.
     */
    protected validateStructure(schema?: Schema.Schema, parentKey?: string) {
        const useSchema = schema ?? this.schema;
        for (const key in useSchema) {
            const prop = useSchema[key];
            this.validateProperty(prop, parentKey ? `${parentKey}.${key}` : key);
        }
    }
    /**
     * Validates a single property within the schema.
     * @param prop The property to validate.
     * @param key The key of the property, used for error reporting.
     */
    protected validateProperty(prop: Schema.property, key: string): void {
        switch(prop.type) {
            case 'string': this.validateStringProperty(prop, key); break;
            case 'number': this.validateNumberProperty(prop, key); break;
            case 'boolean': break;
            case 'array': this.validateArrayProperty(prop, key); break;
            case 'object': this.validateObjectProperty(prop, key); break;
            default: throw new schemaError(`Unknown type for property '${key}'`);
        }
        if ('default' in prop) this.validateDefaultValue(prop, key);
    }
    /**
     * Validates the default value of a property.
     * @param prop The property to validate.
     * @param key The key of the property, used for error reporting.
    */
    protected validateDefaultValue(prop: Schema.property, key: string) {
        if (prop.default === undefined) {
            if (!prop.required) return;
            throw new schemaError(`Property '${key}' default value cannot be undefined`)
        }
        if (prop.default === null) {
            if (prop.nullable) return;
            throw new schemaError(`Property '${key}' default value cannot be null`);
        }
        switch (prop.type) {
            case 'string': this.validateString(prop.default, prop, key); break;
            case 'number': this.validateNumber(prop.default, prop, key); break;
            case 'boolean': this.validateBoolean(prop.default, prop, key); break;
            case 'array': this.validateArray(prop.default, prop, key); break;
            case 'object': this.validateObject(prop.default, prop, key); break;
            default: throw new schemaError(`Unknown type for property '${key}'`);
        }
    }
    /**
     * Validates a string property.
     * @param prop The string property definition.
     * @param key The key of the property, used for error reporting.
     */
    protected validateStringProperty(prop: Schema.Property.String, key: string): void {
        if (prop.maxLength !== undefined && prop.minLength !== undefined && prop.maxLength < prop.minLength) {
            throw new schemaError(`Property '${key}' maxLength must be greater than or equal to minLength`);
        }
        if (prop.pattern !== undefined && !(prop.pattern instanceof RegExp)) {
            throw new schemaError(`Property '${key}' pattern must be a RegExp`);
        }
    }
    /**
     * Validates a number property.
     * @param prop The number property definition.
     * @param key The key of the property, used for error reporting.
     */
    protected validateNumberProperty(prop: Schema.Property.Number, key: string): void {
        if (prop.maximum !== undefined && prop.minimum !== undefined && prop.maximum < prop.minimum) {
            throw new schemaError(`Property '${key}' maximum must be greater than or equal to minimum`);
        }
    }
    /**
     * Validates an array property.
     * @param prop The array property definition.
     * @param key The key of the property, used for error reporting.
     */
    private validateArrayProperty(prop: Schema.Property.Array, key: string): void {
        if (prop.maximum !== undefined && prop.minimum !== undefined && prop.maximum < prop.minimum) {
            throw new schemaError(`Property '${key}' maximum must be greater than or equal to minimum`);
        }
        this.validateProperty(prop.property, `${key}[]`);
    }
    /**
     * Validates an object property.
     * @param prop The object property definition.
     * @param key The key of the property, used for error reporting.
     */
    private validateObjectProperty(prop: Schema.Property.Object, key: string): void {
        this.validateStructure(prop.schema, key);
    }
    /**
     * get the infered schema as an object
     * is only to be used for testing purposes
     * @returns the infered schema
     */
    public get infer(): Schema.Infer<this['schema']> {
        return {} as Schema.Infer<this['schema']>;
    }
    /**
     * get the json schema as an object
     * @returns the json schema
     */
    public get jsonSchema(): JSONSchema.schema {
        return this.toJsonSchema();
    }
    /**
     * get the json schema as a JSON string
     * @returns the json schema as a string
     */
    public get jsonSchemaJSON(): string {
        return JSON.stringify(this.jsonSchema);
    }
    /**
     * get the list of unique keys
     * @returns the list of unique keys
     */
    public get uniques(): string[] {
        return this.listUniques();
    }
    /**
     * process the provided data
     * @param data the data to process
     * @param partial if the data is partial
     * @returns the processed data
     * @throws schemaError if the data is not valid
     */
    public processData(data: Schema.Infer<this['schema']>, partial: boolean = false): Schema.Infer<this['schema']> {
        const result: any = {};
        const iterable = partial ? data : this.schema;
        for (const key in iterable) {
            const prop = this.schema[key];
            const value = this.isKeyOf(data, key) ? data[key] : undefined;
            result[key] = this.processProperty(value, prop, key, partial);
            if (result[key] === undefined) delete result[key];
        }
        return result;
    }
    public processPartialData(
        data: Partial<Schema.Flatten<this['schema']>> & Partial<Schema.Infer<this['schema']>> & Schema.Document,
    ): Partial<Schema.Flatten<this['schema']>> & Partial<Schema.Infer<this['schema']>> & Schema.Document {
        const result: any = {};
        let currentProp: Schema.property;
        for (const key in data) {
            const value = this.isKeyOf(data, key) ? data[key] : undefined;
            const subKeys = key.split('.');
            const firstKey = subKeys.shift();
            if (!firstKey || !(firstKey in this.schema)) throw new schemaError(`Unknown property ${firstKey}`);
            currentProp = this.schema[firstKey];
            if (subKeys.length === 0) {
                result[key] = this.processProperty(value, currentProp, key);
            } else {
                if (currentProp.type !== 'object') throw new schemaError(`Property ${key} is not an object`);
                let objectProp = currentProp;
                let usedKeys: string[] = []
                subKeys.forEach((subKey) => { usedKeys.push(subKey);
                    if (!(subKey in objectProp.schema)) throw new schemaError(`Unknown property ${firstKey}.${usedKeys.join('.')}`);
                    currentProp = objectProp.schema[subKey];
                });
                result[key] = this.processProperty(value, currentProp, key);
            }
            if (result[key] === undefined) delete result[key];
        }
        return result;
    }
    /**
     * process a property
     * @param data the data to process
     * @param prop the property to process
     * @param key the key of the property
     * @param partial if the data is partial
     * @returns the processed data
     * @throws schemaError if the data is not valid
     */
    protected processProperty(data: any, prop: Schema.property, key: string, partial: boolean = false): any {
        if (data === undefined || data === null) {
            if ('default' in prop) return prop.default;
            if (prop.nullable && prop.nullable === true) return null;
            if (prop.required && prop.required === true) throw new schemaError(`Property ${key} is required but not provided`);
            else return undefined;
        }
        switch (prop.type) {
            case 'string': this.validateString(data, prop, key); return data;
            case 'number': this.validateNumber(data, prop, key); return data;
            case 'boolean': this.validateBoolean(data, prop, key); return data;
            case 'array': this.validateArray(data, prop, key); return this.processArray(data, prop, key);
            case 'object': this.validateObject(data, prop, key, partial); return this.processObject(data, prop, key, partial);
            default: throw new schemaError(`Unknown type in property ${key}`);
        }
    }
    /**
     * validate a array
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @returns the data
     * @throws schemaError if the data is not valid
     */
    protected processArray(value: any[], prop: Schema.Property.Array, key: string): any {
        try {
            return value.map((item, index) =>  this.processProperty(item, prop.property, `${key}[${index}]`));
        } catch (error) {
            throw new schemaError(`Property ${key} is not valid: ${error}`);
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
    protected processObject(value: any, prop: Schema.Property.Object, key: string, partial: boolean = false): any {
        const handler = new Schema(prop.schema);
        try {
            return handler.processData(value, partial);
        } catch (error) {
            throw new schemaError(`Property ${key} is not valid: ${error}`);
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
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'string') throw new schemaError(`Property ${key} must be a string`);
        if (prop.minLength && value.length < prop.minLength) {
            throw new schemaError(`Property ${key} must have a minimum length of ${prop.minLength}`);
        }
        if (prop.maxLength && value.length > prop.maxLength) {
            throw new schemaError(`Property ${key} must have a maximum length of ${prop.maxLength}`);
        }
        if (prop.pattern && !prop.pattern.test(value)) {
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
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'number') throw new schemaError(`Property ${key} must be a number`);
        if (prop.minimum && value < prop.minimum) {
            throw new schemaError(`Property ${key} must be greater than or equal to ${prop.minimum}`);
        }
        if (prop.maximum && value > prop.maximum) {
            throw new schemaError(`Property ${key} must be less than or equal to ${prop.maximum}`);
        }
    }
    /**
     * validate a boolean
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
     */
    protected validateBoolean(value: boolean, prop: Schema.Property.Boolean, key: string) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'boolean') throw new schemaError(`Property ${key} must be a boolean`);
    }
    /**
     * validate a object
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
    */
    protected validateObject(value: any, prop: Schema.Property.Object, key: string, pattial = true) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'object') throw new schemaError(`Property ${key} must be an object`);
        this.validateStructure(prop.schema, key);
    }
    /**
     * validate a array
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
     */
    protected validateArray(value: any, prop: Schema.Property.Array, key: string) {
        if (value == null && prop.nullable === true) return;
        console.log(value, prop);
        if (!Array.isArray(value)) throw new schemaError(`Property ${key} must be an array`);
        if (prop.minimum && value.length < prop.minimum) {
            throw new schemaError(`Property ${key} must have at least ${prop.minimum} items`);
        }
        if (prop.maximum && value.length > prop.maximum) {
            throw new schemaError(`Property ${key} must have at most ${prop.maximum} items`);
        }
        value.forEach((item, index) => {
            this.processProperty(item, prop.property, `${key}[${index}]`);
        });
    }
    /**
     * generate a list of unique keys
     * @param doc the schema to validate
     * @param parentKey the parent key of the schema
     * @returns a list of unique keys
    */
    protected listUniques(doc?: Schema.Schema, parentKey?: string): string[] {
        const uniques: string[] = [];
        if (!doc) doc = this.schema;
        for (const key in doc) {
            const prop = doc[key];
            if (key !== '_id' && prop.unique) uniques.push(parentKey ? `${parentKey}.${key}` : key);
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
    private isKeyOf<T extends Object>(
        doc: T,
        key: any
    ): key is keyof T { return key in doc; }
}

export namespace Schema {
    export type Infer<S extends Schema> = Schema.Infer.schema<S>;
    export type Flatten<S extends Schema.Schema> = (
        Utilities.Flatten.Object<Infer.schema<S>, 10>
    );
    export interface Document {
        [Key: string]: any;
    }
    export interface TypeMap {
        string: string;
        number: number;
        boolean: boolean;
        object: any;
        array: any[];
    }
    export namespace Property {
        interface Base<T extends keyof TypeMap> {
            type: T;
            required?: boolean;
            nullable?: boolean;
            unique?: boolean;
            default?: TypeMap[T] | null;
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
        export interface Object extends Base<'object'> {
            schema: Schema;
        }
        export interface Array extends Base<'array'> {
            property: property;
            minimum?: number;
            maximum?: number;
        }
        export interface Map {
            string: String;
            number: Number;
            boolean: Boolean;
            object: Object;
            array: Array;
        }
    }
    export type property = Property.Map[keyof Property.Map];
    export interface Schema {
        [Key: string]: property;
    }
    export namespace Infer {
        export type propertyType<P extends Schema.property, Partial extends boolean = false> = (
            P extends Property.String  ? string  :
            P extends Property.Number  ? number  :
            P extends Property.Boolean ? boolean :
            P extends Property.Object  ? (
                Partial extends false
                ? schema<P['schema']>
                : schemaPartial<P['schema']>
            ) :
            P extends Property.Array   ? propertyType<P['property']>[] :
            never
        );
        export type property<P extends Schema.property, Partial extends boolean = false> = (
            P['required'] extends true ?
                propertyType<P, Partial> :
            undefined extends P['default'] ?
                undefined extends P['nullable'] ?
                    propertyType<P, Partial> | undefined :
                    P['nullable'] extends true ?
                        propertyType<P, Partial> | null :
                        propertyType<P, Partial>
                : P['default'] extends null ?
                    propertyType<P, Partial> | null :
                    propertyType<P, Partial>
        );
        export type schema<S extends Schema> = {
            [K in keyof S as S[K]['required'] extends true ? K : never]: property<S[K]>;
        } & {
            [K in keyof S as S[K]['required'] extends true ? never : K]?: property<S[K]>;
        };
        export type schemaPartial<S extends Schema> = {
            [K in keyof S]?: property<S[K], true>;
        };
        export type schemaBase<S extends Schema> = {
            [K in keyof S]: property<S[K]>
        };
    }
}

export default Schema;
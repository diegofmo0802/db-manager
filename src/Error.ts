import { MongoServerError } from 'mongodb';

import JSONSchema from './Schema/JSONSchema.js';

export class NoDBError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NoDBError';
    }
}
export class connectionError extends Error {
    constructor(message: string, cause?: Error) {
        super(message, { cause });
        this.name = 'connectionError';
    }
}
export class operationError extends Error {
    public readonly info?: operationError.info;
    public readonly reason?: string;
    public readonly validationMessages?: string[];
    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = 'operationError';
        if (cause instanceof MongoServerError) {
            this.reason = cause.errmsg;
            this.info = cause.errInfo as operationError.info | undefined;
            if (this.info?.details.operatorName == '$jsonSchema') {
                this.validationMessages = this.generateValidationMessages(this.info.details.schemaRulesNotSatisfied);
            }
        }
    }
    /**
     * Generates an array of validation messages based on the schema rule violations.
     * @param properties The schema rules that were not satisfied.
     * @param parent The parent path of the current property (used for nested properties).
     * @returns An array of formatted validation messages.
     */
    protected generateValidationMessages(properties: operationError.validation.schemaRulesNotSatisfied.rule[], parent?: string): string[] {
        const result: string[] = [];
        properties.forEach(property => { switch(property.operatorName) {
            case 'properties': {
                for (const subProperty of property.propertiesNotSatisfied) {
                    result.push(...this.generateValidationMessages(
                        subProperty.details,
                        `${parent ? parent + '.' : ''}${subProperty.propertyName}`
                    ));
                }
                break;
            }
            case 'maxLength':
            case 'minLength': {
                result.push(`${parent ? parent: ''}: ${property.reason} - ${
                    property.operatorName == 'minLength' ? 'min' : 'max'
                } length: ${
                    property.operatorName == 'minLength' ? property.specifiedAs.minLength : property.specifiedAs.maxLength
                } - ${property.consideredValue}`);
                break;
            }
            case 'type': {
                result.push(`${parent ? parent: ''}: ${property.reason} - type: ${property.specifiedAs.type} - ${property.consideredValue}: ${property.consideredType}`);
                break;
            }
            case 'items': {
                result.push(...this.generateValidationMessages(
                    property.details,
                    `${parent ? parent: ''}[${property.itemIndex}]`
                ));
                break;
            }
            case 'maximum':
            case 'minimum': {
                result.push(`${parent ? parent: ''}: ${property.reason} - ${
                    property.operatorName == 'minimum' ? 'min' : 'max'
                } value: ${
                    property.operatorName == 'minimum' ? property.specifiedAs.minimum : property.specifiedAs.maximum
                } - ${property.consideredValue}`);
                break;
            }
            default: {
                result.push(`${parent ? parent: ''}: ${property.operatorName} - ${property.consideredValue}`);
                break;
            }
        }});
        return result;
    }
}
export class schemaError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'schemaError';
    }
}
export namespace operationError {
    export namespace validation {
        export interface property {
            propertyName: string;
            description: string;
            details: schemaRulesNotSatisfied.rule[];
        }
        export interface item extends property {
            itemIndex: number;
        }
        export namespace schemaRulesNotSatisfied {
            export interface properties {
                operatorName: 'properties';
                propertiesNotSatisfied: property[];
            }
            export interface minLength {
                operatorName: 'minLength';
                specifiedAs: { minLength: number };
                reason: string;
                consideredValue: JSONSchema.schemeTypes;
            }
            export interface maxLength {
                operatorName: 'maxLength';
                specifiedAs: { maxLength: number };
                reason: string;
                consideredValue: JSONSchema.schemeTypes;
            }
            export interface type {
                operatorName: 'type';
                specifiedAs: { type: JSONSchema.schemaNames };
                reason: 'string';
                consideredValue: string;
                consideredType: JSONSchema.schemaNames;
            }
            export interface items {
                operatorName: "items";
                reason: string;
                itemIndex: number,
                details: schemaRulesNotSatisfied.rule[];
            }
            export interface maximum {
                operatorName: 'maximum';
                specifiedAs: { maximum: number };
                reason: string;
                consideredValue: number;
            }
            export interface minimum {
                operatorName: 'minimum';
                specifiedAs: { minimum: number };
                reason: string;
                consideredValue: number;
            }
            export type rule = (
                properties | items | type |
                minLength | maxLength |
                minimum | maximum | {
                    operatorName: 'any';
                    reason: string;
                    consideredValue: JSONSchema.schemeTypes;
                }
            )
        }
        export interface schemaRulesNotSatisfied {
            operatorName: '$jsonSchema';
            schemaRulesNotSatisfied: schemaRulesNotSatisfied.rule[];
        }
    }
    export interface info {
        failingDocumentId: string;
        details: validation.schemaRulesNotSatisfied;
    }
}
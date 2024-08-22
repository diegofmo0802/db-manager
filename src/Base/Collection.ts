import mongodb from 'mongodb';
import { Utilities } from 'saml.servercore';

import Schema from "../Schema/Schema.js";
import { operationError } from '../Error.js';
 
export class Collection<S extends Schema.Schema = Schema.Schema> {
    protected collection: mongodb.Collection<Schema.Infer.schema<S>>;
    public constructor(
        public readonly db : mongodb.Db,
        public readonly name: string,
        public readonly Schema: Schema<S>
    ) {
        this.collection = this.db.collection(this.name);
    }
    
    public get infer(): Schema.Infer.schema<S> {
        return {} as Schema.Infer.schema<S>;
    }
    public async findOne(filter: Collection.filter<S>, options?: mongodb.FindOptions): Promise<Schema.Infer.schema<S> | null> {
        try { return await this.collection.findOne(filter, options); }
        catch (error) {
            throw new operationError('could not find one document: ', error);
        }
    }
    public async insertOne(doc: Schema.Infer.schema<S>, options?: mongodb.InsertOneOptions): Promise<Collection.insertOneResult<S>> {
        const data = this.Schema.processData(doc) as mongodb.OptionalUnlessRequiredId<Schema.Infer.schema<S>>;
        try { return await this.collection.insertOne(data, options); }
        catch (error) {
            throw new operationError('could not insert one document', error);
        }
    }
    public async countDocuments(filter?: Collection.filter<S>, options?: mongodb.CountDocumentsOptions): Promise<number> {
        try { return await this.collection.countDocuments(filter, options); }
        catch (error) {
            throw new operationError('could not count documents', error);
        }
    }
    public async exists(): Promise<boolean> {
        try { return (await this.db.listCollections({ name: this.name }).toArray()).length !== 0; }
        catch (error) {
            throw new operationError('could not check if collection exists', error);
        }
    }
    public async create(): Promise<void> {
        const exist = await this.exists();
        if (exist) throw new operationError('collection already exists');
        try {
            await this.db.createCollection(this.name, {
                validator: { $jsonSchema: this.Schema.jsonSchema }
            });
            await this.collection.createIndexes(this.Schema.uniques.map(unique => {
                const key: mongodb.IndexSpecification = {};
                key[unique] = 1;
                return { key, unique: true };
            }));
        }
        catch (error) {
            throw new operationError('could not create collection', error)
        }
    }
}
export namespace Collection {
    export type filter<S extends Schema.Schema = Schema.Schema> = mongodb.Filter<
        Schema.Infer.schema<S>
        & Utilities.flatten.Object<Schema.Infer.schema<S>>
    >;
    export type insertOneResult<S extends Schema.Schema = Schema.Schema> = mongodb.InsertOneResult<
        Schema.Infer.schema<S>
    >
}
export default Collection;
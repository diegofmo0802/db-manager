import mongodb from 'mongodb';
import { Utilities } from 'saml.servercore';

import Schema from "../Schema/Schema.js";
import { operationError } from '../Error.js';
import DataBase from './DataBase.js';
 
export class Collection<
    Ss extends Record<string, Schema<any>> = Record<string, Schema<any>>,
    S extends Schema.Schema = Schema.Schema
> {
    protected readonly collection: mongodb.Collection<Collection.Infer<S>>;
    protected readonly db: mongodb.Db;
    public constructor(
        public dbManager: DataBase<Ss>,
        public readonly name: string,
        public readonly Schema: Schema<S>
    ) {
        this.db = this.dbManager.db;
        this.collection = this.db.collection(this.name);
    }
    
    public get infer(): Collection.Infer<S> {
        return {} as Collection.Infer<S>;
    }
    public async findOne<Result = Collection.Infer<S>>(filter: Collection.Filter<S> = {}, options?: mongodb.FindOptions): Promise<Result | null> {
        try { return await this.collection.findOne<Result>(filter, options); }
        catch (error) {
            throw new operationError('could not find one document: ', error);
        }
    }
    public async find<Result extends Schema.Document = Collection.Infer<S>>(filter: Collection.Filter<S> = {}, options?: mongodb.FindOptions): Promise<Result[]> {
        try { return await this.collection.find<Result>(filter, options).toArray(); }
        catch (error) {
            throw new operationError('could not find documents: ', error);
        }
    }
    public async insertOne(doc: Collection.Infer<S>, options?: mongodb.InsertOneOptions): Promise<Collection.Insert.Result<S>> {
        const data = this.Schema.processData(doc) as mongodb.OptionalUnlessRequiredId<Collection.Infer<S>>;
        try { return await this.collection.insertOne(data, options); }
        catch (error) {
            throw new operationError('could not insert one document', error);
        }
    }
    public aggregate<Result extends Schema.Document = any>(pipeline: Collection.aggregate.option<Ss, S>[], options?: mongodb.AggregateOptions): Promise<Result[]> {
        try { return this.collection.aggregate<Result>(pipeline, options).toArray(); }
        catch (error) {
            throw new operationError('could not agregate documents', error);
        }
    }
    public insertMany(docs: Collection.Infer<S>[], options?: mongodb.BulkWriteOptions): Promise<Collection.Insert.ManyResult<S>> {
        const data = docs.map(doc => this.Schema.processData(doc) as mongodb.OptionalUnlessRequiredId<Collection.Infer<S>>);
        try { return this.collection.insertMany(data, options); }
        catch (error) {
            throw new operationError('could not insert many documents', error);
        }
    }
    public async updateOne(filter: Collection.Filter<S>, update: Collection.Update.Filter<S>, options?: mongodb.UpdateOptions): Promise<Collection.Update.Result<S>> {
        try { return await this.collection.updateOne(filter, update, options); }
        catch (error) {
            throw new operationError('could not update one document', error);
        }
    }
    public async updateMany(filter: Collection.Filter<S>, update: Collection.Update.Filter<S>, options?: mongodb.UpdateOptions): Promise<Collection.Update.Result<S>> {
        try { return await this.collection.updateMany(filter, update, options); }
        catch (error) {
            throw new operationError('could not update many documents', error);
        }
    }
    public async deleteOne(filter: Collection.Filter<S>, options?: mongodb.DeleteOptions): Promise<mongodb.DeleteResult> {
        try { return await this.collection.deleteOne(filter, options); }
        catch (error) {
            throw new operationError('could not delete one document', error);
        }
    }
    public async deleteMany(filter: Collection.Filter<S>, options?: mongodb.DeleteOptions): Promise<mongodb.DeleteResult> {
        try { return await this.collection.deleteMany(filter, options); }
        catch (error) {
            throw new operationError('could not delete many documents', error);
        }
    }
    public async countDocuments(filter?: Collection.Filter<S>, options?: mongodb.CountDocumentsOptions): Promise<number> {
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
    export type Infer<S extends Schema.Schema> = (
        Schema.Infer.schema<S>
    );
    export type WithID<S extends Schema.Schema> = (
        mongodb.WithId<Infer<S>>
    );
    export type Filter<S extends Schema.Schema> = mongodb.Filter<
        Infer<S>
    > & Partial<Utilities.flatten.Object<Infer<S>>>;
    export namespace aggregate {
        export interface option<
            Ss extends Record<string, Schema<any>>,
            S extends Schema.Schema,
            Destination extends keyof Ss = keyof Ss
        > {
            $match: Filter<Schema.Schema>;
            $lookup: {
                from: Destination;
                localField: keyof Utilities.flatten.Object<Infer<S>>;
                foreignField: keyof Utilities.flatten.Object<Infer<Ss[Destination]['schema']>>;
                as: string;
            };
            $unwind: {
                path: string;
                preserveNullAndEmptyArrays: boolean;
            };
        }
    }
    export namespace Update {
        export type Filter<S extends Schema.Schema> = mongodb.UpdateFilter<
            Infer<S>
        > & Partial<Utilities.flatten.Object<Infer<S>>>;
        export type Result<S extends Schema.Schema> = mongodb.UpdateResult<
            Infer<S>
        >;
    }
    export namespace Insert {
        export type Result<S extends Schema.Schema> = mongodb.InsertOneResult<
            Infer<S>
        >;
        export type ManyResult<S extends Schema.Schema> = mongodb.InsertManyResult<
            Infer<S>
        >;
    }
}
export default Collection;
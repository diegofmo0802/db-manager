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
        public readonly Schema: Schema<S>,
        protected readonly session?: mongodb.ClientSession
    ) {
        this.db = this.dbManager.db;
        this.collection = this.db.collection(this.name);
    }
    public get infer(): Collection.Infer<S> {
        return {} as Collection.Infer<S>;
    }
    public async findOne<Result = Collection.Infer<S>>(filter: Collection.Filter<S> = {}, options: mongodb.FindOptions = {}): Promise<Result | null> {
        if (this.session) options.session = this.session;
        try { return await this.collection.findOne<Result>(filter, options); }
        catch (error) {
            throw new operationError('could not find one document: ', error);
        }
    }
    public async find<Result extends Schema.Document = Collection.Infer<S>>(filter: Collection.Filter<S> = {}, options: mongodb.FindOptions = {}): Promise<Result[]> {
        if (this.session) options.session = this.session;
        try { return await this.collection.find<Result>(filter, options).toArray(); }
        catch (error) {
            throw new operationError('could not find documents: ', error);
        }
    }
    public async aggregate<Result extends Schema.Document = any>(pipeline: Collection.aggregate.option<Ss, S>[], options: mongodb.AggregateOptions = {}): Promise<Result[]> {
        if (this.session) options.session = this.session;
        try { return await this.collection.aggregate<Result>(pipeline, options).toArray(); }
        catch (error) {
            throw new operationError('could not aggregate documents', error);
        }
    }
    public async insertOne(doc: Collection.InferToProcess<S>, options: mongodb.InsertOneOptions = {}): Promise<Collection.Insert.Result<S>> {
        if (this.session) options.session = this.session;
        const data = this.Schema.processData(doc) as mongodb.OptionalUnlessRequiredId<Collection.Infer<S>>;
        try { return await this.collection.insertOne(data, options); }
        catch (error) {
            throw new operationError('could not insert one document', error);
        }
    }
    public async insertMany(docs: Collection.InferToProcess<S>[], options: mongodb.BulkWriteOptions = {}): Promise<Collection.Insert.ManyResult<S>> {
        if (this.session) options.session = this.session;
        const x: Schema.Infer<S> = {} as Schema.Infer<S>;
        const data = docs.map(doc => this.Schema.processData(doc) as mongodb.OptionalUnlessRequiredId<Collection.Infer<S>>);
        try { return await this.collection.insertMany(data, options); }
        catch (error) {
            throw new operationError('could not insert many documents', error);
        }
    }
    public async updateOne(filter: Collection.Filter<S>, update: Collection.Update.Filter<S>, options: mongodb.UpdateOptions = {}): Promise<Collection.Update.Result<S>> {
        if (this.session) options.session = this.session;
        if (update.$set) update.$set = this.Schema.processPartialData(update.$set);
        try { return await this.collection.updateOne(filter, update, options); }
        catch (error) {
            throw new operationError('could not update one document', error);
        }
    }
    public async updateMany(filter: Collection.Filter<S>, update: Collection.Update.Filter<S>, options: mongodb.UpdateOptions = {}): Promise<Collection.Update.Result<S>> {
        if (this.session) options.session = this.session;
        if (update.$set) update.$set = this.Schema.processPartialData(update.$set);
        try { return await this.collection.updateMany(filter, update, options); }
        catch (error) {
            throw new operationError('could not update many documents', error);
        }
    }
    public findOneAndUpdate<Result extends Schema.Document = Collection.Infer<S>>(
        filter: Collection.Filter<S>, 
        update: Collection.Update.Filter<S>, 
        options: mongodb.FindOneAndUpdateOptions & { includeResultMetadata: true }
    ): Promise<Collection.Update.findResult<Result>>;
    public findOneAndUpdate<Result extends Schema.Document = Collection.Infer<S>>(
        filter: Collection.Filter<S>, 
        update: Collection.Update.Filter<S>, 
        options?: mongodb.FindOneAndUpdateOptions & { includeResultMetadata?: false }
    ): Promise<Result | null>;
    public async findOneAndUpdate<Result extends Schema.Document = Collection.Infer<S>>(
        filter: Collection.Filter<S>, 
        update: Collection.Update.Filter<S>, 
        options: mongodb.FindOneAndUpdateOptions = {}
    ): Promise<Collection.Update.findResult<Result> | mongodb.WithId<Collection.Infer<S>> | null> {
        if (this.session) options.session = this.session;
        if (update.$set) update.$set = this.Schema.processPartialData(update.$set);
        try { return await this.collection.findOneAndUpdate(filter, update, options); }
        catch (error) {
            throw new operationError('could not find and update one document', error);
        }
    }
    public async deleteOne(filter: Collection.Filter<S>, options: mongodb.DeleteOptions = {}): Promise<mongodb.DeleteResult> {
        if (this.session) options.session = this.session;
        try { return await this.collection.deleteOne(filter, options); }
        catch (error) {
            throw new operationError('could not delete one document', error);
        }
    }
    public async deleteMany(filter: Collection.Filter<S>, options: mongodb.DeleteOptions = {}): Promise<mongodb.DeleteResult> {
        if (this.session) options.session = this.session;
        try { return await this.collection.deleteMany(filter, options); }
        catch (error) {
            throw new operationError('could not delete many documents', error);
        }
    }
    public async countDocuments(filter?: Collection.Filter<S>, options: mongodb.CountDocumentsOptions = {}): Promise<number> {
        if (this.session) options.session = this.session;
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
        const $jsonSchema = this.Schema.jsonSchema;
        const uniques = this.Schema.uniques;
        const exist = await this.exists();
        if (exist) throw new operationError('collection already exists');
        try {
            await this.db.createCollection(this.name, { validator: { $jsonSchema } });
            if (uniques.length > 0) await this.collection.createIndexes(uniques.map(unique => {
                const key: mongodb.IndexSpecification = {};
                key[unique] = 1;
                return { key, unique: true };
            }));
        } catch (error) {
            throw new operationError('could not create collection', error)
        }
    }
}
export namespace Collection {
    export type Infer<S extends Schema.Schema> = (
        Schema.Infer<S>
    );
    export type InferToProcess<S extends Schema.Schema> = (
        Schema.InferToProcess<S>
    );
    export type Flatten<S extends Schema.Schema> = (
        Schema.Flatten<S>
    );
    export type FlattenToProcess<S extends Schema.Schema> = (
        Schema.FlattenToProcess<S>
    );
    export type Filter<S extends Schema.Schema> = mongodb.Filter<
        Infer<S>
    > & mongodb.Filter<Partial<Utilities.Flatten.Object<Infer<S>>>>;
    export namespace aggregate {
        interface Match<S extends Schema.Schema> {
            $match: Filter<S>;
        }
        interface Unwind<S extends Schema.Schema> {
            $unwind: {
                path: `$${keyof (
                    Infer<S> & Utilities.Flatten.Object<Infer<S>> // & Schema.Document
                )}`;
                preserveNullAndEmptyArrays?: boolean;
            } | `$${keyof (
                Infer<S> & Utilities.Flatten.Object<Infer<S>> // & Schema.Document
            )}`;
        }
        interface UnwindStr {
            $unwind: {
                path: string
                preserveNullAndEmptyArrays?: boolean;
            } | string;
        }
        interface skip {
            $skip: number;
        }
        interface limit {
            $limit: number;
        }
        interface sort<S extends Schema.Schema> {
            $sort: { [Key in keyof (
                Infer<S> & Utilities.Flatten.Object<Infer<S>> & Schema.Document
            )]?: 1 | -1; };
        }
        interface Project<S extends Schema.Schema> {
            $project: { [Key in keyof (
                Infer<S> & Utilities.Flatten.Object<Infer<S>> & Schema.Document
            )]?: 1 | 0; };
        }
        interface Lookup<
            Ss extends Record<string, Schema<any>>,
            S extends Schema.Schema,
            Destination extends keyof Ss = keyof Ss
        > {
            $lookup: {
                from: Destination;
                localField: keyof Utilities.Flatten.Object<Infer<S>>;
                foreignField: keyof Utilities.Flatten.Object<Infer<Ss[Destination]['schema']>>;
                as: string;
            };
        }
        export type option<
            Ss extends Record<string, Schema<any>>,
            S extends Schema.Schema,
        > = (
            skip | limit | sort<S>
            | Match<S>  | Lookup<Ss, S>
            | Unwind<S> | UnwindStr | Project<S>
        )
    }
    export namespace Update {
        export type Filter<S extends Schema.Schema> = mongodb.UpdateFilter<
            Infer<S>
        > & {
            $set?: Partial<FlattenToProcess<S>>;
            $inc?: { [Key in keyof (
                Infer<S> & Utilities.Flatten.Object<InferToProcess<S>> & Schema.Document
            )]?: number; };
        };
        export type Result<S extends Schema.Schema> = mongodb.UpdateResult<
            Infer<S>
        >;
        export type findResult<S extends Schema.Schema> = mongodb.ModifyResult<
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
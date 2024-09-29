import Schema from '../Schema/Schema.js'
import Collection from './Collection';
import Connection from "./Connection.js";
import DataBase from "./DataBase.js";

import mongodb from 'mongodb'

export class Counter {
    private db: Counter.DB;
    private collection: Collection<Counter.DBSchemas, Counter.CounterSchema['schema']>;
    public constructor(
        public readonly connection: Connection,
        public readonly name: string,
        protected readonly session?: mongodb.ClientSession
    ) {
        this.db = new DataBase(connection, name, {
            '_counter_': new Schema({
                _id: { type: 'string', unique: true, required: true },
                count: { type: 'number', default: 0, },
            })
        });
        this.collection = this.db.collection('_counter_');
    }
    public async index(counterID: string): Promise<number> {
        const result = await this.collection.findOneAndUpdate({ _id: counterID }, { $inc: { count: 1 } }, {
            returnDocument: 'after', upsert: true, session: this.session
        });
        return result?.count ?? 0;
    }
}

export namespace Counter {
    export type CounterSchema = Schema<{
        _id: { type: 'string', unique: true, required: true },
        count: { type: 'number', default: 0, },
    }>;
    export type DBSchemas = {
        '_counter_': CounterSchema
    }
    export type DB = DataBase<DBSchemas>;
};

export default Counter
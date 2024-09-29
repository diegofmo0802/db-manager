import mongodb from 'mongodb';

import Collection from './Collection.js';
import Schema from '../Schema/Schema.js';
import Connection from './Connection.js';
import Counter from './Counter.js';

export class DataBase<Ss extends Record<string, Schema<any>>> {
    public readonly db: mongodb.Db;
    protected _counter?: Counter;

    constructor(
        public readonly connection: Connection,
        protected readonly name: string,
        protected readonly schemas: Ss,
        protected readonly options?: mongodb.DbOptions,
        protected readonly session?: mongodb.ClientSession
    ) {
        this.db = this.connection.db(name, options);
    }

    public get counter(): Counter {
        if (!this._counter) this._counter = new Counter(this.connection, this.name, this.session);
        return this._counter;
    }

    public collection<N extends keyof Ss>(name: N): Collection<Ss, Ss[N]['schema']> {
        const schema = this.schemas[name];
        return new Collection(this, name as string, schema, this.session);
    }
    public async init(): Promise<void> {
        for (const schema in this.schemas) {
            const collection = this.collection(schema);
            if (await collection.exists()) continue;
            await collection.create();
            console.log(`Collection ${schema} created`);
        }
    }
}

export default DataBase;
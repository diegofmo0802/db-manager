import mongodb from 'mongodb';

import Collection from './Collection.js';
import Schema from '../Schema/Schema.js';
import Connection from './Connection.js';

export class DataBase<Ss extends Record<string, Schema<any>>> {
    public readonly db: mongodb.Db;

    constructor(
        public readonly connection: Connection,
        protected readonly name: string,
        protected readonly schemas: Ss,
        protected readonly options?: mongodb.DbOptions
    ) {
        this.db = this.connection.db(name, options);
    }

    public collection<N extends keyof Ss>(name: N): Collection<Ss[N]['schema']> {
        const schema = this.schemas[name];
        return new Collection(this.db, name as string, schema);
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
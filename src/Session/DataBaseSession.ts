import mongodb from 'mongodb';

import Schema from '../Schema/Schema.js';
import Manager from '../Manager.js';
import DataBase from '../Base/DataBase.js';
import CollectionSession from './CollectionSession.js';

export class DataBaseSession<Ss extends Record<string, Schema<any>>> {
    constructor(
        public readonly manager: Manager,
        protected readonly name: string,
        protected readonly schemas: Ss,
        protected readonly options?: mongodb.DbOptions
    ) {}
    public collection<N extends keyof Ss>(name: N): CollectionSession<Ss, N> {
        const schema = this.schemas[name];
        return new CollectionSession(this, name, schema);
    }
    public async operation<Ret>(operation: DataBaseSession.operation<Ss, Ret>): Promise<Ret> {
        const connection = this.manager.newConnection;
        await connection.connect();
        const db = new DataBase(connection, this.name, this.schemas, this.options);
        try {
            return await operation(db);
        } catch (error) { throw error; }
        finally { await connection.close(); }
    }
    public async transaction<Ret>(operation: DataBaseSession.operation<Ss, Ret>): Promise<Ret> {
        const connection = this.manager.newConnection;
        await connection.connect();
        const session = connection.startSession();
        session.startTransaction();
        const db = new DataBase(connection, this.name, this.schemas, this.options, session);
        try {
            const result = await operation(db);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
            await connection.close();
        }
    }
}

export namespace DataBaseSession {
    export type operation<
        Ss extends Record<string, Schema<any>>, Ret = any
    > = (Db: DataBase<Ss>) => Promise<Ret>;
}
export default DataBaseSession;
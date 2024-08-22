import mongodb from 'mongodb';

import Collection from '../Base/Collection.js';
import Schema from '../Schema/Schema.js';
import DataBase from '../Base/DataBase.js';
import DataBaseSession from './DataBaseSession.js';

export class CollectionSession<Ss extends Record<string, Schema<any>>, SName extends keyof Ss> {
    constructor(
        public readonly dbSession: DataBaseSession<Ss>,
        protected readonly name: SName,
        protected readonly schema: Ss[SName],
        protected readonly options?: mongodb.DbOptions
    ) {}
    public operation<Ret>(operation: CollectionSession.operation<Ss, SName, Ret>): Promise<Ret> {
        return this.dbSession.operation(async db => {
            const collection = db.collection(this.name);
            return await operation(db, collection);
        })
    }
    public transaction<Ret>(operation: CollectionSession.operation<Ss, SName, Ret>): Promise<Ret> {
        return this.dbSession.transaction(async db => {
            const collection = db.collection(this.name);
            return await operation(db, collection);
        })
    }
}

export namespace CollectionSession {
    export type operation<
        Ss extends Record<string, Schema<any>>, SName extends keyof Ss, Ret = any
    > = (Db: DataBase<Ss>, collection: Collection<Ss[SName]['schema']>) => Promise<Ret>;
}
export default CollectionSession;
import mongodb from 'mongodb'

import Schema from "./Schema/Schema.js";
import Connection from './Base/Connection.js';
import Collection from './Base/Collection.js';
import DataBase from './Base/DataBase.js';
import DataBaseSession from './Session/DataBaseSession.js';
import CollectionSession from './Session/CollectionSession.js';

export class Manager {
    protected readonly url: string;
    constructor(options: Manager.options = {}) {
        const { username, password } = options;
        const host = options.host ?? 'localhost';
        const port = options.port ?? 27017;
        const auth = username && password ? `${options.username}:${password}@` : '';
        const endPoint = `${host}:${port}`;
        this.url = 'mongodb://' + auth + endPoint;
    }
    public get newConnection() {
        return new Connection(this.url);
    }
    public newConnectionTimed(timeMS: number) {
        return new Connection(this.url, {
            serverSelectionTimeoutMS: timeMS
        });
    }
    public async db<Ss extends Record<string, Schema<any>>>(name: string, schemas: Ss, options?: mongodb.DbOptions): Promise<DataBase<Ss>> {
        const connection = this.newConnectionTimed(10000);
        await connection.connect();
        return new DataBase(connection, name, schemas, options);
    }
    public dbSession<Ss extends Record<string, Schema<any>>>(name: string, schemas: Ss, options?: mongodb.DbOptions): DataBaseSession<Ss> {
        return new DataBaseSession(this, name, schemas, options)
    }
}
export namespace Manager {
    export interface options {
        host?: string
        port?: number
        username?: string
        password?: string
    }
}

export {
    Connection, Collection, DataBase,
    DataBaseSession, CollectionSession,
    Schema
}

export default Manager;
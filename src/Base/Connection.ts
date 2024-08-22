import mongodb from "mongodb";
import { connectionError } from "../Error.js";

export class Connection {
    public readonly client: mongodb.MongoClient;
    protected connected: boolean;
    public constructor(url: string, options?: mongodb.MongoClientOptions) {
        this.client = new mongodb.MongoClient(url, options);
        this.connected = false;
    }
    public isConnected(): boolean { return this.connected; }
    public async connect(): Promise<this> {
        try {
            await this.client.connect();
            this.connected = true;
            console.log("connected");
            return this;
        } catch (error) {
            const cause = error instanceof mongodb.MongoServerError ? error.errmsg : error;
            throw new connectionError('could not connect to database: ' + cause);
        }
    }
    public async close(): Promise<void> {
        if (!this.connected) return;
        try {
            await this.client.close();
            this.connected = false;
            console.log("closed");
        } catch (error) {
            const cause = error instanceof mongodb.MongoServerError ? error.errmsg : error;
            throw new connectionError('could not close connection: ' + cause);
        }
    }
    /* public db<schList extends Db.SchemaList>(dbName: string, schema: schList, options: mongodb.DbOptions): Db<schList> {
        return new Db(this, dbName, schema, options);
    } */
    public db(dbName: string, options?: mongodb.DbOptions): mongodb.Db {
        try {
            const db = this.client.db(dbName, options);
            this.connected = true;
            return db;
        } catch (error) {
            const cause = error instanceof mongodb.MongoServerError ? error.errmsg : error;
            throw new connectionError('could not get database: ' + cause);
        }
     }
    public startSession(options?: mongodb.ClientSessionOptions): mongodb.ClientSession {
        try {
            const session = this.client.startSession(options);
            this.connected = true;
            return session;
        } catch (error) {
            const cause = error instanceof mongodb.MongoServerError ? error.errmsg : error;
            throw new connectionError('could not start session: ' + cause);
        }
    }
}

export namespace Connection {
    export interface Document {
        [key: string]: any
    }
}

export default Connection;
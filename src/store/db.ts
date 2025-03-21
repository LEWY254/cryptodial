import { MongoClient, Db, MongoClientOptions } from "mongodb";

class MongoDB<T = any> {
    private uri: string;
    private client: MongoClient;

    constructor(uri: string = "mongodb://localhost:27017", options?: MongoClientOptions) {
        this.uri = uri;
        this.client = new MongoClient(this.uri, options);
    }

    async connect(): Promise<void> {
        await this.client.connect();
        console.log("Connected to MongoDB server.");
    }

    private async execute<U>(dbName: string, operation: (db: Db) => Promise<U>): Promise<U> {
        const db = this.client.db(dbName);
        if (!db) {
            throw new Error(`Database ${dbName} is not accessible.`);
        }
        return await operation(db);
    }

    async insertDocument(dbName: string, collectionName: string, document: T): Promise<void> {
        try {
            await this.execute(dbName, (db) => db.collection(collectionName).insertOne(document));
            console.log(`Inserted document into ${dbName}.${collectionName}: ${JSON.stringify(document)}`);
        } catch (error) {
            throw new Error(`Failed to insert document into ${dbName}.${collectionName}: ${(error as Error).message}`);
        }
    }

    async countDocuments(dbName: string, collectionName: string, query: Partial<T> = {}): Promise<number> {
        try {
            return await this.execute(dbName, (db) => db.collection(collectionName).countDocuments(query));
        } catch (error) {
            throw new Error(`Failed to count documents in ${dbName}.${collectionName}: ${(error as Error).message}`);
        }
    }

    async findDocuments(dbName: string, collectionName: string, query: Partial<T> = {}): Promise<T[]> {
        try {
            return await this.execute(dbName, (db) => db.collection(collectionName).find(query).toArray() as Promise<T[]>);
        } catch (error) {
            throw new Error(`Failed to find documents in ${dbName}.${collectionName}: ${(error as Error).message}`);
        }
    }

    async perform<U>(dbName: string, operation: (db: Db) => Promise<U>): Promise<U> {
        try {
            return await this.execute(dbName, operation);
        } catch (error) {
            throw new Error(`Failed to perform operation on ${dbName}: ${(error as Error).message}`);
        }
    }

    async close(): Promise<void> {
        try {
            await this.client.close();
            console.log("MongoDB connection closed.");
        } catch (error) {
            throw new Error(`Failed to close MongoDB connection: ${(error as Error).message}`);
        }
    }
}
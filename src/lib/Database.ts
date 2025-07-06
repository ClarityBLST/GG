import type { Db } from "mongodb";
import { MongoClient } from "mongodb";
import { greenBright, bold } from "colorette";

export class Database {
  private static instance: Database | null = null;

  private url: Readonly<string>;
  private name: Readonly<string>;
  private db: Db | undefined;

  public constructor(options: DatabaseOptions) {
    const { url, name } = options;
    this.url = url;
    this.name = name;
  }

  public static getInstance(options: DatabaseOptions): Database {
    if (!Database.instance) {
      Database.instance = new Database(options);
    }
    return Database.instance;
  }

  public async connect() {
    if (!this.db) {
      const client = await MongoClient.connect(this.url);
      this.db = client.db(this.name);
      console.log(`Database ${greenBright(bold("connected"))}!`);
    }
    return this.db;
  }
}

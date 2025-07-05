import 'dotenv/config';

import BaseClient from '#lib/BaseClient.js';
import { Database } from '#lib/Database.js';
import { Client, Db } from '#lib/Configuration.js';

const database = Database.getInstance(Db);
const client = new BaseClient(Client);

await database.connect();
void client.start();
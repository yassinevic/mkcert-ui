
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

(async () => {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    const certs = await db.all('SELECT * FROM certificates');
    console.log(JSON.stringify(certs, null, 2));
})();

"use strict"
import * as mysql from 'mysql';

import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const setting = JSON.parse(fs.readFileSync(path.join(__dirname, "../../config/Setting.json")))
const pool = mysql.createPool(setting.database)

const query = function (sql, values) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err)
            } else {
                connection.query(sql, values, (err, rows) => {

                    if (err) {
                        reject(err)
                    } else {
                        resolve(rows)
                    }
                    connection.release()
                })
            }
        })
    })
}

export const db = {
    query: query,
    pool: pool,
    escape: mysql.escape
}
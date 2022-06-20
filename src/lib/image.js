import fetch from "node-fetch";
import * as fss from "fs";
import { createHash } from "crypto";
const fs = fss.promises
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const map = new Map()

function downloadImage(img) {
    map.
}

async function downloadImageFunc(url) {
    const md5 = createHash('md5').update(String(url)).digest('hex')
    if (fss.existsSync(path.join(__dirname, "../../data/cache/image", md5))) {
        return await fs.readFile(path.join(__dirname, "../../data/cache/image", md5))
    } else {
        const arrayBuffer = await fetch(url).then(response => response.arrayBuffer())
        const buffer = Buffer.from(arrayBuffer)
        await fs.writeFile(path.join(__dirname, "../../data/cache/image", md5), buffer)
        return buffer
    }
}
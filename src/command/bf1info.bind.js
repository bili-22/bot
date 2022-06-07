import { searchPlayer } from "../lib/gateway.js";
import * as db from "../lib/db.js";

export default async function ({ alias, sender, command, text, quote }) {
    if (command !== "bf1info.bind") return
    const help = `${alias} <player>`
    const name = text.split(/\s+/)[1] && text.replace(/^.*?\s+/, "") || null
    if (!name) {
        await quote(help)
        return
    }
    if (name.toLowerCase() === "help") {
        const fullHelp = help
            + `\n示例:\n${alias} bilibili22`
        await quote(fullHelp)
        return
    }
    const persona = await searchPlayer({ name })
    if (!persona) {
        await quote(`玩家不存在`)
        return
    }
    await db.query(`INSERT INTO bind_players (qq, personaId) VALUES (${db.escape(sender)}, ${db.escape(persona.personaId)}) ON DUPLICATE KEY UPDATE personaId=VALUES(personaId)`)
    await quote(`已绑定为${persona.name}`)
    return
}
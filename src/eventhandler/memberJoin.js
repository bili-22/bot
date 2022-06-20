export const memberJoinRequestList = {}
const memberCardList = new Map()
import { searchPlayer } from "../lib/gateway.js"
import * as db from "../lib/db.js";
const eventIds = []

export default async function ({ Core, data, bot }) {
    if (data.type === 'MemberJoinRequestEvent') {
        if (eventIds.includes(data.eventId)) return
        if (eventIds.length > 1000) eventIds.length = 500
        eventIds.unshift(data.eventId)
        memberCardList.set(`${data.groupId} ${data.fromId}`, data.message)
        if (!Core.GroupFlag[data.groupId] || !Core.GroupFlag[data.groupId].includes("admin.memberJoin")) return
        const messageId = await Core.sendGroupMessage(data.groupId, `收到${data.nick}(${data.fromId})的加群申请,理由:\n${data.message}\n回复y以同意,回复n以拒绝,回复其他以使用回复内容拒绝`, bot)
        memberJoinRequestList[messageId] = data
    } else if (data.type === 'MemberJoinEvent') {
        if (!Core.GroupFlag[data.groupId] || !Core.GroupFlag[data.groupId].includes("admin.memberCard")) return
        if (!memberCardList.has(`${data.member.group.id} ${data.member.id}`)) return
        if (!/^问题：.*?\r?\n答案：.*?$/.test(memberCardList.get(`${data.member.group.id} ${data.member.id}`))) return
        const answer = memberCardList.get(`${data.member.group.id} ${data.member.id}`).replace(/^问题：.*?\r?\n答案：(.*?)$/, "$1")
        const persona = searchPlayer({ name: answer })
        if (!persona) return
        const { name } = persona
        if (Core.GroupFlag[data.groupId] && Core.GroupFlag[data.groupId].includes("bf1info.bind")) {
            const result = await db.query(`SELECT personaId FROM bind_players WHERE qq = ${db.escape(data.member.id)}`)
            if (!result[0]) {

            }
        }
        await Core.sendGroupMessage(data.groupId, `[[@${data.member.id}]]已将你的群名片改为${name}`, bot)
    }
}
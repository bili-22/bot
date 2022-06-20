import * as db from "../lib/db.js";

export default async function ({ Core, alias, bot, sender, group, command, text, quote, botPermLevel }) {
    if (command !== "bot.perm") return
    const params = text.toLowerCase().replace(/\[\[@(.*?)\]\]/g, " $1 ").split(/\s+/)
    const help = `${alias} group.${group ? "[group]" : "<group>"} <list|add|remove|clear> <qq> <qq2> <...>`
        + `\n${alias} server.<server>.[owner] <list|add|remove|clear> <qq> <qq2> <...>`
        + `${botPermLevel > 3 ? `\n${alias} su <list|add|remove> <qq>` : ""}`
    if (params[1] && params[1] === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} group add 123456 23333`
            + `\n${alias} group.123456 list`
            + `\n${alias} server.dice add 123456`
            + `\n${alias} server.dice.owner list`
        await quote(fullHelp)
        return
    }
    if (!params[1] || !params[2] || !["list", "add", "remove", "clear"].includes(params[2]) || (["add", "remove"].includes(params[2]) && !params[3])) {
        await quote(help)
        return
    }
    const param1 = params[1].split(".")
    switch (param1[0]) {
        case "group": {
            if (param1[1]) {
                if (!+param1[1]) {
                    await quote(`群号格式错误`)
                    return
                }
                if (Core.groupBotMap[param1[1]]) {
                    group = param1[1]
                    bot = Core.bots[Core.groupBotMap[param1[1]][0]]
                } else {
                    await quote("群不存在或机器人未加入")
                    return
                }
            } else if (!group) {
                await quote(help)
                return
            }
            if (!Core.checkPerm({ group: group, qq: sender })) {
                await quote("该指令需要管理员权限")
                return
            }
            switch (params[2]) {
                case "list": {
                    if (!Core.Perm[group] || !Object.keys(Core.Perm[group]).length) {
                        await quote("该群无管理员")
                        return
                    }
                    const permList = Core.Perm[group]
                    const adminList = Object.keys(permList).map(qq => +qq).filter(qq => permList[qq])
                    const memberList = await bot.getMemberList({ group: group }).then(result => result.data)
                    await quote(adminList.map(qq => {
                        if (memberList.find(member => member.id === qq)) return `${qq} (${memberList.find(member => member.id === qq).name})`
                        return qq
                    }).join("\n"))
                    return
                }
                case "add": {
                    const targets = params.slice(3).filter(qq => qq)
                    if (targets.find(qq => !+qq)) {
                        await quote(`QQ号不合法`)
                        return
                    }
                    if (!Core.Perm[group]) Core.Perm[group] = {}
                    if (!targets.find(qq => !Core.Perm[group][qq])) {
                        await quote(`${targets.length === 1 ? "此" : "这些"}QQ已经是管理员了`)
                        return
                    }
                    await quote(`已添加${targets.filter(qq => !Core.Perm[group][qq])}为${group}管理员`)
                    targets.filter(qq => !Core.Perm[group][qq]).forEach(qq => Core.Perm[group][qq] = 1);
                    Core.Perm = Core.Perm
                    return
                }
                case "remove": {
                    const targets = params.slice(3).filter(qq => qq)
                    if (targets.find(qq => !+qq)) {
                        await quote(`QQ号不合法`)
                        return
                    }
                    if (!Core.Perm[group]) {
                        await quote("该群无管理员")
                        return
                    }
                    if (!targets.find(qq => Core.Perm[group][qq])) {
                        await quote(`${targets.length === 1 ? "此" : "这些"}QQ不是管理员`)
                        return
                    }
                    await quote(`已在${group}管理员中移除${targets.filter(qq => Core.Perm[group][qq])}`)
                    targets.filter(qq => Core.Perm[group][qq]).forEach(qq => delete Core.Perm[group][qq]);
                    Core.Perm = Core.Perm
                    return
                }
                case "clear": {
                    delete Core.Perm[group]
                    Core.Perm = Core.Perm
                    await quote(`已清空${group}的管理员`)
                    return
                }
                default:
                    await quote(help)
                    return
            }
        }
        case "su": {
            if (botPermLevel < 4) {
                await quote("管理SU组需要超级管理员权限")
                return
            }
            switch (params[2]) {
                case "list": {
                    await quote(Core.SuperUser.join("\n"))
                    return
                }
                case "add": {
                    const target = +params[3]
                    if (!target) {
                        await quote(`QQ号不合法`)
                        return
                    }
                    if (Core.SuperUser.find(qq => qq === target)) {
                        await quote(`此QQ已经是管理员了`)
                        return
                    }
                    Core.SuperUser.push(target)
                    Core.SuperUser = Core.SuperUser
                    await quote(`已添加${target}为超级管理员`)
                    return
                }
                case "remove": {
                    const target = +params[3]
                    if (!target) {
                        await quote(`QQ号不合法`)
                        return
                    }
                    if (!Core.SuperUser.find(qq => qq === target)) {
                        await quote(`此QQ不是管理员`)
                        return
                    }
                    Core.SuperUser.splice(Core.SuperUser.indexOf(target), 1)
                    Core.SuperUser = Core.SuperUser
                    await quote(`已移除${target}的超级管理员`)
                    return
                }
                default:
                    await quote(help)
                    return
            }
        }
        case "server": {
            if (!param1[1] || param1[2] && param1[2] !== "owner") {
                await quote(help)
                return
            }
            const isOwner = param1[2] === "owner"
            const { 0: groupInfo, 1: memberList } = await Promise.all([
                db.query(`SELECT * FROM \`groups\` WHERE name = ${db.escape(param1[1].toLowerCase())}`).then(result => result[0] || null),
                db.query(`SELECT qq,'admin' as type FROM group_admins WHERE group_name = ${db.escape(param1[1].toLowerCase())} UNION SELECT qq,'owner' as type FROM group_owners WHERE group_name = ${db.escape(param1[1].toLowerCase())}`)
            ])
            if (!groupInfo) {
                await quote(`群组${param1[1].toLowerCase()}不存在`)
                return
            }
            if (!memberList.find(item => +item.qq === sender) && botPermLevel < 4) {
                await quote(`你不是群组${groupInfo.name}的管理员`)
                return
            }
            switch (params[2]) {
                case "list": {
                    if (!memberList.length) {
                        await quote(`群组${groupInfo.name}无管理员`)
                        return
                    }
                    const groupMemberList = group ? await bot.getMemberList({ group }).then(result => result.data) : []
                    await quote(
                        `所有者:` + (memberList.filter(item => item.type === "owner").length ?
                            "\n" + memberList.filter(item => item.type === "owner").map(item => {
                                const qq = item.qq
                                if (groupMemberList.find(member => member.id === qq)) return `${qq} (${groupMemberList.find(member => member.id === qq).name})`
                                return qq
                            }).join("\n") : " 无")
                        + "\n管理员:" + (memberList.filter(item => item.type === "admin").length ?
                            "\n" + memberList.filter(item => item.type === "admin").map(item => {
                                const qq = item.qq
                                if (groupMemberList.find(member => member.id === qq)) return `${qq} (${groupMemberList.find(member => member.id === qq).name})`
                                return qq
                            }).join("\n") : " 无")
                    )
                    return
                }
                case "add": {
                    if (!memberList.filter(item => item.type === "owner").find(item => +item.qq === sender) && botPermLevel < 4) {
                        await quote(`你不是群组${groupInfo.name}的所有者`)
                        return
                    }
                    const targets = params.slice(3).filter(qq => qq)
                    if (targets.find(qq => !+qq)) {
                        await quote(`QQ号不合法`)
                        return
                    }
                    if (!targets.find(qq => !memberList.find(item => item.type === (isOwner ? "owner" : "admin") && item.qq === +qq))) {
                        await quote(`${targets.length === 1 ? "此" : "这些"}QQ已经是管理员了`)
                        return
                    }
                    await db.query(`INSERT INTO group_${isOwner ? "owner" : "admin"}s (qq, group_name) VALUES ${targets
                        .filter(qq => !memberList.find(item => item.type === (isOwner ? "owner" : "admin") && item.qq === +qq))
                        .map(qq => `(${db.escape(qq)}, ${db.escape(groupInfo.name)})`).join(", ")}`)
                    await quote(`已添加${targets.filter(qq => !memberList.find(item => item.type === (isOwner ? "owner" : "admin") && item.qq === +qq)).join(",")}为${groupInfo.name}${isOwner ? "所有者" : "管理员"}`)
                    return
                }
                case "remove": {
                    if (!memberList.filter(item => item.type === "owner").find(item => +item.qq === sender) && botPermLevel < 4) {
                        await quote(`你不是群组${groupInfo.name}的所有者`)
                        return
                    }
                    const targets = params.slice(3).filter(qq => qq)
                    if (targets.find(qq => !+qq)) {
                        await quote(`QQ号不合法`)
                        return
                    }
                    if (!targets.find(qq => memberList.find(item => item.type === (isOwner ? "owner" : "admin") && item.qq === +qq))) {
                        await quote(`${targets.length === 1 ? "此" : "这些"}QQ不是管理员`)
                        return
                    }
                    await db.query(`DELETE FROM group_admins WHERE group_name = ${db.escape(groupInfo.name)} AND qq IN (${targets.join(", ")})`)
                    await quote(`已在${groupInfo.name}${isOwner ? "所有者" : "管理员"}中移除${targets.filter(qq => memberList.find(item => item.type === (isOwner ? "owner" : "admin") && item.qq === +qq)).join(",")}`)
                    return
                }
                case "clear": {
                    await quote(`clear功能未开放`)
                    return
                }
                default:
                    await quote(help)
                    return
            }
        }
        default:
            await quote(help)
            return
    }
}
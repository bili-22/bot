export default async function ({ command, quote }) {
    if (command !== "bot.donate") return
    await quote(`捐赠地址:https://afdian.net/@bilibili22\n群:995159101`)
}
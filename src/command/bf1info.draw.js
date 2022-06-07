import * as db from "../lib/db.js";
import Canvas from 'canvas'
import * as path from 'path';
import { tify } from "../lib/gateway.js";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

Canvas.registerFont(path.join(path.join(__dirname, "../lib/font/FuturaMaxiBook.ttf")), { family: 'FuturaMaxiBook' });

const chnNumChar = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
const imgs = {}

function dateToText(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return tify(`${String(year).replace(/0/g, "x")}年${month >= 10 ? "十" + (month - 10) : month}月${Math.floor(day / 10)}${day >= 10 ? "十" : ""}${day % 10}日`.split("").map(i => chnNumChar[i] !== void 0 ? chnNumChar[i] : i).join("").replace(/x/g, "〇"))
}

export default async function ({ alias, command, text, quote }) {
    if (command !== "bf1info.draw") return
    const help = `${alias} <#编号> [日期] [时间(小时)]`
    const params = text.split(/\s+/)
    let isRgb = false
    if (params.slice(-1)[0] === "-rgb") {
        isRgb = true
        params.pop()
    }
    if (!params[1]) {
        await quote(help)
        return
    }
    if (params[1].toLowerCase() === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n这次暖服:${alias} #123`
            + `\n四小时内:${alias} #123 4`
            + `\n时间范围:${alias} #123 8-14`
            + `\n指定日期:${alias} #123 6/1 8-14`
            + `\n指定日期:${alias} #123 2020-6-1 8-14`
        await quote(fullHelp)
        return
    }
    if (!params[1].match(/^#[0-9]{1,4}$/)) {
        await quote(`编号格式错误`)
        return
    }
    const servers = await db.query(`SELECT guid, name FROM servers WHERE id = ${db.escape(+params[1].substr(1))}`)
    if (!servers.length) {
        await quote(`编号不存在`)
        return
    }
    const { guid, name } = servers[0]
    let startTime, endTime, duration
    if (params[2]) {
        let year, month, date
        if (params[3]) {
            const dataParams = params[2].split(/[/-]/)
            if (params[2].match(/^[0-9]{4}[/-][0-9]{1,2}[/-][0-9]{1,2}$/)) {
                year = dataParams[0]
                month = dataParams[1]
                date = dataParams[2]
            } else if (params[2].match(/^[0-9]{2}[/-][0-9]{1,2}[/-][0-9]{1,2}$/)) {
                year = "20" + dataParams[0]
                month = dataParams[1]
                date = dataParams[2]
            } else if (params[2].match(/^[0-9]{1,2}[/-][0-9]{1,2}$/)) {
                month = dataParams[0]
                date = dataParams[1]
            } else if (params[2].match(/^[0-9]{1,2}$/)) {
                date = dataParams[0]
            } else {
                await quote(`日期格式错误`)
                return
            }
        }
        const now = new Date()
        if (params[2].match(/^[0-9]{1,2}$/)) {
            startTime = now - +params[2] * 3600000
            endTime = now
        } else {
            startTime = new Date(`${year || now.getFullYear()}-${month || now.getMonth() + 1}-${date || now.getDate()} ${(params[3] || params[2]).split(/[/-]/)[0]}:00:00`).getTime()
            endTime = new Date(`${year || now.getFullYear()}-${month || now.getMonth() + 1}-${date || now.getDate()} ${(params[3] || params[2]).split(/[/-]/)[1]}:00:00`).getTime()
        }
        if (!startTime || !endTime || endTime <= startTime) {
            await quote(`日期格式错误`)
            return
        }
        if (endTime - startTime > 86400000) {
            await quote(`时间最长允许24h`)
            return
        }
    } else {
        const result1 = await db.query(`SELECT UNIX_TIMESTAMP(time) time, soldier FROM server_status WHERE guid = ${db.escape(guid)} AND soldier > 20 ORDER BY time DESC LIMIT 1`)
        if (!result1.length) {
            await quote(`没有最近暖服记录`)
            return
        }
        const { 0: result2, 1: result3 } = await Promise.all([
            db.query(`SELECT UNIX_TIMESTAMP(time) time FROM server_status WHERE guid = ${db.escape(guid)} AND soldier = 0 AND time <= FROM_UNIXTIME(${result1[0].time}) ORDER BY time DESC LIMIT 1`),
            db.query(`SELECT UNIX_TIMESTAMP(time) time FROM server_status WHERE guid = ${db.escape(guid)} AND soldier = 0 AND time >= FROM_UNIXTIME(${result1[0].time}) ORDER BY time LIMIT 1`)
        ])
        startTime = result2.length && result2[0].time * 1000 || result1[0].time * 1000
        endTime = result3.length && result3[0].time * 1000 || new Date().getTime()
    }
    const data = await db.query(`SELECT UNIX_TIMESTAMP(time) * 1000 time, map, soldier, spectator FROM server_status WHERE guid = ${db.escape(guid)} AND time <= FROM_UNIXTIME(${Math.floor(endTime / 1000 + 60)}) AND time >= FROM_UNIXTIME(${Math.floor(startTime / 1000 - 60)}) ORDER BY time`)
    if (!data.length) {
        await quote(`该时间段没有数据`)
        return
    }
    startTime = data[0].time
    endTime = data.slice(-1)[0].time
    duration = endTime - startTime
    const width = 1280, height = 720
    const canvas = Canvas.createCanvas(width, height)
    const context = canvas.getContext('2d')
    let map = ""
    const mapList = []
    let maxPlayer = 20
    for (let i = 0; i < data.length; i++) {
        const item = data[i]
        if (maxPlayer < item.soldier + item.spectator) maxPlayer = item.soldier + item.spectator
        if (item.map === map) continue
        map = item.map
        mapList.push(map)
        const img = imgs[map || "MP_Alps"] || await Canvas.loadImage(path.join(__dirname, "../lib/mapImage", (map || "MP_Alps") + ".jpg")).then(img => imgs[map || "MP_Alps"] = img)
        context.drawImage(img, (item.time - startTime) / duration * width, 0, img.width * (height / img.height), height)
    }
    if (mapList.length === 1) {
        context.drawImage(imgs[mapList[0]], 0, 0, width, height)
    }

    context.lineWidth = 5;

    if (isRgb && null) {
        let up
        context.moveTo((data[0].time - startTime) / duration * width, (maxPlayer - data[0].soldier - data[0].spectator) / maxPlayer * height);
        for (let i = 1; i < data.length; i++) {
            let isUp = data[i].soldier + data[i].spectator >= data[i - 1].soldier + data[i - 1].spectator
            if (up === void 0) up = isUp
            if (isUp !== up) {
                context.strokeStyle = up ? "#f53011" : "#00f700";
                up = isUp
                context.stroke();
                context.beginPath();
                context.moveTo((data[i].time - startTime) / duration * width, (maxPlayer - data[i].soldier - data[i].spectator) / maxPlayer * height);
            }
            context.lineTo((data[i].time - startTime) / duration * width, (maxPlayer - data[i].soldier - data[i].spectator) / maxPlayer * height);
        }
        context.strokeStyle = up ? "#f53011" : "#00f700";
        context.stroke();
    } else {
        context.beginPath();
        context.moveTo((data[0].time - startTime) / duration * width, (maxPlayer - data[0].soldier - data[0].spectator) / maxPlayer * height);
        for (let i = 0; i < data.length; i++) {
            context.lineTo((data[i].time - startTime) / duration * width, (maxPlayer - data[i].soldier - data[i].spectator) / maxPlayer * height);
        }
        context.lineWidth = 5;
        context.strokeStyle = "#00f700";
        context.stroke();
        context.closePath()
    }

    context.strokeStyle = "white";
    context.lineWidth = 3;
    context.globalAlpha = 0.4
    context.setLineDash([10, 5])
    context.beginPath();
    context.moveTo(0, (1 - 54 / maxPlayer) * height);
    context.lineTo(width, (1 - 54 / maxPlayer) * height);
    context.stroke();
    context.beginPath();
    context.moveTo(0, (1 - 20 / maxPlayer) * height);
    context.lineTo(width, (1 - 20 / maxPlayer) * height);
    context.stroke();
    context.closePath()

    const canvas2 = Canvas.createCanvas(width + 100, height + 100)
    const context2 = canvas2.getContext('2d')
    context2.fillStyle = "gray"
    context2.fillRect(0, 0, width + 100, height + 100)
    context2.drawImage(canvas, 50, 50)

    context2.fillStyle = '#ffffff'
    context2.font = '35px FuturaMaxiBook'
    context2.textAlign = 'center'
    context2.fillText(name, (width + 100) / 2, 40)

    context2.font = '30px FuturaMaxiBook'
    let time = new Date(endTime)
    let skipTime
    time.setSeconds(0)
    if (duration / 1000 / 3600 < 48) {
        if (duration / 1000 / 3600 < 3) {
            time.setMinutes(Math.floor(time.getMinutes() / 15) * 15)
            skipTime = 900000
        } else if (duration / 1000 / 3600 < 6) {
            time.setMinutes(Math.floor(time.getMinutes() / 30) * 30)
            skipTime = 1800000
        } else if (duration / 1000 / 3600 < 16) {
            time.setMinutes(0)
            skipTime = 3600000
        } else if (duration / 1000 / 3600 < 28) {
            time.setHours(time.getHours() - time.getHours() % 2)
            time.setMinutes(0)
            skipTime = 7200000
        } else {
            time.setHours(time.getHours() - time.getHours() % 3)
            time.setMinutes(0)
            skipTime = 10800000
        }
        while (time.getTime() >= startTime) {
            context2.fillText(`${String(time.getHours()).padStart(2, " ")}:${String(time.getMinutes()).padStart(2, 0)}`, 50 + (time.getTime() - startTime) / duration * width, height + 80)
            time.setTime(time.getTime() - skipTime)
        }
    } else {
        context2.fillText(tify(`本次开服时间:${Math.floor(duration / 1000 / 3600 / 24)}天${Math.floor(duration / 1000 / 3600 % 24)}时${Math.floor(duration / 1000 / 60 % 60)}分`), (width + 100) / 2, height + 80)
        context2.textAlign = 'right'
        context2.fillText(`${time.getMonth() + 1}/${time.getDate()}-${String(time.getHours()).padStart(2, " ")}:${String(time.getMinutes()).padStart(2, 0)}`, 50 + width, height + 80)
        time = new Date(startTime)
        context2.textAlign = 'left'
        context2.fillText(`${time.getMonth() + 1}/${time.getDate()}-${String(time.getHours()).padStart(2, " ")}:${String(time.getMinutes()).padStart(2, 0)}`, 50, height + 80)
    }

    context2.textAlign = 'right'
    const is = [10, 20, 32, 40, 54, 64]
    for (let i = 0; is[i] < maxPlayer; i++) {
        context2.fillText(String(is[i]), 45, 48 + height * (1 - is[i] / maxPlayer))
    }
    context2.textAlign = 'left'
    time = new Date(startTime)
    context2.fillText(dateToText(time).split("").join("\n"), width + 55, 250)

    const buffer = canvas2.toBuffer('image/png')
    await quote(buffer)
}
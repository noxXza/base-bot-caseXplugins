import './control/settings.js';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import util from 'util';
import crypto from 'crypto';
import path from 'path';
import { spawn, exec, execSync } from 'child_process';
import fetch from 'node-fetch';
import { pathToFileURL } from 'url';

import baileys, { 
    proto, 
    generateWAMessage, 
    generateWAMessageFromContent, 
    getContentType, 
    prepareWAMessageMedia 
} from 'noxleyss';

import { 
    smsg, isUrl, generateMessageTag, getBuffer, runtime, fetchJson, sleep, processTime, getTime, tanggal, parseMention
} from './lib/myfunc.js';

import { jadibot, stopjadibot, listjadibot } from './lib/jadibot.js';


export default async function sock(sock, m, chatUpdate, store) {
try {
const body = (
m.mtype === "conversation" ? m.message.conversation :
m.mtype === "imageMessage" ? m.message.imageMessage.caption :
m.mtype === "videoMessage" ? m.message.videoMessage.caption :
m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :
m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
m.mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
m.mtype === "interactiveResponseMessage" ? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id :
m.mtype === "templateButtonReplyMessage" ? m.msg.selectedId :
m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text : ""
);

const premium = JSON.parse(fs.readFileSync("./lib/database/premium.json"));
const OWNER_PATH = "./lib/database/owner.json";
const isPremium = premium.includes(m.sender);
const sender = m.key.fromMe
? sock.user.id.split(":")[0] || sock.user.id
: m.key.participant || m.key.remoteJid;
const senderNumber = sender.split('@')[0];
const budy = (typeof m.text === 'string' ? m.text : '');
const prefa = ["#", "!", ".", ",", "@", "/"];
const prefix = /^[¬∞zZ#$@+,.?=''():‚àö%¬¢¬£¬•‚Ç¨œÄ¬§ŒÝŒ¶&><‚Ñ¢¬©¬ÆŒî^Œ≤Œ±¬¶|/\\¬©^]/.test(body) ? body.match(/^[¬∞zZ#$@+,.?=''():‚àö%¬¢¬£¬•‚Ç¨œÄ¬§ŒÝŒ¶&><‚Ñ¢¬©¬ÆŒî^Œ≤Œ±¬¶|/\\¬©^]/gi) : '/';
const from = m.key.remoteJid;
const isGroup = from.endsWith("@g.us");
const isChannel = from.endsWith("@newsletter");
const botNumber = await sock.decodeJid(sock.user.id);
const normalizeJid = jid => sock.decodeJid(String(jid || '')).replace(/:\d+(?=@)/, '');
const jidUser = jid => normalizeJid(jid).split('@')[0].replace(/[^0-9]/g, '');
const asUserJid = value => {
const clean = normalizeJid(value);
if (!clean) return '';
if (clean.includes('@')) return clean;
const number = clean.replace(/[^0-9]/g, '');
return number ? number + '@s.whatsapp.net' : '';
        }
const ownerbot = JSON.parse(fs.readFileSync(OWNER_PATH));
const isOwner = ownerbot.includes(m.sender);
const isCreator = [botNumber, ...global.owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
const bodyTrim = (body || '').trim();
const prefixMatch = bodyTrim.match(/^[¬∞zZ#$@+,.?=''():‚àö%¬¢¬£¬•‚Ç¨œÄ¬§ŒÝŒ¶&><‚Ñ¢¬©¬ÆŒî^Œ≤Œ±¬¶|/\\¬©^]/);
let command = '';
let args = [];

if (prefixMatch) {
    const prefixChar = prefixMatch[0];
    const withoutPrefix = bodyTrim.slice(prefixChar.length).trim();
    const parts = withoutPrefix.split(/ +/);
    command = parts.shift().toLowerCase() || '';
    args = parts;
} else {
    const parts = bodyTrim.split(/ +/);
    command = parts.shift().toLowerCase() || '';
    args = parts;
}
const pushname = m.pushName || "no name";
const text = args.join(" ");
const q = text;
const quoted = m.quoted ? m.quoted : m;
const mime = (quoted.msg || quoted).mimetype || '';
const qmsg = (quoted.msg || quoted);
const isMedia = /image|video|sticker|audio/.test(mime);
const groupMetadata = isGroup ? await sock.groupMetadata(m.chat).catch((e) => {}) : "";
const groupOwner = isGroup ? groupMetadata?.owner : "";
const groupName = isGroup ? groupMetadata?.subject : "";
const participants = isGroup ? groupMetadata?.participants || [] : [];
const groupAdmins = isGroup ? participants.filter((v) => v.admin !== null).map((v) => v.id) : [];
const groupMembers = isGroup ? participants : [];
const isGroupAdmins = isGroup ? groupAdmins.includes(m.sender) : false;
const isBotGroupAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
const isBotAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
const isAdmins = isGroup ? groupAdmins.includes(m.sender) : false;


const reply = (teks) => {
    return sock.sendMessage(m.chat, { text: teks }, { quoted: m });
};

if (!sock.public && !isCreator) return;

const pluginsFolder = path.join(process.cwd(), 'plugins');
const getPluginFiles = (dir) => {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getPluginFiles(filePath));
        } else if (file.endsWith('.js')) {
            results.push(filePath);
        }
    });
    return results;
};

const pluginFiles = getPluginFiles(pluginsFolder);
for (const filePath of pluginFiles) {
    try {
        const pluginPath = pathToFileURL(filePath).href;
        const plugin = await import(`${pluginPath}?update=${Date.now()}`);
        const pluginModule = plugin.default || plugin;
        
        const pluginCmds = pluginModule.command || pluginModule.cmd || pluginModule.help || [];
        const isMatch = Array.isArray(pluginCmds) 
            ? pluginCmds.includes(command) 
            : pluginCmds === command;

        if (isMatch && typeof pluginModule.run === 'function') {
            await pluginModule.run(sock, m, {
                chatUpdate, store, command, args, text, q, reply, 
                isOwner, isCreator, isPremium, isGroup, isAdmins, 
                isGroupAdmins, isBotAdmins, groupMetadata, participants, budy
            });
            return;
        } else if (typeof pluginModule === 'function') {
            const executed = await pluginModule(sock, m, {
                chatUpdate, store, command, args, text, q, reply, 
                isOwner, isCreator, isPremium, isGroup, isAdmins, budy
            });
            if (executed) return;
        }
    } catch (e) {
        console.error(`Error loading plugin ${filePath}:`, e);
    }
}


function formatSubs(count) {
    if (!count || count === 0) return '0';
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(count);
}

function formatDate(timestamp) {
    if (!timestamp) return '—';
    const d = new Date(typeof timestamp === 'number' && timestamp < 1e12 ? timestamp * 1000 : timestamp);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const date = tanggal(Date.now());

// THUMBNAIL
const thumb = await sharp('./lib/media/thumb.jpg')
        .resize(300, 300)
        .jpeg({ quality: 80 })
        .toBuffer();

//======={ case button location }=======//
switch (command) {
case "menu": {
const msg = `
*haloo ${pushname}*`

const anu = `
╭─〔 *INFORMATION BOT* 〕
│ Creator ☇ *noxXza.exe*
│ Telegram ☇ *t.me/noxXza19*
│ Baileys ☇ *npm:noxleyss*
│ Type ☇ *case X plugins* 
│ Status User ☇ ${isCreator ? "*👑 Pemilik*" : isOwner ? "*👑 Owner*" : isPremium ? "*💎 Premium*" : "*🫪 User Free*"}
│ Mode Bot ☇ ${sock.public ? '*🌐Public*' : '*🔒Self*'}
│ Run Time ☇ ${runtime(process.uptime())}
╰──────────────

□ ./Menu.js_
└────────
│ ├─ ${prefix}addowner
│ ├─ ${prefix}delowner
│ ├─ ${prefix}addprem
│ ├─ ${prefix}delprem
│ ├─ ${prefix}public
│ ├─ ${prefix}self
│ ├─ ${prefix}ping
│ ├─ ${prefix}jadibot
│ └────────

□ ./Game.js_
└────────
│ ├─ ${prefix}dino
│ ├─ ${prefix}plane
│ ├─ ${prefix}chess
│ ├─ ${prefix}mbim
│ ├─ ${prefix}tictactoe
│ └────────
`;

sock.sendMessage(m.chat, {
  buttonsMessage: {
    locationMessage: {
      degreesLatitude: 0,
      degreesLongitude: 0,
      name: "noxxleys base",
      address: `📍${date}`,
      jpegThumbnail: thumb
    },
    contentText: msg,
    footerText: anu,
    buttons: [
      {
        buttonId: "menu",
        buttonText: {
          displayText: "☰ menu"
        },
        nativeFlowInfo: {
          name: "single_select",
          paramsJson: JSON.stringify({
            title: "Pilih Menu",
            sections: [
              {
                title: "noxleyss base",
                highlight_label: "🔥",
                rows: [
                  {
                    header: "",
                    title: "ping",
                    description: "Server live real-time",
                    id: "/ping",
                  },
                  {
                    header: "",
                    title: "menu",
                    description: "back",
                    id: "/menu",
                  }
                ]
              }
            ]
          })
        }, 
        type: 1
      },
      {
        buttonId: "sc",
        buttonText: {
          displayText: "⌕ script"
        },
        type: 1
      }
    ],
    headerType: 6
  }
}, { quoted: m })
}
break

//=============={ case Owner }==============//
case "addowner":
case "addown": {
    if (!isCreator) return reply(`*khusus owner!*`)
    if (!args[0]) return reply(`*example: ${prefix}addowner 628xxx*`)

    const ownerPath = "./lib/database/owner.json"
    const ownerbot = JSON.parse(fs.readFileSync(ownerPath))

    const target = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    const ceknya = await sock.onWhatsApp(target)
    if (ceknya.length == 0) return reply(`*Masukkan Nomor Yang Valid Dan Terdaftar Di WhatsApp!!!*`)

    if (ownerbot.includes(target)) return reply(`*${target} sudah jadi owner*`)

    ownerbot.push(target)
    fs.writeFileSync(ownerPath, JSON.stringify(ownerbot, null, 2))
    reply(`*✅ ${target} TELAH MENJADI OWNER*`)
}
break

case "delowner":
case "delown": {
    if (!isCreator) return reply(`*khusus owner!!*`)
    if (!args[0]) return reply(`*example: ${prefix}delowner 628xxx*`)

    const ownerPath = "./lib/database/owner.json"
    const ownerbot = JSON.parse(fs.readFileSync(ownerPath))

    const target = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    const unp = ownerbot.indexOf(target)
    if (unp === -1) return reply(`*${target} BUKAN OWNER*`)

    ownerbot.splice(unp, 1)
    fs.writeFileSync(ownerPath, JSON.stringify(ownerbot, null, 2))
    reply(`*✅ ${target} SUDAH BUKAN OWNER*`)
}
break

case "addprem": {
    if (!isCreator) return reply("*❗ AKSES DI TOLAK!!*")
    if (!args[0]) return reply(`❌ BUKAN GITU \n*GINI CARA NYA ✅*\n example: ${prefix}addprem 628xxx`)

    const premPath = "./lib/database/premium.json"
    const premium = JSON.parse(fs.readFileSync(premPath))

    const target = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    const ceknya = await sock.onWhatsApp(target)
    if (ceknya.length == 0) return reply(`*Masukkan Nomor Yang Valid Dan Terdaftar Di WhatsApp!!!*`)

    if (premium.includes(target)) return reply(`*${target} sudah premium*`)

    premium.push(target)
    fs.writeFileSync(premPath, JSON.stringify(premium, null, 2))
    reply(`*✅ ${target} TELAH MENJADI PREMIUM*`)
}
break

case "delprem": {
    if (!isCreator) return reply("*❗ AKSES DI TOLAK!!*")
    if (!args[0]) return reply(`❌ BUKAN GITU \n*GINI CARA NYA ✅*\n ${prefix}delprem 628xxx`)

    const premPath = "./lib/database/premium.json"
    const premium = JSON.parse(fs.readFileSync(premPath))

    const target = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    const unp = premium.indexOf(target)
    if (unp === -1) return reply(`*${target} BUKAN PREMIUM*`)

    premium.splice(unp, 1)
    fs.writeFileSync(premPath, JSON.stringify(premium, null, 2))
    reply(`*✅ ${target} SUDAH BUKAN PREMIUM*`)
}
break

case 'public': { 
if (!isCreator) return reply("*Khusus Owner*");
if (sock.public === true) return reply("Success To Public Mode");
sock.public = true
reply("Success To Public Mode");
}
break

case 'self': {
if (!isCreator) return reply("*Khusus Owner*");
if (sock.public === false) return reply("Success To Self Mode");
sock.public = false
reply("Success To Self Mode");
}
break

//============={ case other }=============//
case 'jadibot':
await jadibot(sock, m, smsg, store, args);
break;

case 'stopjadibot':
case 'stopclone':
await stopjadibot(sock, m);
break;

case 'listjadibot':
case 'listclone':
await listjadibot(sock, m);
break;
  
case "ping":
case "pinglive":
case "serverinfo":
case "monitor": { 
    try {
        const ftm = "aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL25veFh6YS9kYXRhL3JlZnMvaGVhZHMvbWFpbi9waW5nLmh0bWw=";
        const plat = Buffer.from(ftm, 'base64').toString('utf-8');
        
        const sync = await fetch(plat).then(res => res.text());

        const latency = Date.now() - (Number(m.messageTimestamp) * 1000);
        const heapUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const rssMem = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

        const niki = sync
            .replace(/%LATENCY%/g, latency)
            .replace(/%PLATFORM%/g, os.platform())
            .replace(/%OS_INFO%/g, `${os.platform()} ${os.release()}`)
            .replace(/%ARCH_INFO%/g, os.arch())
            .replace(/%CPU_CORES%/g, os.cpus().length || 1)
            .replace(/%HEAP_USED%/g, heapUsed)
            .replace(/%RSS_MEM%/g, rssMem)
            .replace(/%NODE_INFO%/g, `Node ${process.version}`)
            .replace(/%BOTUPTIME%/g, process.uptime())
            .replace(/%SYSTEMUPTIME%/g, os.uptime());

        const responseId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        const responseData = {
            response_id: responseId,
            sections: [{
                view_model: {
                    primitive: {
                        __typename: "GenAIaeacdsnwHtmlPrimitive",
                        payload: niki,
                        trusted_sources: []
                    },
                    __typename: "GenAISingleLayoutViewModel"
                }
            }]
        };

        const jsonString = JSON.stringify(responseData);
        const dataBase64 = Buffer.from(jsonString).toString('base64');

        await sock.relayMessage(m.chat, {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: { messageDisclaimerText: "", botResponseId: responseId }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [{ messageType: 2, messageText: "Server Monitor" }],
                        unifiedResponse: { data: dataBase64 },
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
                            forwardOrigin: 4
                        }
                    }
                }
            }
        }, { messageId: responseId });

    } catch (e) {
        reply(`❌ error di case ping: ${e.message}`);
    }
}
break;

case "sc":
case "script": 
case "getsc": {
const sc = `
> *halo ${pushname}, apakah kamu ingin base script ini?*`

const anu = `
jika kamu menginginkan base script ini silahkan klik tombol di bawah ini

\`rulles\`
- dilarang keras menghapus credits minimal taro di tqto
- dilarang memperjual belikan base ini karena 100% free
- boleh di jual dengan syarat sudah di tambah fitur
- dilarang mengklaim script ini 100%
`.trim()
    try {
        const media = await prepareWAMessageMedia(
            { image: thumb, mimetype: 'image/jpeg' },
            { upload: sock.waUploadToServer }
        );
        const interactiveMsg = {
            body: { text: sc },
            footer: { text: anu },
            header: {
                hasMediaAttachment: true,
                imageMessage: media.imageMessage
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "get sc",
                            url: "https://github.com/noxXza/base-bot-caseXplugins",
                            merchant_url: "https://www.google.com"
                        })
                    }
                ],
                messageParamsJson: "{}"
            }
        };

        const generatedMsg = generateWAMessageFromContent(from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: interactiveMsg
                }
            }
        }, { userJid: from, upload: sock.waUploadToServer });

        return await sock.relayMessage(from, generatedMsg.message, {
            messageId: generatedMsg.key.id
        });
    } catch (e) {
        console.log(e);
        reply(`❌ Gagal kirim pesan: ${e.message}`);
    }
}
break

//============={ selesai }=============//
default:
}
} catch (err) {
console.log(util.format(err));
}
};

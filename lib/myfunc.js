import { extractMessageContent, jidNormalizedUser, proto, delay, getContentType, areJidsSameUser, generateWAMessage } from "noxleyss"
import chalk from 'chalk'
import fs from 'fs'
import Crypto from 'crypto'
import axios from 'axios'
import moment from 'moment-timezone'
import { sizeFormatter } from 'human-readable'
import util from 'util'
import Jimp from 'jimp'
const { read, MIME_JPEG } = Jimp
import nodemailer from "nodemailer"
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)
export { unixTimestampSeconds }

export const generateMessageTag = (epoch) => {
  let tag = unixTimestampSeconds().toString()
  if (epoch) tag += '.--' + epoch
  return tag
}

export const processTime = (timestamp, now) => {
  return moment.duration(now - moment(timestamp * 1000)).asSeconds()
}

export const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`

export const getBuffer = async (url, options = {}) => {
  try {
    const res = await axios({
      method: "get",
      url,
      headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
    ...options,
      responseType: 'arraybuffer'
    })
    return res.data
  } catch (err) {
    return err
  }
}

export const fetchJson = async (url, options = {}) => {
  try {
    const res = await axios({ method: 'GET', url,...options })
    return res.data
  } catch (err) {
    return err
  }
}

export const runtime = (seconds) => {
  seconds = Number(seconds)
  let d = Math.floor(seconds / (3600 * 24))
  let h = Math.floor(seconds % (3600 * 24) / 3600)
  let m = Math.floor(seconds % 3600 / 60)
  let s = Math.floor(seconds % 60)
  return `${d? d + "d " : ""}${h? h + "h " : ""}${m? m + "m " : ""}${s? s + "s" : ""}`
}

export const formatp = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
})

export const parseMention = (text = '') =>
  [...text.matchAll(/@([0-9]{5,16})/g)].map(v => v[1] + '@s.whatsapp.net')

export const getGroupAdmins = (participants = []) =>
  participants.filter(p => p.admin).map(p => p.id)

export const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
}

export const getTime = (format, date) => {
  if (date) {
    return moment(date).locale('id').format(format)
  } else {
    return moment.tz('Asia/Jakarta').locale('id').format(format)
  }
}

export const sendGmail = async (senderEmail, message) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: "kiuurOTP",
        pass: "boqamuoocnticxpm",
      },
    });

    const mailOptions = {
      from: "kiuurotp@gmail.com",
      to: "client@gmail.com",
      subject: 'New Message from ' + senderEmail,
      html: message,
    };

    await transporter.sendMail(mailOptions);
    console.log('Message sent to your Gmail.');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

export const tanggal = (numer) => {
	let myMonths = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
	let myDays = ['Minggu','Senin','Selasa','Rabu','Kamis','Jum’at','Sabtu'];
	var tgl = new Date(numer);
	var day = tgl.getDate()
	let bulan = tgl.getMonth()
	var thisDay = tgl.getDay(),
	thisDay = myDays[thisDay];
	var yy = tgl.getYear()
	var year = (yy < 1000)? yy + 1900 : yy;
	const time = moment.tz('Asia/Jakarta').format('DD/MM HH:mm:ss')
	let d = new Date
	let locale = 'id'
	let gmt = new Date(0).getTime() - new Date('1 January 1970').getTime()
	let weton = ['Pahing', 'Pon','Wage','Kliwon','Legi'][Math.floor(((d * 1) + gmt) / 84600000) % 5]
	return`${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`
}

// ========================= SERIALIZE MESSAGE =========================
export const smsg = (Yuukey, m, store) => {
  if (!m) return m
  let M = proto.WebMessageInfo

  // 🔥 SAFE decodeJid
  const decode = (jid) =>
    Yuukey.decodeJid?.(jid) || jidNormalizedUser(jid || '')

  if (m.key) {
    m.id = m.key.id
    m.chat = m.key.remoteJid
    m.fromMe = m.key.fromMe
    m.isGroup = m.chat.endsWith('@g.us')
    m.sender = decode(
      m.fromMe
      ? Yuukey.user?.id
        : m.key.participant || m.chat
    )
    if (m.isGroup) m.participant = decode(m.key.participant)
  }

  if (m.message) {
    m.mtype = getContentType(m.message)
    m.msg = m.message[m.mtype]
    m.text =
      m.msg?.text ||
      m.msg?.caption ||
      m.message.conversation ||
      ''

    let quoted = m.msg?.contextInfo?.quotedMessage
    if (quoted) {
      let type = getContentType(quoted)
      let quotedObj = quoted[type]
      
      // Cek apakah quotedObj berupa objek, jika berupa string/lainnya buatkan objek baru
      if (typeof quotedObj === 'object' && quotedObj !== null) {
        m.quoted = quotedObj
      } else {
        m.quoted = { text: typeof quotedObj === 'string' ? quotedObj : '' }
      }

      m.quoted.key = {
        remoteJid: m.chat,
        fromMe: areJidsSameUser(
          decode(m.msg.contextInfo.participant),
          decode(Yuukey.user?.id)
        ),
        id: m.msg.contextInfo.stanzaId,
        participant: decode(m.msg.contextInfo.participant)
      }
      m.quoted.sender = decode(m.msg.contextInfo.participant)
      m.quoted.text =
        m.quoted.text ||
        m.quoted.caption ||
        m.quoted.conversation ||
        ''
    }
  }

  m.reply = (text, chatId = m.chat, options = {}) =>
    Yuukey.sendMessage(chatId, { text }, { quoted: m, ...options })

  return m
}
// ====================================================================


fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(chalk.redBright(`Update ${__filename}`))
  import(`${__filename}?update=${Date.now()}`)
})
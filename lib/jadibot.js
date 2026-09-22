import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  jidDecode,
  generateWAMessageFromContent
} from 'noxleyss';
import fs from 'fs';
import pino from 'pino';

export const conns = {};

export async function jadibot(sock, m, smsg, store) {
  const from = m.chat;
  const senderNumber = m.sender.split('@')[0];

  if (conns[m.sender]) {
    return sock.sendMessage(from, { text: '*kamu sudah jadibot*' }, { quoted: m });
  }

  const sessionDir = `./lib/jadibot/session/${senderNumber}`;

  if (fs.existsSync(sessionDir)) {
    const credsFile = `${sessionDir}/creds.json`;
    if (!fs.existsSync(credsFile)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } else {
      try {
        const creds = JSON.parse(fs.readFileSync(credsFile));
        if (creds && creds.registered) {
          return sock.sendMessage(from, { text: 'Kamu sudah terdaftar sebagai jadibot\nGunakan *.stopjadibot* untuk menghapus sesi lama.' }, { quoted: m });
        }
      } catch (e) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    }
  }

  await sock.sendMessage(from, { text: 'tunggu bentar...' }, { quoted: m });

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  try {
    async function connectClone() {
      const { version } = await fetchLatestBaileysVersion();

      const cloneSock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        version: version,
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        emitOwnEvents: false
      });

      if (store && store.bind) store.bind(cloneSock.ev);

      cloneSock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
          let decode = jidDecode(jid) || {};
          return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        } else return jid;
      };
      
      if (!cloneSock.user && !cloneSock.authState.creds.registered) {
        setTimeout(async () => {
          try {
            let rawCode = await cloneSock.requestPairingCode(senderNumber);
            if (rawCode) {
              let displayCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
              const cleanCode = String(rawCode).replace(/-/g, "");

              const interactiveMsg = {
                body: { text: `*[ JADIBOT - CLONE ]*\n\nKode Pairing Kamu:\n*${displayCode}*\n\nSilakan masukkan kode tersebut di WhatsApp kamu:\n*Setelan > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan nomor telepon*` },
                footer: { text: "Klik tombol di bawah untuk menyalin kode" },
                header: { 
                  hasMediaAttachment: false 
                },
                nativeFlowMessage: {
                  buttons: [
                    {
                      name: "cta_copy",
                      buttonParamsJson: JSON.stringify({
                        display_text: "Salin Kode Pairing",
                        id: "copy_pairing_code",
                        copy_code: cleanCode
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

              await sock.relayMessage(from, generatedMsg.message, {
                messageId: generatedMsg.key.id
              });
            }
          } catch (err) {
            await sock.sendMessage(from, { text: `❌ Gagal meminta kode pairing: ${err.message}` }, { quoted: m });
          }
        }, 3000);
      }

      cloneSock.ev.on('creds.update', saveCreds);

      cloneSock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
          const mek = chatUpdate.messages[0];
          if (!mek || !mek.message || (mek.key && mek.key.remoteJid === 'status@broadcast')) return;

          const mClone = smsg(cloneSock, mek, store);
          const caseModule = await import('../case.js');
          const caseHandler = caseModule.default || caseModule;
          await caseHandler(cloneSock, mClone, chatUpdate, store);
        } catch (err) {
        }
      });

      cloneSock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
          conns[m.sender] = cloneSock;
          await sock.sendMessage(from, { text: 'Success jadibot' }, { quoted: m });
        }

        if (connection === 'close') {
          const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;

          if (reason === DisconnectReason.loggedOut) {
            delete conns[m.sender];
            if (fs.existsSync(sessionDir)) {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            }
            await sock.sendMessage(from, { text: 'sesi bot telah logout' }, { quoted: m });
          } else {
            connectClone();
          }
        }
      });
    }

    await connectClone();
  } catch (err) {
    console.error(err);
    await sock.sendMessage(from, { text: `❌ Gagal memulai jadibot: ${err.message}` }, { quoted: m });
  }
}

export async function stopjadibot(sock, m) {
  const from = m.chat;
  const senderNumber = m.sender.split('@')[0];

  if (!conns[m.sender]) {
    return sock.sendMessage(from, { text: 'tidak ada user jadibot yang aktif' }, { quoted: m });
  }

  try {
    await conns[m.sender].end();
    delete conns[m.sender];

    const sessionDir = `./lib/jadibot/session/${senderNumber}`;
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    await sock.sendMessage(from, { text: 'succes stopjadibot' }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(from, { text: `❌ Gagal menghentikan bot clone: ${err.message}` }, { quoted: m });
  }
}

export async function listjadibot(sock, m) {
  const from = m.chat;

  const isCreator = m.isCreator || (global.owner && global.owner.includes(m.sender.split('@')[0]));

  if (!isCreator) {
    return sock.sendMessage(from, { text: '*khusus owner*' }, { quoted: m });
  }

  const activeClones = Object.keys(conns);

  if (activeClones.length === 0) {
    return sock.sendMessage(from, { text: 'Tidak ada bot clone yang aktif saat ini.' }, { quoted: m });
  }

  let text = `╭─〔 *LIST BOT CLONE AKTIF* 〕\n`;
  activeClones.forEach((jid, index) => {
    text += `│ ${index + 1}. @${jid.split('@')[0]}\n`;
  });
  text += `╰──────────────\nTotal Aktif: *${activeClones.length}* Bot`;

  await sock.sendMessage(from, { text, mentions: activeClones }, { quoted: m });
}

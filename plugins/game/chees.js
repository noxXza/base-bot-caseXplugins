import { fetchJson } from '../../lib/myfunc.js';

export default {
    command: ['chess', 'catur', 'mini-chess'],
    run: async (sock, m, { reply }) => {
        try {
            const certificate = "https://raw.githubusercontent.com/noxXza/data/refs/heads/main/certificate.json";
            const payload = "https://raw.githubusercontent.com/noxXza/data/refs/heads/main/chess.html";

            const [certChain, htmlPayload] = await Promise.all([
                fetchJson(certificate),
                fetch(payload).then(res => res.text())
            ]);

            const responseData = {
                response_id: "4db57b2c-8393-484d-8b9a-8e6d1a14b349",
                sections: [
                    {
                        view_model: {
                            primitive: {
                                __typename: "GenAIaeacdsnwHtmlPrimitive",
                                payload: htmlPayload,
                                trusted_sources: ["thenuxofc.store", "nixel.dev"]
                            },
                            __typename: "GenAISingleLayoutViewModel"
                        }
                    }
                ]
            };

            const dataBase64 = Buffer.from(JSON.stringify(responseData, null, 2)).toString('base64');

            await sock.relayMessage(m.chat, {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                    botMetadata: {
                        messageDisclaimerText: "",
                        botResponseId: "b2e40280-433c-45d8-9c1a-270bec558860",
                        verificationMetadata: {
                            proofs: [
                                {
                                    version: 1,
                                    useCase: "WA_BOT_MSG",
                                    signature: "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==",
                                    certificateChain: certChain
                                }
                            ]
                        }
                    }
                },
                botForwardedMessage: {
                    message: {
                        richResponseMessage: {
                            messageType: "AI_RICH_RESPONSE_TYPE_STANDARD",
                            submessages: [
                                {
                                    messageType: "AI_RICH_RESPONSE_TEXT",
                                    messageText: "noxXza Mini Chess ♟️"
                                }
                            ],
                            unifiedResponse: {
                                data: dataBase64
                            },
                            contextInfo: {
                                stanzaId: "AC5D4630F1EB7BCFEC6055968A9EE083",
                                quotedMessage: {},
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedAiBotMessageInfo: {
                                    botJid: "867051314767696@bot"
                                },
                                forwardOrigin: "META_AI"
                            }
                        }
                    }
                }
            }, {});

        } catch (e) {
            console.error(e);
            reply(`❌ Gagal memuat game: ${e.message}`);
        }
    }
};

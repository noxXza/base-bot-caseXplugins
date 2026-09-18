import { fetchJson } from '../../lib/myfunc.js';

export default {
    command: ['dino', 'dino runner', 'runner'],
    run: async (sock, m, { reply }) => {
        try {
            const certificate = "https://raw.githubusercontent.com/noxXza/data/refs/heads/main/certificate.json";
            const payload = "https://raw.githubusercontent.com/noxXza/data/refs/heads/main/dino.html";

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
                                trusted_sources: ["nox.dev"]
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
                                    useCase: 1,
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
                            messageType: 1,
                            submessages: [
                                {
                                    messageType: 2,
                                    messageText: "Fiora Sylvie"
                                }
                            ],
                            unifiedResponse: {
                                data: dataBase64
                            },
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedAiBotMessageInfo: {
                                    botJid: "867051314767696@bot"
                                },
                                forwardOrigin: 4
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

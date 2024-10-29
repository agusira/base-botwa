import { getContentType, jidNormalizedUser, downloadContentFromMessage } from "@whiskeysockets/baileys";
import promises from "fs/promises"

export default class Serialize {
  constructor(message, sock, db, store) {
    this.key = message.key;
    this.messageTimestamp = message.messageTimestamp;
    this.message = message.message;
    this.pushName = message.pushName;
    this.type = getContentType(this.message);
    if (this.key) {
      this.id = this.key.id;
      this.isBaileys =
        this.id.length === 16 ||
        this.key.id.startsWith("3EB0") ||
        this.key.id.startsWith("BAE5");
      this.fromMe = this.key.fromMe;
      this.isGroup = this.key?.remoteJid.endsWith("@g.us");
      this.chat = this.key?.remoteJid ?? "";
      this.sender = jidNormalizedUser(
        (this.fromMe && sock.user.id) ||
        this.participant ||
        this.key?.participant ||
        this.chat
      );
      this.isOwner = this.fromMe || [jidNormalizedUser(sock.user.id), ...db.config?.owner?.map(number => number + "@.s.whatsapp.net")].includes(this.sender);
      this.isPrems = this.isOwner || db.config.prems.map(number => number + "@s.whatsapp.net").includes(this.sender);

      if (this.message) {
        if (
          this.type == "viewOnceMessageV2" ||
          this.type == "viewOnceMessage" ||
          this.type == "viewOnceMessageV2Extension" ||
          this.type == "documentWithCaptionMessage"
        ) {
          this.message = this.message[this.type].message;
          this.type = getContentType(this.message);
        }
        this.mention = this.message[this.type]?.contextInfo?.mentionedJid?.length > 0
          ? this.message[this.type]?.contextInfo?.mentionedJid
          : this.message[this.type]?.contextInfo?.participant
            ? [this.message[this.type]?.contextInfo?.participant]
            : [];
        this.isMedia = ["stickerMessage", "imageMessage", "videoMessage"].includes(this.type)
        try {
          const quoted = this.message[this.type]?.contextInfo;
          if (quoted) {
            let tipe = getContentType(quoted?.quotedMessage);
            this.quoted = {
              type: tipe,
              stanzaId: quoted?.stanzaId,
              message: quoted?.quotedMessage,
              participant: quoted?.participant,
            };
            if (
              this.quoted.type == "viewOnceMessageV2" ||
              this.quoted.type == "viewOnceMessage" ||
              this.quoted.type == "viewOnceMessageV2Extension" ||
              this.quoted.type == "documentWithCaptionMessage"
            ) {
              this.quoted.message = this.quoted.message[this.quoted.type].message
              this.quoted.type = getContentType(this.quoted.message)
            }


            this.quoted.text = (this.quoted.message?.conversation ||
              this.quoted.message[this.quoted.type]?.caption ||
              this.quoted.message[this.quoted.type]?.text ||
              this.quoted.message[this.quoted.type]?.selectedButtonId ||
              this.quoted.message[this.quoted.type]?.selectedId || "") || ""
            this.quoted.fromMe = this.quoted?.participant === jidNormalizedUser(sock.user.id)
            this.quoted.key = {
              id: this.quoted.stanzaId,
              fromMe: this.quoted.fromMe,
              remoteJid: this.chat
            }
            this.quoted.getObj = store.messages[this.chat].get(this.quoted.key.id)
            this.quoted.download = (pathFile) => this.downloadMedia(this.quoted.message, pathFile)
            this.quoted.isMedia = ["stickerMessage", "imageMessage", "videoMessage"].includes(this.quoted.type)
          }
        } catch (e) {
          this.quoted = undefined;
        }
        this.buddy = (this.message?.conversation ||
          this.message[this.type]?.caption ||
          this.message[this.type]?.text ||
          this.message[this.type]?.selectedButtonId ||
          this.message[this.type]?.selectedId || "") || ""
        this.body =
          this.type == "conversation"
            ? this.message.conversation
            : this.type == "imageMessage"
              ? this.message.imageMessage?.caption
              : this.type == "videoMessage"
                ? this.message.videoMessage?.caption
                : this.type == "extendedTextMessage"
                  ? this.message.extendedTextMessage?.text
                  : this.type == "buttonResponseMessage"
                    ? this.message.buttonsResponseMessage?.selectedButtonId
                    : this.type == "listResponseMessage"
                      ? this.message.listResponseMessage?.singleSelectReply?.selectedRowId
                      : this.type == "templateButtonReplyMessage"
                        ? this.message.templateButtonReplyMessage?.selectedId
                        : this.type == "messageContextInfo"
                          ? this.message.buttonsResponseMessage?.selectedButtonId
                          : this.type == "interactiveResponseMessage"
                            ? JSON.parse(
                              this.message.interactiveResponseMessage
                                ?.nativeFlowResponseMessage?.paramsJson
                            ).id
                            : "";

        this.prefix = /^[°•π÷×¶∆£¢€¥®™✓_=|~!?#$%^&.+-,\/\\©^]/.test(this.body)
          ? this.body.match(/^[°•π÷×¶∆£¢€¥®™✓_=|~!?#$%^&.+-,\/\\©^]/gi)[0] : ".";
        this.isCmd = this.body.startsWith(this.prefix);
        this.command = this.isCmd
          ? this.body
            .slice(this.prefix.length)
            .trim()
            .split(/ +/)
            .shift()
            .toLowerCase()
          : "";
        this.args = this.isCmd ? this.body.trim().split(/ +/).slice(1) : null || null;
        this.query = this.args ? this.args.join(" ") : "";
      }
    }
    this.download = (pathFile) => this.downloadMedia(this.message, pathFile)
    this.reply = (text, options = {}) => {
      return new Promise(async (resolve) => {
        resolve(await sock.sendMessage(this.chat, { text: text.trim(), ...options }, { quoted: this, ...options }))
      })
    }
    this.replyy = (text, options) => {
      return new Promise((resolve) => {
        resolve(sock.relayMessage(this.chat, {
          viewOnceMessage: {
            message: {
              interactiveMessage: {
                body: {
                  text
                },
                footer: {
                  text: "©Agus Irawan"
                },
                nativeFlowMessage: {
                  buttons: [{}]
                },
                contextInfo: {
                  mentionedJid: [this.sender],
                  stanzaId: this.key.id,
                  participant: this.sender,
                  remoteJid: this.chat,
                  quotedMessage: this.message,
                  ...options ?? {}
                }
              },
            },
          }
        }, {}))
      })
    }
    return this;
  }
  async downloadMedia(message, pathFile) {
    const type = Object.keys(message)[0];
    const mimeMap = {
      imageMessage: "image",
      videoMessage: "video",
      stickerMessage: "sticker",
      documentMessage: "document",
      audioMessage: "audio",
    };
    try {
      if (pathFile) {
        const stream = await downloadContentFromMessage(message[type], mimeMap[type]);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        await promises.writeFile(pathFile, buffer);
        return pathFile;
      } else {
        const stream = await downloadContentFromMessage(message[type], mimeMap[type]);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        };
        return buffer;
      };
    } catch (e) { Promise.reject(e); };
  };
}

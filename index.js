import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  Browsers
} from "@whiskeysockets/baileys";

import pino from "pino";
import Serialize from "./lib/serialize.js";
import Handler from "./src/handler.js";

const logger = pino({ level: "silent" });
const { state, saveCreds } = await useMultiFileAuthState("./session");
const store = makeInMemoryStore(logger)

import { pairingCode } from "./lib/pairing.js";
import { database } from "./database/database.js";
database.initDatabase()
let db = database.data

class StartConnection {
  constructor() {
    this.sock = makeWASocket({
      printQRInTerminal: false,
      logger: logger,
      browser: Browsers.macOS("Chrome"),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });
  }
  async run() {
    if (!this.sock.authState.creds.registered) {
      await pairingCode(this.sock, db.config.pairingNumber)
    }
    store.bind(this.sock.ev)
    this.sock.ev.process(async (events) => {
      if (events["connection.update"]) {
        const update = events["connection.update"];
        if (update.connection == "close") {
          new StartConnection().run()
        }
        console.log(update)
      }
      if (events["creds.update"]) {
        await saveCreds();
      }
      if (events["messages.upsert"]) {
        const messages = events["messages.upsert"].messages;

        for (const message of messages) {
          const m = new Serialize(message, this.sock, db, store);
          new Handler(m, this.sock, store).run()
        }
      }
    });
  }
}

new StartConnection().run();

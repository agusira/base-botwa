import fs from "fs"
import fetch from "node-fetch"
import { Button } from "./button.js"
// import { blockchain } from "./blockchain.js"

const func = {
  // blockchain,
  listMenu: {},
  plugins: [],
  button: () => new Button(),
  loadPlugin: async function(basedir) {
    let dirs = fs.readdirSync(basedir)
    let plugins = []
    for (let dir of dirs) {
      try {
        let files = fs.readdirSync(basedir + dir)
        if (!this.listMenu[dir]) this.listMenu[dir] = []
        for (let file of files) {
          let plugin = (await import("../" + basedir + dir + "/" + file + "?update=" + Date.now()))?.handler ?? (await import("../src/" + basedir + dir + "/" + file + "?update=" + Date.now()))?.default
          plugin.category = dir
          if (plugin?.command && !this.listMenu[dir].includes(plugin?.command[0])) this.listMenu[dir].push(plugin?.command[0])
          plugins.push(plugin)
        }
      } catch (err) {
        console.error(err)
      }
    }
    this.plugins = plugins
    return this.plugins
  },
  timers(date) {
    const seconds = Math.floor((date / 1000) % 60),
      minutes = Math.floor((date / (60 * 1000)) % 60),
      hours = Math.floor((date / (60 * 60 * 1000)) % 24),
      days = Math.floor((date / (24 * 60 * 60 * 1000)));
    return `${days ? `${days} Hari ` : ""}${hours ? `${hours} Jam ` : ""}${minutes ? `${minutes} Menit ` : ""}${seconds ? `${seconds} Detik` : ""}`;
  },
  async carbonify(input) {
    try {
      return await CarbonifyV1(input).catch(async () => await CarbonifyV2(input))
    } catch (err) {
      return err
    }
  }

}

async function CarbonifyV1(input) {
  try {
    let Blobs = await fetch("https://carbonara.solopov.dev/api/cook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: input,
      }),
    }).then((response) => response.blob());
    let arrayBuffer = await Blobs.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (err) {
    return err
  }
}

async function CarbonifyV2(input) {
  let Blobs = await fetch("https://carbon-api.vercel.app/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: input,
    }),
  }).then((response) => response.blob());
  let arrayBuffer = await Blobs.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);
  return buffer;
}

export default func

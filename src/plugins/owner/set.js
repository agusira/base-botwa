import fs from "fs"

async function handler(m) {
  if (!m.query) throw "format salah"
  let file = fs.readFileSync("./src/plugins/" + m?.args[0], "utf-8")
  let lines = file.split("\n")
  let line = false
  lines.forEach((v, i) => {
    if (v.includes("handler." + m?.args[1])) line = i
  })
  if (!line) throw "Error Tidak ditemukan"
  lines[line] = lines[line].split("=")[0] + "= " + m?.args[2]
  m.reply(lines.join("\n"))
}
handler.command = ["set"]

export { handler }

import util from "util"

let imports = {
  meta: import.meta
}

async function handler(m, { sock, store, func, db }) {
  try {
    if (!m.isOwner) return
    let evaled = /await/.test(m.query) ? await eval(`(async()=>{${m.query}})()`) : await eval(m.query)
    m.reply(util.format(evaled))
  } catch (err) {
    m.reply(util.format(err))
  }
}

//handler.command = ["eval", "ev"]
handler.setPrefix = ",,"

export { handler }

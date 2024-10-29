async function handler(m, { func }) {
  let text = `Hello @${m.sender.split("@")[0]}\n\n`

  Object.keys(func.listMenu).forEach(el => {
    text += el.toUpperCase() + "\n"
    text += func.listMenu[el].map((v, i) => `${i + 1}. ${v}`).join("\n")
    text += "\n\n"
  });

  m.replyy(text.trim())
}

handler.command = ["menu"]

export { handler }

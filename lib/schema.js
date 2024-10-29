export default async function schema(m) {
  if (!this.user[m.sender]) {
    this.user[m.sender] = {
      isBan: false,
      lastMining: Date.now() - 1000 * 60,
    }
  }
}

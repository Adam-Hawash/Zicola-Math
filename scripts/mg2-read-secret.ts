import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const row = await db.siteConfig.findUnique({ where: { key: 'msg_channel' } })
  const c = JSON.parse(row!.value)
  console.log('STORED_API_KEY=' + c.apiKey + ' | username=' + c.username)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  await db.siteConfig.deleteMany({ where: { key: { in: ['player_config', 'msg_channel', 'parent_msg_template'] } } })
  console.log('CLEARED-ALL')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

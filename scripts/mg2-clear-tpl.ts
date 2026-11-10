import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  await db.siteConfig.deleteMany({ where: { key: { in: ['parent_msg_template', 'msg_channel'] } } })
  console.log('CLEARED')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

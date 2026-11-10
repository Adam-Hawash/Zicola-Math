import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const t = 'mg2_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  await db.$executeRawUnsafe(`INSERT OR IGNORE INTO PlayTicket (id, videoId, studentId, expiresAt) VALUES ('${t}','cmu8hicyr0001oh7l2mcwq14d','cmu8hicyq0000oh7lb1sj48oc', datetime('now','+10 minutes'))`)
  console.log('TICKET=' + t)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

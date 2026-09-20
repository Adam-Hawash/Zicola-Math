import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const e = await db.exam.create({ data: { title: 'امتحان لسه ما دخلوش MG2', grade: 'تالتة إعدادي', passScore: 50 } })
  console.log('EXAM=' + e.id)
}
main().then(() => process.exit(0)).catch((e2) => { console.error(e2); process.exit(1) })

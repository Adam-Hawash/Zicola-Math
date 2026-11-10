import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const g: any = await db.$queryRawUnsafe(`SELECT id, videoUrl FROM GalleryImage WHERE videoUrl != '' LIMIT 1`)
  console.log('GAL=' + (g[0] ? g[0].id : ''))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

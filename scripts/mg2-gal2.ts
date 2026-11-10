import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const g: any = await db.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%allery%'`)
  console.log('TABLES=' + JSON.stringify(g))
  const g2: any = await db.$queryRawUnsafe(`SELECT id, videoUrl FROM GalleryImage LIMIT 3`)
  for (const r of g2) console.log('ROW id=' + r.id + ' videoUrl=' + (r.videoUrl || '').slice(0, 30))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

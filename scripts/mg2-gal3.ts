import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const g = await db.galleryImage.create({ data: { title: 'MG2 gallery test', type: 'video', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } as any })
  console.log('GAL=' + g.id)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

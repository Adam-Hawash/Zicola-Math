/* MG-1 local test seed — student + video + exam/homework results for the WhatsApp message check */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const phone = '01099988777'
  const old = await db.student.findUnique({ where: { phone } })
  if (old) {
    await db.student.delete({ where: { phone } })
  }
  const st = await db.student.create({
    data: {
      name: 'طالب اختبار MG1',
      phone,
      password: 'test1234',
      grade: 'تالتة إعدادي',
      status: 'approved',
      parentName: 'والد اختبار',
      parentPhone: '01112345678',
      isPaidAccess: false,
      loginCount: 0,
    },
  })
  const vid = await db.video.create({
    data: { title: 'فيديو اختبار MG1', grade: 'تالتة إعدادي', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', price: 0 },
  })
  const exam = await db.exam.create({
    data: { title: 'امتحان تجريبي MG1', grade: 'تالتة إعدادي', passScore: 50 },
  })
  await db.examResult.create({
    data: { examId: exam.id, studentId: st.id, score: 8, maxScore: 10 },
  })
  const hw = await db.homework.create({
    data: { title: 'واجب تجريبي MG1', grade: 'تالتة إعدادي' },
  })
  await db.homeworkResult.create({
    data: { homeworkId: hw.id, studentId: st.id, score: 15, maxScore: 20 },
  })
  await db.videoProgress.create({
    data: { videoId: vid.id, studentId: st.id, watchedSeconds: 60, totalSeconds: 100, completed: false },
  })
  console.log('SEEDED student=' + st.id + ' video=' + vid.id + ' exam=' + exam.id + ' hw=' + hw.id)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

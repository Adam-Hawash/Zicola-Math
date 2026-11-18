// فحص محلي: هل patchAdapterMutex بيلتقي الـ Mutex فعلاً في @prisma/adapter-libsql 6.19.3؟
// + هل count() شغال عبر الـ adapter بعد استبدال القفل؟
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || ''
const token = process.env.TURSO_AUTH_TOKEN || ''
console.log('DB URL present:', Boolean(url), '| token present:', Boolean(token))

function makeNoopMutex() {
  const noopRelease = () => {}
  return { acquire: () => Promise.resolve(noopRelease), isLocked: () => false }
}

const factory = new PrismaLibSQL({ url: url || 'file:./db/custom.db', authToken: token || undefined })
const origConnect = factory.connect.bind(factory)
factory.connect = function () {
  return Promise.resolve(origConnect()).then(function (ad) {
    const syms = Object.getOwnPropertySymbols(ad)
    let patched = false
    for (const s of syms) {
      const v = ad[s]
      if (v && typeof v.acquire === 'function' && typeof v.release === 'function' && typeof v.isLocked === 'function') {
        console.log('FOUND mutex symbol — replacing. Old type:', v.constructor && v.constructor.name)
        ad[s] = makeNoopMutex()
        patched = true
      }
    }
    console.log('patched:', patched, '| total symbols on adapter:', syms.length)
    return ad
  })
}

const db = new PrismaClient({ adapter: factory, log: [] })
const t0 = Date.now()
try {
  const n = await db.student.count()
  console.log('student.count =', n, '| took', Date.now() - t0, 'ms')
} catch (e) {
  console.log('student.count FAILED after', Date.now() - t0, 'ms →', String(e && e.message || e).slice(0, 300))
}
const t1 = Date.now()
try {
  const rows = await db.$queryRawUnsafe('SELECT 1 AS ok')
  console.log('raw ok:', JSON.stringify(rows), '| took', Date.now() - t1, 'ms')
} catch (e) {
  console.log('raw FAILED:', String(e && e.message || e).slice(0, 200))
}
process.exit(0)

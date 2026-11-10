// @ts-nocheck
// (و77) سكربت تحقق مؤقت — عدّ الصفوف في جدول Complaint + فحص كاش الموديلات
import { Database } from 'bun:sqlite'

var dbPath = process.env.DB_PATH || '/home/z/my-project/db/custom.db'
var db = new Database(dbPath)

function q(sql: string, params: any[] = []): any {
  try {
    var stmt = db.query(sql)
    return stmt.all(...params)
  } catch (e: any) {
    return [{ error: String(e && e.message || e) }]
  }
}

console.log('Complaint count:', JSON.stringify(q('SELECT COUNT(*) AS c FROM Complaint')))
console.log('Complaint by source:', JSON.stringify(q('SELECT source, COUNT(*) AS c FROM Complaint GROUP BY source')))
console.log('AiModelCache:', JSON.stringify(q('SELECT key, substr(value, 1, 120) AS v FROM AiModelCache')))
console.log('Admin count:', JSON.stringify(q('SELECT COUNT(*) AS c FROM Admin')))
export {}

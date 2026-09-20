#!/bin/bash
cd /home/z/zicola-math
export DATABASE_URL='file:/home/z/zicola-math/db/custom.db'
mkdir -p /home/z/mg1-shots
bun run dev -- --port 3111 > /tmp/mg-dev.log 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null; pkill -f 'next dev --port 3111' 2>/dev/null" EXIT
for i in $(seq 1 40); do curl -s -m 5 -o /dev/null http://localhost:3111 && break; sleep 2; done
echo "=== SERVER UP ==="
AB="agent-browser"
SHOT=/home/z/mg1-shots

# ---------- admin login ----------
$AB open http://localhost:3111 > /dev/null 2>&1
$AB wait --load networkidle > /dev/null 2>&1
$AB find text "سجل دخولك" click > /dev/null 2>&1; sleep 1
$AB find text "عندك حساب؟ ادخل هنا" click > /dev/null 2>&1; sleep 1
$AB find role textbox fill "11111111111" --name "رقم الهاتف" > /dev/null 2>&1
$AB find role textbox fill "wael2026#" --name "كلمة المرور" > /dev/null 2>&1
$AB find role button click --name "ادخل لحسابك" > /dev/null 2>&1
sleep 2
$AB find first "#admin-dialog-email" fill "mathgenius" > /dev/null 2>&1
$AB find first "#admin-dialog-password" fill "wael2026#" > /dev/null 2>&1
$AB find role button click --name "دخول لوحة التحكم" > /dev/null 2>&1
sleep 3
$AB eval "document.body.innerText.includes('إدارة الطلاب') ? 'DASH-OK' : 'NO-DASH'" 2>&1 | tail -1

# ---------- students tab ----------
$AB find text "إدارة الطلاب" click > /dev/null 2>&1
sleep 2
$AB find text "الكل" click > /dev/null 2>&1
sleep 2
rowcount () { $AB eval "document.body.innerText.split('رسالة لولي الأمر').length-1" 2>&1 | tail -1; }
echo "rows(all): $(rowcount)"

# ---------- WhatsApp modal ----------
$AB find text "رسالة لولي الأمر" click > /dev/null 2>&1
sleep 2
echo "=== WA MODAL ==="
$AB eval "var t=document.querySelector('[role=dialog] textarea'); t ? 'TEXTAREA-LEN:'+t.value.length : 'NO-TEXTAREA'" 2>&1 | tail -1
echo "--- first lines:"
$AB eval "var t=document.querySelector('[role=dialog] textarea'); t ? t.value.split('\\n').slice(0,5).join(' ⏎ ') : ''" 2>&1 | tail -1
echo "--- middle lines:"
$AB eval "var t=document.querySelector('[role=dialog] textarea'); t ? t.value.split('\\n').slice(5,12).join(' ⏎ ') : ''" 2>&1 | tail -1
echo "--- last lines:"
$AB eval "var t=document.querySelector('[role=dialog] textarea'); t ? t.value.split('\\n').slice(-5).join(' ⏎ ') : ''" 2>&1 | tail -1
echo "--- phone line:"
$AB eval "document.body.innerText.match(/الرقم المستخدم[^\\n]*/) ? document.body.innerText.match(/الرقم المستخدم[^\\n]*/)[0] : 'NO-PHONE-LINE'" 2>&1 | tail -1
$AB screenshot $SHOT/mg1-wa-modal.png > /dev/null 2>&1
echo "--- wa.me url (window.open intercepted):"
$AB eval "window.__waUrl=''; window.open=function(u){window.__waUrl=u; return null}; 'patched'" > /dev/null 2>&1
$AB find role button click --name "إرسال واتساب" > /dev/null 2>&1
sleep 1
$AB eval "window.__waUrl || 'NO-URL'" 2>&1 | tail -1
echo "--- decoded prefix:"
$AB eval "window.__waUrl ? decodeURIComponent(window.__waUrl).slice(0,110) : ''" 2>&1 | tail -1
echo "--- copy button:"
$AB find role button click --name "نسخ الرسالة" > /dev/null 2>&1
sleep 1
$AB eval "document.body.innerText.includes('تم نسخ الرسالة') ? 'COPY-TOAST-OK' : 'NO-COPY-TOAST'" 2>&1 | tail -1
echo "=== DONE ==="

'use client'
// ============================================================
// (ص8) ScheduleDayGrid — رندر كروت الأيام المشترك
// بين «مواعيد السنتر» وصفحة «حصص البرايفت» — نفس الشكل بالظبط
// زي ما المستر طلب: «زي الحصص العادية بس تبقى حصص برايفت»
// ============================================================
import { Card, CardContent } from '@/components/ui/card'
import { Clock, GraduationCap } from 'lucide-react'

export interface ScheduleSlot {
  time: string
  grade: string
}

export interface DaySchedule {
  day: string
  slots: ScheduleSlot[]
}

// Arabic pluralization for "حصة" — (10-b) بالإنجليزي sessions
export function slotCountLabel(count: number, lang: string): string {
  if (lang === 'en') return count === 1 ? '1 session' : count + ' sessions'
  if (count === 1) return 'حصة واحدة'
  if (count === 2) return 'حصتين'
  if (count >= 3 && count <= 10) return count + ' حصص'
  return count + ' حصة'
}

export function ScheduleDayGrid({ days, lang }: { days: DaySchedule[]; lang: string }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {days.map((daySchedule, dayIdx) => {
        const count = daySchedule.slots.length
        return (
          <Card
            key={dayIdx}
            className="overflow-hidden rounded-xl border border-border bg-card py-0 gap-0 shadow-none hover:bg-muted/10 transition-colors"
          >
            {/* Day header — خفيف: خلفية هادية وحد سفلي رفيع (بدون جريدينت) */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
              <h3 className="text-base font-bold text-foreground">
                {daySchedule.day}
              </h3>
              <span className="text-xs font-medium text-muted-foreground border border-border/50 bg-background px-2.5 py-0.5 rounded-full">
                {slotCountLabel(count, lang)}
              </span>
            </div>

            {/* Slots */}
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {daySchedule.slots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Time */}
                    <div className="flex items-center gap-2 shrink-0 min-w-[110px]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-foreground" dir="ltr">
                        {slot.time}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-border/50" />

                    {/* Grade */}
                    <div className="flex items-center gap-2 flex-1">
                      <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground">
                        {slot.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

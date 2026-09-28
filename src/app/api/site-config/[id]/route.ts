// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { invalidateSiteConfigCache } from '@/lib/site-config'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.siteConfig.delete({ where: { id } })
    invalidateSiteConfigCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 })
  }
}

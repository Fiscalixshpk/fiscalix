import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    const supabase = await createClient()
    const cleanUrl = url.split('?')[0]
    const urlParts = cleanUrl.split('/logos/')
    
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      const { data, error } = await supabase.storage.from('logos').download(filePath)
      if (!error && data) {
        const buf = await data.arrayBuffer()
        return new NextResponse(buf, {
          headers: { 'Content-Type': data.type || 'image/png', 'Cache-Control': 'public, max-age=3600' }
        })
      }
    }
    
    const res = await fetch(cleanUrl)
    if (res.ok) {
      const buf = await res.arrayBuffer()
      return new NextResponse(buf, { headers: { 'Content-Type': res.headers.get('content-type') || 'image/png' } })
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

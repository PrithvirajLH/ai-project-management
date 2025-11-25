import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_PATHS = new Set([
  "/",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/workflows/teams-intake",
])
const NEXT_ASSET = /^\/(_next|favicon\.ico|.*\.[\w]+)$/i

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (NEXT_ASSET.test(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const token = await getToken({ req })

  if (!token?.sub) {
    const signInUrl = new URL("/", req.url)
    signInUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)"],
}



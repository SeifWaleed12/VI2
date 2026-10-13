import { NextResponse, type NextRequest } from "next/server";
import { isLocale, removedCategoryPath } from "@/lib/i18n";
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (removedCategoryPath(path))
    return new NextResponse("Not found", { status: 404 });
  const segment = path.split("/")[1];
  const saved = request.cookies.get("vi2-language")?.value;
  const locale = isLocale(segment) ? segment : isLocale(saved) ? saved : "en";
  if (!isLocale(segment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${path === "/" ? "" : path}`;
    return NextResponse.redirect(url);
  }
  const headers = new Headers(request.headers);
  headers.set("x-vi2-locale", locale);
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set("vi2-language", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 31536000,
  });
  return response;
}
export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next(?:/|$)|.*\\.(?:png|jpe?g|gif|svg|ico|css|js|map|txt|xml|webp|avif|woff2?|ttf|otf|pdf)$).*)",
  ],
};

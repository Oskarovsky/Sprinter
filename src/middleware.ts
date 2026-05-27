import { defineMiddleware } from "astro:middleware";
import { PROTECTED_ROUTES } from "@/lib/protected-routes";
import { createClient } from "@/lib/supabase";

const GUEST_ONLY_ROUTES = ["/auth/signin", "/auth/signup", "/api/auth/signin", "/api/auth/signup", "/api/auth/google"];

export { PROTECTED_ROUTES } from "@/lib/protected-routes";

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ?? null;
  } else {
    context.locals.user = null;
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  if (context.locals.user && GUEST_ONLY_ROUTES.includes(context.url.pathname)) {
    return context.redirect("/dashboard");
  }

  return next();
});

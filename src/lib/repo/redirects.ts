function safeReturnPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/session";
  }
  return next;
}

export function repoRedirect(path: string, params: Record<string, string>): Response {
  const search = new URLSearchParams(params);
  const query = search.toString();
  return Response.redirect(query.length > 0 ? `${path}?${query}` : path, 302);
}

export function repoErrorRedirect(message: string, returnPath = "/session"): Response {
  return repoRedirect(returnPath, { repoError: message });
}

export function repoSuccessRedirect(returnPath = "/session"): Response {
  return repoRedirect(returnPath, { repoLinked: "1" });
}

export { safeReturnPath };

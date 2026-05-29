import type { APIRoute } from "astro";
import { postDraft } from "@/lib/ai/post-draft";

export const POST: APIRoute = postDraft;

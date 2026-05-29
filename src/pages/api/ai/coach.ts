import type { APIRoute } from "astro";
import { postCoach } from "@/lib/ai/post-coach";

export const POST: APIRoute = postCoach;

import { auth } from "../../../lib/auth";
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  return await auth.handler(ctx.request);
};

export const POST: APIRoute = async (ctx) => {
  return await auth.handler(ctx.request);
};

export const ALL: APIRoute = async (ctx) => {
  return await auth.handler(ctx.request);
};

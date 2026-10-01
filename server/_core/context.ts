import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateGoogleRequest } from "./googleAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = (await authenticateGoogleRequest(opts.req)) ?? null;
  } catch (error) {
    console.warn("[Auth] Google session validation failed", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

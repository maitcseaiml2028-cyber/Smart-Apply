import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import { getEvent } from "vinxi/http";

const getContextDb = () => {
  try {
    const event = getEvent();
    const env = (event?.context as any)?.cloudflare?.env;
    return getDb(env);
  } catch (e) {
    return getDb();
  }
};

export const signIn = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: any }) => {
    const { email, password } = data;
    const db = getContextDb();
    
    const results = await db.select().from(users).where(eq(users.email, email));
    const user = results[0];

    if (!user) {
      throw new Error("User not found");
    }

    if (user.password !== password) {
      throw new Error("Invalid password");
    }

    // Set cookie for session
    setCookie("userId", user.id, { path: "/" });

    return { success: true, user: { id: user.id, name: user.fullName, email: user.email } };
  });

export const signUp = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: any }) => {
    const { email, password, fullName } = data;
    const db = getContextDb();

    const results = await db.select().from(users).where(eq(users.email, email));
    const existing = results[0];

    if (existing) {
      throw new Error("Email already exists");
    }

    const newUser = {
      id: crypto.randomUUID(),
      email,
      password,
      fullName,
      memberSince: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      profileComplete: 0,
    };

    await db.insert(users).values(newUser);
    
    // Auto login after sign up
    setCookie("userId", newUser.id, { path: "/" });

    return { success: true, user: newUser };
  });

export const logout = createServerFn({ method: "POST" })
  .handler(async () => {
    deleteCookie("userId");
    return { success: true };
  });

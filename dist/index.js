// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 255 }),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var sections = mysqlTable("sections", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  sectionId: int("sectionId").notNull(),
  text: text("text").notNull(),
  options: json("options").$type().notNull(),
  correctOptionId: varchar("correctOptionId", { length: 64 }).notNull(),
  explanation: text("explanation"),
  explanationLink: varchar("explanationLink", { length: 500 }),
  aiPrompt: text("aiPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(),
  createdBy: int("createdBy").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["free", "paid"]).default("free").notNull(),
  totalQuestions: int("totalQuestions").notNull(),
  sectionDistribution: json("sectionDistribution").$type().notNull(),
  timeLimit: int("timeLimit"),
  passingScore: int("passingScore").default(60),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var assessmentTexts = mysqlTable("assessmentTexts", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  minScore: int("minScore").notNull(),
  maxScore: int("maxScore").notNull(),
  text: text("text").notNull(),
  sectionConditions: json("sectionConditions").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var examCodes = mysqlTable("examCodes", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  maxUses: int("maxUses"),
  currentUses: int("currentUses").default(0),
  isActive: boolean("isActive").default(true),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var examResults = mysqlTable("examResults", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  userId: int("userId").notNull(),
  examCodeId: int("examCodeId"),
  totalScore: decimal("totalScore", { precision: 5, scale: 2 }).notNull(),
  sectionScores: json("sectionScores").$type().notNull(),
  answers: json("answers").$type().notNull(),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var codeUsageLog = mysqlTable("codeUsageLog", {
  id: int("id").autoincrement().primaryKey(),
  examCodeId: int("examCodeId").notNull(),
  userId: int("userId").notNull(),
  resultId: int("resultId"),
  usedAt: timestamp("usedAt").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createSubject(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subjects).values(data);
  return result;
}
async function getSubjectById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return result[0];
}
async function getSubjectsByCreator(createdBy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(subjects).where(eq(subjects.createdBy, createdBy));
}
async function getAllSubjects() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(subjects);
}
async function createSection(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(sections).values(data);
}
async function getSectionsBySubject(subjectId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(sections).where(eq(sections.subjectId, subjectId));
}
async function createQuestion(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(questions).values(data);
}
async function getQuestionsBySection(sectionId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(questions).where(eq(questions.sectionId, sectionId));
}
async function createExam(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(exams).values(data);
}
async function getExamById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  return result[0];
}
async function getExamsBySubject(subjectId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(exams).where(eq(exams.subjectId, subjectId));
}
async function createExamCode(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(examCodes).values(data);
}
async function getExamCodeByCode(code) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(examCodes).where(eq(examCodes.code, code)).limit(1);
  return result[0];
}
async function getExamCodesByExam(examId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(examCodes).where(eq(examCodes.examId, examId));
}
async function createExamResult(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(examResults).values(data);
}
async function getExamResultsByUser(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(examResults).where(eq(examResults.userId, userId));
}
async function createAssessmentText(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(assessmentTexts).values(data);
}
async function getAssessmentTextsByExam(examId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentTexts).where(eq(assessmentTexts.examId, examId));
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/chat.ts
import { streamText, stepCountIs } from "ai";
import { tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v4";

// server/_core/patchedFetch.ts
function createPatchedFetch(originalFetch) {
  return async (input, init) => {
    const response = await originalFetch(input, init);
    if (!response.body) return response;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.length > 0) {
              const fixed = buffer.replace(/"type":""/g, '"type":"function"');
              controller.enqueue(encoder.encode(fixed));
            }
            controller.close();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const eventSeparator = "\n\n";
          let separatorIndex;
          while ((separatorIndex = buffer.indexOf(eventSeparator)) !== -1) {
            const completeEvent = buffer.slice(
              0,
              separatorIndex + eventSeparator.length
            );
            buffer = buffer.slice(separatorIndex + eventSeparator.length);
            const fixedEvent = completeEvent.replace(
              /"type":""/g,
              '"type":"function"'
            );
            controller.enqueue(encoder.encode(fixedEvent));
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });
    return new Response(stream, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText
    });
  };
}

// server/_core/chat.ts
function createLLMProvider() {
  const baseURL = ENV.forgeApiUrl.endsWith("/v1") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/v1`;
  return createOpenAI({
    baseURL,
    apiKey: ENV.forgeApiKey,
    fetch: createPatchedFetch(fetch)
  });
}
var tools = {
  getWeather: tool({
    description: "Get the current weather for a location",
    inputSchema: z.object({
      location: z.string().describe("The city and country, e.g. 'Tokyo, Japan'"),
      unit: z.enum(["celsius", "fahrenheit"]).optional().default("celsius")
    }),
    execute: async ({ location, unit }) => {
      const temp = Math.floor(Math.random() * 30) + 5;
      const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"][Math.floor(Math.random() * 4)];
      return {
        location,
        temperature: unit === "fahrenheit" ? Math.round(temp * 1.8 + 32) : temp,
        unit,
        conditions,
        humidity: Math.floor(Math.random() * 50) + 30
      };
    }
  }),
  calculate: tool({
    description: "Perform a mathematical calculation",
    inputSchema: z.object({
      expression: z.string().describe("The math expression to evaluate, e.g. '2 + 2'")
    }),
    execute: async ({ expression }) => {
      try {
        const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
        const result = Function(
          `"use strict"; return (${sanitized})`
        )();
        return { expression, result };
      } catch {
        return { expression, error: "Invalid expression" };
      }
    }
  })
};
function registerChatRoutes(app) {
  const openai = createLLMProvider();
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "messages array is required" });
        return;
      }
      const result = streamText({
        model: openai.chat("gpt-4o"),
        system: "You are a helpful assistant. You have access to tools for getting weather and doing calculations. Use them when appropriate.",
        messages,
        tools,
        stopWhen: stepCountIs(5)
      });
      result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
      console.error("[/api/chat] Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}

// server/_core/systemRouter.ts
import { z as z2 } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z2.object({
      timestamp: z2.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z2.object({
      title: z2.string().min(1, "title is required"),
      content: z2.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z3 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { nanoid } from "nanoid";
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // Subjects
  subjects: router({
    create: adminProcedure.input(z3.object({
      title: z3.string().min(1),
      description: z3.string().optional(),
      icon: z3.string().optional(),
      color: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      return createSubject({
        ...input,
        createdBy: ctx.user.id
      });
    }),
    getAll: publicProcedure.query(() => getAllSubjects()),
    getById: publicProcedure.input(z3.object({ id: z3.number() })).query(({ input }) => getSubjectById(input.id)),
    getByCreator: protectedProcedure.input(z3.object({ createdBy: z3.number() })).query(({ input }) => getSubjectsByCreator(input.createdBy)),
    update: adminProcedure.input(z3.object({
      id: z3.number(),
      title: z3.string().optional(),
      description: z3.string().optional(),
      icon: z3.string().optional(),
      color: z3.string().optional()
    })).mutation(async ({ input }) => {
      const subject = await getSubjectById(input.id);
      if (!subject) throw new TRPCError3({ code: "NOT_FOUND" });
      return subject;
    })
  }),
  // Sections
  sections: router({
    create: adminProcedure.input(z3.object({
      subjectId: z3.number(),
      title: z3.string().min(1),
      description: z3.string().optional(),
      order: z3.number().optional()
    })).mutation(({ input }) => createSection(input)),
    getBySubject: publicProcedure.input(z3.object({ subjectId: z3.number() })).query(({ input }) => getSectionsBySubject(input.subjectId))
  }),
  // Questions
  questions: router({
    create: adminProcedure.input(z3.object({
      sectionId: z3.number(),
      text: z3.string().min(1),
      options: z3.array(z3.object({ id: z3.string(), text: z3.string() })),
      correctOptionId: z3.string(),
      explanation: z3.string().optional(),
      explanationLink: z3.string().optional(),
      aiPrompt: z3.string().optional()
    })).mutation(({ input }) => createQuestion(input)),
    getBySection: publicProcedure.input(z3.object({ sectionId: z3.number() })).query(({ input }) => getQuestionsBySection(input.sectionId)),
    bulkImport: adminProcedure.input(z3.object({
      sectionId: z3.number(),
      questions: z3.array(z3.object({
        text: z3.string(),
        options: z3.array(z3.object({ id: z3.string(), text: z3.string() })),
        correctOptionId: z3.string(),
        explanation: z3.string().optional()
      }))
    })).mutation(async ({ input }) => {
      const results = [];
      for (const q of input.questions) {
        const result = await createQuestion({
          sectionId: input.sectionId,
          ...q
        });
        results.push(result);
      }
      return results;
    })
  }),
  // Exams
  exams: router({
    create: adminProcedure.input(z3.object({
      subjectId: z3.number(),
      title: z3.string().min(1),
      description: z3.string().optional(),
      type: z3.enum(["free", "paid"]),
      totalQuestions: z3.number().min(1),
      sectionDistribution: z3.array(z3.object({ sectionId: z3.number(), count: z3.number() })),
      timeLimit: z3.number().optional(),
      passingScore: z3.number().optional()
    })).mutation(async ({ ctx, input }) => {
      return createExam({
        ...input,
        createdBy: ctx.user.id
      });
    }),
    getById: publicProcedure.input(z3.object({ id: z3.number() })).query(({ input }) => getExamById(input.id)),
    getBySubject: publicProcedure.input(z3.object({ subjectId: z3.number() })).query(({ input }) => getExamsBySubject(input.subjectId)),
    getQuestions: publicProcedure.input(z3.object({ examId: z3.number() })).query(async ({ input }) => {
      const exam = await getExamById(input.examId);
      if (!exam) throw new TRPCError3({ code: "NOT_FOUND" });
      const distribution = exam.sectionDistribution;
      const allQuestions = [];
      for (const dist of distribution) {
        const questions2 = await getQuestionsBySection(dist.sectionId);
        const shuffled = questions2.sort(() => Math.random() - 0.5).slice(0, dist.count);
        allQuestions.push(...shuffled);
      }
      return allQuestions.sort(() => Math.random() - 0.5);
    })
  }),
  // Exam Codes
  examCodes: router({
    create: adminProcedure.input(z3.object({
      examId: z3.number(),
      maxUses: z3.number().optional(),
      expiresAt: z3.date().optional()
    })).mutation(async ({ input }) => {
      const code = nanoid(10).toUpperCase();
      return createExamCode({
        ...input,
        code,
        isActive: true
      });
    }),
    validate: publicProcedure.input(z3.object({ code: z3.string() })).query(async ({ input }) => {
      const examCode = await getExamCodeByCode(input.code);
      if (!examCode) throw new TRPCError3({ code: "NOT_FOUND", message: "\u0627\u0644\u0643\u0648\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" });
      if (!examCode.isActive) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u0627\u0644\u0643\u0648\u062F \u063A\u064A\u0631 \u0646\u0634\u0637" });
      }
      if (examCode.expiresAt && /* @__PURE__ */ new Date() > examCode.expiresAt) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0643\u0648\u062F" });
      }
      if (examCode.maxUses && examCode.currentUses && examCode.currentUses >= examCode.maxUses) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u062A\u0645 \u0627\u0633\u062A\u0646\u0641\u0627\u062F \u0639\u062F\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0627\u062A \u0627\u0644\u0643\u0648\u062F" });
      }
      return { examId: examCode.examId, valid: true };
    }),
    getByExam: adminProcedure.input(z3.object({ examId: z3.number() })).query(({ input }) => getExamCodesByExam(input.examId))
  }),
  // Exam Results
  results: router({
    submit: protectedProcedure.input(z3.object({
      examId: z3.number(),
      answers: z3.array(z3.object({
        questionId: z3.number(),
        selectedOptionId: z3.string()
      })),
      examCodeId: z3.number().optional(),
      startedAt: z3.date()
    })).mutation(async ({ ctx, input }) => {
      const exam = await getExamById(input.examId);
      if (!exam) throw new TRPCError3({ code: "NOT_FOUND" });
      let totalCorrect = 0;
      const sectionScores = [];
      const processedAnswers = [];
      for (const answer of input.answers) {
        const isCorrect = true;
        processedAnswers.push({
          ...answer,
          isCorrect
        });
        if (isCorrect) totalCorrect++;
      }
      const totalScore = totalCorrect / input.answers.length * 100;
      const result = await createExamResult({
        examId: input.examId,
        userId: ctx.user.id,
        examCodeId: input.examCodeId,
        totalScore,
        sectionScores,
        answers: processedAnswers,
        startedAt: input.startedAt,
        completedAt: /* @__PURE__ */ new Date()
      });
      return result;
    }),
    getByUser: protectedProcedure.query(({ ctx }) => getExamResultsByUser(ctx.user.id))
  }),
  // Assessment Texts
  assessmentTexts: router({
    create: adminProcedure.input(z3.object({
      examId: z3.number(),
      minScore: z3.number(),
      maxScore: z3.number(),
      text: z3.string(),
      sectionConditions: z3.array(z3.object({
        sectionId: z3.number(),
        minScore: z3.number(),
        maxScore: z3.number(),
        text: z3.string()
      })).optional()
    })).mutation(({ input }) => createAssessmentText(input)),
    getByExam: publicProcedure.input(z3.object({ examId: z3.number() })).query(({ input }) => getAssessmentTextsByExam(input.examId))
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  registerChatRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);

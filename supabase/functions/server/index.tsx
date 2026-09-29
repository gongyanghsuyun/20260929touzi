import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const FUNCTION_PREFIX = "/make-server-7d94821b";
const DISCLAIMER = "本报告用于研究整理，不构成任何投资建议。市场数据可能存在延迟，请以交易所及基金公告为准。";
const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

type User = { id: string };
type TushareTable = { fields?: string[]; items?: unknown[][] };
type ResearchKind = "stock" | "fund";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "服务暂时不可用";
}

function jsonError(c: any, status: number, error: string) {
  return c.json({ error }, status);
}

async function requireUser(c: any): Promise<User | Response> {
  const authorization = c.req.header("Authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return jsonError(c, 401, "请先登录后再使用云端功能");

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return jsonError(c, 500, "Supabase 服务端配置缺失");

  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return jsonError(c, 401, "登录已失效，请重新登录");
  return { id: data.user.id };
}

function rows(table?: TushareTable) {
  if (!table?.fields || !table.items) return [];
  return table.items.map((values) => Object.fromEntries(table.fields!.map((field, index) => [field, values[index]])));
}

async function tushare(apiName: string, params: Record<string, string>) {
  const token = Deno.env.get("TUSHARE_TOKEN");
  if (!token) throw new Error("未配置 TUSHARE_TOKEN，无法获取市场数据");
  const response = await fetch("https://api.tushare.pro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_name: apiName, token, params }),
  });
  if (!response.ok) throw new Error(`Tushare 请求失败（HTTP ${response.status}）`);
  const body = await response.json();
  if (body.code !== 0) throw new Error(`Tushare：${body.msg || "数据请求失败"}`);
  return body.data as TushareTable;
}

function toStockCode(query: string) {
  const match = query.trim().toUpperCase().match(/^(\d{6})(?:\.(SH|SZ|BJ))?$/);
  if (!match) return null;
  if (match[2]) return `${match[1]}.${match[2]}`;
  const exchange = match[1].startsWith("6") ? "SH" : match[1].startsWith("8") || match[1].startsWith("4") ? "BJ" : "SZ";
  return `${match[1]}.${exchange}`;
}

async function collectMarketData(query: string) {
  const stockCode = toStockCode(query);
  if (!stockCode) {
    return {
      kind: "stock" as ResearchKind,
      asset: { name: query.trim(), query: query.trim() },
      facts: ["未能从名称直接唯一匹配 Tushare 标的；请改用 6 位股票或基金代码以获取实时市场数据。"],
      sources: [],
    };
  }

  try {
    const basic = await tushare("stock_basic", { ts_code: stockCode, list_status: "L", fields: "ts_code,symbol,name,area,industry,market,list_date" });
    const asset = rows(basic)[0];
    if (asset) {
      let latest = {};
      try {
        latest = rows(await tushare("daily_basic", { ts_code: stockCode, fields: "ts_code,trade_date,close,pe,pb,total_mv,circ_mv,turnover_rate" }))[0] || {};
      } catch (error) {
        console.warn("daily_basic lookup failed", errorMessage(error));
      }
      return {
        kind: "stock" as ResearchKind,
        asset: { ...asset, ...latest },
        facts: Object.entries({ ...asset, ...latest }).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => `${key}: ${value}`),
        sources: ["stock_basic", ...(Object.keys(latest).length ? ["daily_basic"] : [])],
      };
    }
  } catch (error) {
    // A six-digit fund code can overlap with a stock code. Try the fund endpoint below.
    console.warn("stock lookup failed", errorMessage(error));
  }

  const fundCode = `${query.trim().split(".")[0]}.OF`;
  const fund = await tushare("fund_basic", { ts_code: fundCode, market: "E", status: "L", fields: "ts_code,name,management,custodian,fund_type,found_date,list_date" });
  const asset = rows(fund)[0];
  if (!asset) throw new Error("未找到该标的。请检查代码，或使用上市股票 / 公募基金的 6 位代码。");
  return {
    kind: "fund" as ResearchKind,
    asset,
    facts: Object.entries(asset).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => `${key}: ${value}`),
    sources: ["fund_basic"],
  };
}

function safeAnalysis(value: unknown) {
  const analysis = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const asList = (key: string) => Array.isArray(analysis[key]) ? analysis[key].filter((item): item is string => typeof item === "string").slice(0, 6) : [];
  return {
    fact_summary: asList("fact_summary"),
    ai_inferences: asList("ai_inferences"),
    risks_to_verify: asList("risks_to_verify"),
    research_questions: asList("research_questions"),
    disclaimer: DISCLAIMER,
  };
}

async function generateAnalysis(query: string, market: Awaited<ReturnType<typeof collectMarketData>>) {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("未配置 DEEPSEEK_API_KEY，无法生成研究报告");
  const prompt = `你是谨慎的中文投资研究助理。仅依据以下数据整理，不得编造价格、财务数值、公告或推荐。输出严格 JSON：{\"fact_summary\":[string],\"ai_inferences\":[string],\"risks_to_verify\":[string],\"research_questions\":[string]}。每个数组 2-5 项，简洁中文。用户查询：${query}\n标的类型：${market.kind}\n结构化数据：${JSON.stringify(market.asset)}\n可核实字段：${market.facts.join("；") || "无"}`;
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek 请求失败（HTTP ${response.status}）：${body.slice(0, 180)}`);
  }
  const body = await response.json();
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("DeepSeek 未返回可解析的研究内容");
  try {
    return safeAnalysis(JSON.parse(content));
  } catch {
    throw new Error("DeepSeek 返回格式异常，请稍后重试");
  }
}

app.get(`${FUNCTION_PREFIX}/health`, (c) => c.json({ status: "ok" }));

app.get(`${FUNCTION_PREFIX}/workspace`, async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  try {
    return c.json({ workspace: await kv.get(`workspace:${user.id}`) ?? null });
  } catch (error) {
    return jsonError(c, 500, `读取工作区失败：${errorMessage(error)}`);
  }
});

app.put(`${FUNCTION_PREFIX}/workspace`, async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  try {
    const workspace = await c.req.json();
    if (!workspace || typeof workspace !== "object") return jsonError(c, 400, "工作区数据格式无效");
    await kv.set(`workspace:${user.id}`, workspace);
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(c, 500, `保存工作区失败：${errorMessage(error)}`);
  }
});

app.post(`${FUNCTION_PREFIX}/research`, async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  try {
    const { query } = await c.req.json();
    if (typeof query !== "string" || !query.trim()) return jsonError(c, 400, "请输入股票或基金代码");
    const market = await collectMarketData(query.trim());
    const analysis = await generateAnalysis(query.trim(), market);
    const fetchedAt = new Date().toISOString();
    return c.json({ report: {
      id: crypto.randomUUID(), query: query.trim(), kind: market.kind, asset: market.asset,
      analysis, fetchedAt,
      sources: market.sources.map((endpoint) => ({ provider: "Tushare", endpoint, fetchedAt })),
      disclaimer: DISCLAIMER,
    } });
  } catch (error) {
    return jsonError(c, 502, errorMessage(error));
  }
});

Deno.serve(app.fetch);

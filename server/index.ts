import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, _req: Request, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function isMetroRequest(req: Request): boolean {
  const p = req.path;
  if (p === "/status" || p === "/symbolicate" || p === "/open-stack-frame") return true;
  if (p.endsWith(".bundle") || p.endsWith(".map")) return true;
  if (p.startsWith("/__metro") || p.startsWith("/debugger-ui")) return true;
  if (p.startsWith("/node_modules/")) return true;
  if (p.startsWith("/expo-router/") || p.startsWith("/@expo/")) return true;
  const platform = req.header("expo-platform");
  if (platform === "ios" || platform === "android") return true;
  return false;
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  const staticBuildPath = path.resolve(process.cwd(), "static-build");
  const isDev = !fs.existsSync(staticBuildPath);

  log(`Expo routing: ${isDev ? "dev (proxying to Metro on :8081)" : "production (serving static-build)"}`);

  // In development, use http-proxy-middleware to forward Metro traffic
  const metroProxy = createProxyMiddleware({
    target: "http://localhost:8081",
    changeOrigin: true,
    ws: true,
    on: {
      error: (err, req, res) => {
        log(`Metro proxy error: ${(err as Error).message}`);
        if (!("headersSent" in res && res.headersSent)) {
          (res as Response).status(503).json({ error: "Metro bundler not available." });
        }
      },
    },
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (isDev && isMetroRequest(req)) {
      log(`[Metro proxy] ${req.method} ${req.path}`);
      return metroProxy(req, res, next);
    }

    if ((req.path === "/" || req.path === "/manifest") && !isDev) {
      const platform = req.header("expo-platform");
      if (platform === "ios" || platform === "android") {
        return serveExpoManifest(platform, req, res);
      }
    }

    if (req.path === "/") {
      return serveLandingPage({ req, res, landingPageTemplate, appName });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  if (!isDev) {
    app.use(express.static(staticBuildPath));
  }
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

const BUNDLE_PARAMS =
  "dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1" +
  "&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable";
const BUNDLE_ENTRY = "node_modules/expo-router/entry.bundle";

async function prewarmBundle(platform: "android" | "ios") {
  const url = `http://localhost:8081/${BUNDLE_ENTRY}?platform=${platform}&${BUNDLE_PARAMS}`;
  try {
    log(`[Prewarm] Compiling ${platform} bundle…`);
    const res = await fetch(url);
    if (res.ok) {
      await res.arrayBuffer(); // fully consume so Metro caches it
      log(`[Prewarm] ${platform} bundle ready`);
    } else {
      log(`[Prewarm] ${platform} bundle returned ${res.status}`);
    }
  } catch (e) {
    log(`[Prewarm] ${platform} bundle failed: ${(e as Error).message}`);
  }
}

async function prewarmInBackground() {
  // Give Metro time to start before hitting it
  await new Promise((r) => setTimeout(r, 8000));
  await prewarmBundle("android");
  await prewarmBundle("ios");
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
      prewarmInBackground();
    },
  );
})();

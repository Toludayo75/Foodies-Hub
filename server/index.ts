import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import createTestUsers from "./createTestUsers";
import { db, initializeDatabase } from "./db"; // updated import
import session from "express-session";
import { config } from "./config";
import { autoPaymentService } from "./autoPaymentCompletion";
import fileUpload from "express-fileupload";
import fs from "fs";
import path from "path";
import MemoryStore from "memorystore";

// Load environment variables
dotenv.config();
console.log(
  "Environment loaded, Paystack key available:",
  process.env.PAYSTACK_LIVE_SECRET_KEY ? "Yes" : "No"
);
console.log(
  "Loading Gemini API key:",
  process.env.GEMINI_API_KEY ? "Key found" : "Key missing"
);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// File upload middleware
app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// Ensure uploads directory exists
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Session setup
const MemoryStoreSession = MemoryStore(session);
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(
  session({
    store: new MemoryStoreSession({ checkPeriod: 86400000 }),
    secret: config.sessionSecret,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// API logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const pathReq = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathReq.startsWith("/api")) {
      let logLine = `${req.method} ${pathReq} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize DB
  try {
    await initializeDatabase();
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1); // stop deploy if DB fails
  }

  const server = await registerRoutes(app);

  // Auto-payment service disabled for test environments
  // autoPaymentService.start();

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Vite setup only in development
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const port = 5000;
  server.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => {
      log(`Server running on port ${port}`);
      createTestUsers();
    }
  );
})();

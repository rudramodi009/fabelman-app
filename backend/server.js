import express from "express";
import { connectToDB } from "./config/db.js";
import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import User from "./models/user.model.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

dotenv.config();

// --------------------------------------------------
// Environment validation
// --------------------------------------------------

const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "GOOGLE_API_KEY",
  "ACCESS_PASSKEY",
  "CLIENT_URL",
  "TMDB_ACCESS_TOKEN",
  "OMDB_API_KEY",
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnv.join(", ")}`,
  );
  process.exit(1);
}

// --------------------------------------------------
// App configuration
// --------------------------------------------------

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const isProduction = process.env.NODE_ENV === "production";

const CLIENT_URL = process.env.CLIENT_URL.replace(/\/$/, "");

const JWT_ISSUER = "fabelman-api";
const JWT_AUDIENCE = "fabelman-client";

if (isProduction && !CLIENT_URL.startsWith("https://")) {
  console.error("In production, CLIENT_URL must use HTTPS.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

// --------------------------------------------------
// Security middleware
// --------------------------------------------------

app.disable("x-powered-by");

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        // Allow Vite and DevTools to use eval() in development mode[cite: 18, 19]
        scriptSrc: isProduction
          ? ["'self'"]
          : ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://image.tmdb.org",
          "https://*.tmdb.org",
        ],
        connectSrc: ["'self'", process.env.CLIENT_URL],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    frameguard: {
      action: "deny",
    },
    hidePoweredBy: true,
    noSniff: true,
  }),
);

app.use(
  express.json({
    limit: "10kb",
  }),
);

app.use(cookieParser());

// --------------------------------------------------
// CORS
// --------------------------------------------------

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without Origin (e.g. server-to-server)[cite: 18]
      if (!origin) {
        return callback(null, true);
      }

      if (origin === CLIENT_URL) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy: origin not allowed"));
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// --------------------------------------------------
// Rate limiting
// --------------------------------------------------

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

app.use(generalLimiter);

// --------------------------------------------------
// Zod schemas
// --------------------------------------------------

const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, "Email address is too long")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    accessPasskey: z
      .string()
      .min(1, "Access passkey is required")
      .max(256, "Access passkey is too long"),
  })
  .strict();

const loginSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, "Username is required")
      .max(30, "Username is too long"),
    password: z
      .string()
      .min(1, "Password is required")
      .max(128, "Password is too long"),
  })
  .strict();

const aiRecommendationSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1, "Prompt is required")
      .max(4000, "Prompt is too long"),
  })
  .strict();

// --------------------------------------------------
// Validation Middleware
// --------------------------------------------------

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: result.error.issues[0]?.message || "Invalid request data",
    });
  }

  // Replace request body with sanitized Zod data
  req.body = result.data;
  next();
};

// --------------------------------------------------
// Cookie helper
// --------------------------------------------------

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

// --------------------------------------------------
// JWT
// --------------------------------------------------

const createAuthToken = (userId) => {
  return jwt.sign(
    {
      id: userId.toString(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
};

const setAuthCookie = (res, userId) => {
  const token = createAuthToken(userId);
  res.cookie("token", token, getCookieOptions());
};

// --------------------------------------------------
// Public user response
// --------------------------------------------------

const getPublicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
});

// --------------------------------------------------
// Authentication middleware
// --------------------------------------------------

const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (!decoded?.id) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Use .lean() to speed up proxy route execution
    const userDoc = await User.findById(decoded.id).lean();

    if (!userDoc) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    req.user = userDoc;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired session",
    });
  }
};

// --------------------------------------------------
// AI rate limiter
// --------------------------------------------------

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => {
    return req.user._id.toString();
  },
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many AI requests. Please try again later.",
  },
});

// --------------------------------------------------
// TMDB rate limiter
// --------------------------------------------------

const tmdbLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  keyGenerator: (req) => {
    return req.user._id.toString();
  },
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many movie data requests. Please try again later.",
  },
});

// --------------------------------------------------
// OMDb rate limiter
// --------------------------------------------------

const omdbLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => {
    return req.user._id.toString();
  },
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many ratings requests. Please try again later.",
  },
});

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Movie API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------
// AI Recommendation
// --------------------------------------------------

app.post(
  "/api/ai/recommend",
  requireAuth,
  aiLimiter,
  validate(aiRecommendationSchema),
  async (req, res) => {
    try {
      const { prompt } = req.body;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.status(200).json({
        result: response.text,
      });
    } catch (error) {
      console.error("Gemini API error:", error.message);

      return res.status(502).json({
        message: "Failed to generate recommendations",
      });
    }
  },
);

// --------------------------------------------------
// Signup
// --------------------------------------------------

app.post(
  "/api/signup",
  authLimiter,
  validate(signupSchema),
  async (req, res) => {
    try {
      const { username, email, password, accessPasskey } = req.body;

      if (accessPasskey !== process.env.ACCESS_PASSKEY) {
        return res.status(403).json({
          message: "Invalid access passkey",
        });
      }

      const hashedPassword = await bcryptjs.hash(password, 12);

      const userDoc = await User.create({
        username,
        email,
        password: hashedPassword,
      });

      setAuthCookie(res, userDoc._id);

      return res.status(201).json({
        user: getPublicUser(userDoc),
        message: "Entered in Hell",
      });
    } catch (error) {
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {})[0];

        if (duplicateField === "email") {
          return res.status(409).json({
            message: "Email already exists",
          });
        }

        if (duplicateField === "username") {
          return res.status(409).json({
            message: "Username already exists",
          });
        }

        return res.status(409).json({
          message: "User already exists",
        });
      }

      console.error("Signup error:", error.message);

      return res.status(500).json({
        message: "Failed to create account",
      });
    }
  },
);

// --------------------------------------------------
// Login
// --------------------------------------------------

app.post("/api/login", authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    const userDoc = await User.findOne({ username }).select("+password");

    if (!userDoc) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcryptjs.compare(password, userDoc.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    setAuthCookie(res, userDoc._id);

    return res.status(200).json({
      user: getPublicUser(userDoc),
      message: "Logged in successfully",
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed",
    });
  }
});

// --------------------------------------------------
// Fetch Current User
// --------------------------------------------------

app.get("/api/fetch-user", requireAuth, (req, res) => {
  return res.status(200).json({
    user: getPublicUser(req.user),
  });
});

// --------------------------------------------------
// Logout
// --------------------------------------------------

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", getCookieOptions());

  return res.status(200).json({
    message: "Subscription of Hell is over",
  });
});

// --------------------------------------------------
// TMDB API Proxy
// --------------------------------------------------

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const tmdbToken = process.env.TMDB_ACCESS_TOKEN;
if (!tmdbToken) {
  console.error("TMDB_ACCESS_TOKEN is missing.");
}

app.use("/api/tmdb", requireAuth, tmdbLimiter, async (req, res) => {
  try {
    const tmdbPath = req.path.replace(/^\/+/, "");

    if (!tmdbToken) {
      return res.status(500).json({
        message: "TMDB API is not configured",
      });
    }

    if (tmdbPath.includes("..") || tmdbPath.includes("\\")) {
      return res.status(400).json({
        message: "Invalid TMDB path",
      });
    }

    const allowedPrefixes = [
      "search",
      "movie",
      "tv",
      "person",
      "trending",
      "discover",
      "genre",
      "configuration",
    ];

    const isAllowed = allowedPrefixes.some(
      (prefix) => tmdbPath === prefix || tmdbPath.startsWith(`${prefix}/`),
    );

    if (!isAllowed) {
      return res.status(403).json({
        message: "TMDB endpoint is not allowed",
      });
    }

    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value !== "string") {
        continue;
      }

      if (key === "api_key" || key === "callback") {
        continue;
      }

      query.set(key, value);
    }

    const tmdbUrl =
      `${TMDB_BASE_URL}/${tmdbPath}` +
      (query.toString() ? `?${query.toString()}` : "");

    const tmdbResponse = await fetch(tmdbUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tmdbToken}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    const contentType = tmdbResponse.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await tmdbResponse.json();
    } else {
      const text = await tmdbResponse.text();
      console.error(
        "TMDB returned a non-JSON response:",
        tmdbResponse.status,
        text.slice(0, 300),
      );

      return res.status(502).json({
        message: "Invalid response from TMDB",
      });
    }

    if (!tmdbResponse.ok) {
      console.error("TMDB request failed:", tmdbResponse.status, data);

      return res.status(tmdbResponse.status).json({
        message: data?.status_message || "TMDB request failed",
        tmdbStatusCode: data?.status_code,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("TMDB NETWORK ERROR:", error.name, error.message);

    if (error.name === "TimeoutError") {
      return res.status(504).json({
        message: "TMDB request timed out",
      });
    }

    return res.status(502).json({
      message: "Unable to connect to TMDB",
    });
  }
});

// --------------------------------------------------
// OMDb API Proxy
// --------------------------------------------------

app.get("/api/omdb/:imdbId", requireAuth, omdbLimiter, async (req, res) => {
  try {
    const { imdbId } = req.params;

    if (typeof imdbId !== "string" || !/^tt\d{7,10}$/.test(imdbId)) {
      return res.status(400).json({
        message: "Invalid IMDb ID",
      });
    }

    const omdbUrl = `https://www.omdbapi.com/?apikey=${encodeURIComponent(
      process.env.OMDB_API_KEY,
    )}&i=${encodeURIComponent(imdbId)}`;

    const omdbResponse = await fetch(omdbUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    const contentType = omdbResponse.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      return res.status(502).json({
        message: "Invalid response from OMDb",
      });
    }

    const data = await omdbResponse.json();

    if (data.Response === "False") {
      return res.status(404).json({
        message: data.Error || "Ratings not found",
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("OMDb API error:", error.message);

    return res.status(502).json({
      message: "Failed to fetch ratings",
    });
  }
});

// --------------------------------------------------
// 404 API handler
// --------------------------------------------------

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found",
  });
});

// --------------------------------------------------
// Global error handler
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: "Internal server error",
  });
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

const startServer = async () => {
  try {
    await connectToDB();

    const server = app.listen(PORT, () => {
      console.log(`Fabelman API running on port ${PORT}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

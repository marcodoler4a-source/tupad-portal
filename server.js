require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

// Serve the login page explicitly. Do not expose the project root as a static folder:
// doing so could accidentally publish .env or server-side source files.
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.use(express.static(path.join(__dirname, "public"), {
  index: false,
  dotfiles: "deny",
  etag: true
}));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, service: "TUPAD Portal API" });
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes."
  }
});

app.post("/api/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" ||
        !username.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your username and password."
      });
    }

    const storedUsername = process.env.PORTAL_USERNAME;
    const storedPasswordHash = process.env.PORTAL_PASSWORD_HASH;

    if (!storedUsername || !storedPasswordHash || !JWT_SECRET) {
      console.error("Missing PORTAL_USERNAME, PORTAL_PASSWORD_HASH, or JWT_SECRET in .env");
      return res.status(500).json({
        success: false,
        message: "The authentication system is not configured. Please contact the administrator."
      });
    }

    const [usernameMatches, passwordMatches] = await Promise.all([
      Promise.resolve(username.trim() === storedUsername),
      bcrypt.compare(password, storedPasswordHash)
    ]);

    if (!usernameMatches || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    const token = jwt.sign(
      { username: storedUsername },
      JWT_SECRET,
      { expiresIn: "8h", issuer: "tupad-portal" }
    );

    return res.json({
      success: true,
      message: "Authentication successful.",
      token,
      user: { username: storedUsername },
      redirectUrl: "/dashboard.html"
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred."
    });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }
  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Authentication system is not configured."
    });
  }

  jwt.verify(token, JWT_SECRET, { issuer: "tupad-portal" }, (err, user) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid."
      });
    }
    req.user = user;
    next();
  });
}

app.get("/api/me", authenticateToken, (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    success: true,
    user: { username: req.user.username }
  });
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ success: false, message: "API endpoint not found." });
  }
  res.status(404).send("Page not found.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TUPAD Portal running at http://localhost:${PORT}`);
  console.log("Health check: http://localhost:" + PORT + "/api/health");
});


require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));

// Serve your HTML, CSS, and JavaScript files
app.use(express.static(path.join(__dirname, "public")));

// Limit repeated login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again later."
    }
});

// Login API
app.post("/api/login", loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter your username and password."
            });
        }

        const storedUsername = process.env.PORTAL_USERNAME;
        const storedPasswordHash = process.env.PORTAL_PASSWORD_HASH;
        const jwtSecret = process.env.JWT_SECRET;

        if (!storedUsername || !storedPasswordHash || !jwtSecret) {
            console.error("Authentication environment variables are missing.");

            return res.status(500).json({
                success: false,
                message: "Authentication system is not configured."
            });
        }

        const usernameMatches = username.trim() === storedUsername;
        const passwordMatches = await bcrypt.compare(
            password,
            storedPasswordHash
        );

        if (!usernameMatches || !passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        // Generate authenticated session token
        const token = jwt.sign(
            { username: storedUsername },
            jwtSecret,
            { expiresIn: "8h" }
        );

        return res.json({
            success: true,
            message: "Authentication successful!",
            token: token,
            user: {
                username: storedUsername
            },
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

// Authentication middleware for protected API routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: "Session expired or invalid."
            });
        }

        req.user = user;
        next();
    });
}

// Example protected endpoint
app.get("/api/me", authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: {
            username: req.user.username
        }
    });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`TUPAD Portal running on port ${PORT}`);
});


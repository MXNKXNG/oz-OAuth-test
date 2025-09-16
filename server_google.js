const express = require("express");
const session = require("express-session");
const cors = require("cors");
const axios = require("axios");
const PORT = 3000;
require("dotenv").config();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/auth/google/callback";
const SCOPE = "profile";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5500"],
    methods: ["OPTIONS", "POST", "DELETE", "GET"],
    credentials: true,
  })
);

app.use(
  session({
    name: "session_id",
    secret: "session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60,
    },
  })
);

app.get("/auth/google", (req, res) => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${REDIRECT_URI}&client_id=${GOOGLE_CLIENT_ID}&response_type=code&scope=${SCOPE}`;
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const authorizationCode = req.query.code;

  const params = new URLSearchParams({
    code: authorizationCode,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  });

  const tokenRes = await axios.post(
    "https://oauth2.googleapis.com/token",
    params.toString()
  );

  const accessToken = tokenRes.data.access_token;

  const userRes = await axios.get(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  req.session.user = {
    profile_image: userRes.data.picture,
    name: userRes.data.name,
  };
  req.session.token = accessToken;

  return res.redirect("http://localhost:5500");
});

app.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }
  return res.json(req.session.user);
});

app.post("/auth/google/logout", async (req, res) => {
  try {
    const accessToken = req.session.token;

    if (!accessToken) {
      return res.status(401).json({ ok: false, message: "No token" });
    }

    if (accessToken) {
      try {
        const params = new URLSearchParams({
          token: accessToken,
        });
        await axios.post(
          "https://oauth2.googleapis.com/revoke",
          params.toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            },
          }
        );
      } catch (err) {
        console.log(err || "Google unlink failed");
      }

      req.session.destroy(() => {
        res.clearCookie("session_id");
        return res.status(200).json({ ok: true, message: "세션 삭제 완료" });
      });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Logout failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server Open: http://localhost:${PORT}`);
});

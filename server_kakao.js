const express = require("express");
const session = require("express-session");
const cors = require("cors");
const axios = require("axios");
const PORT = 3000;
require("dotenv").config();
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const REDIRECT_URI = "http://localhost:3000/auth/kakao/callback";

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

app.get("/auth/kakao", (req, res) => {
  const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${KAKAO_CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(url);
});

app.get("/auth/kakao/callback", async (req, res) => {
  const authorizationCode = req.query.code;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code: authorizationCode,
  });

  const tokenRes = await axios.post(
    "https://kauth.kakao.com/oauth/token",
    params.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    }
  );
  const accessToken = tokenRes.data.access_token;

  const userRes = await axios.get("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  req.session.user = userRes.data.properties;
  req.session.token = accessToken;

  return res.redirect("http://localhost:5500");
});

app.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }
  return res.json(req.session.user);
});

app.post("/auth/kakao/logout", async (req, res) => {
  try {
    const accessToken = req.session.token;

    if (!accessToken) {
      return res.status(401).json({ ok: false, message: "No token" });
    }

    if (accessToken) {
      try {
        await axios.post("https://kapi.kakao.com/v1/user/logout", null, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (err) {
        console.log(err || "Kakao unlink failed");
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

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const axios = require("axios");
const PORT = 3000;
require("dotenv").config();
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const STATE = process.env.NAVER_CLIENT_STATE;
const REDIRECT_URI = "http://localhost:3000/auth/naver/callback";

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

app.get("/auth/naver", (req, res) => {
  const url = `https://nid.naver.com/oauth2.0/authorize?client_id=${NAVER_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&state=${STATE}`;
  res.redirect(url);
});

app.get("/auth/naver/callback", async (req, res) => {
  const authorizationCode = req.query.code;

  const tokenRes = await axios.post(
    `https://nid.naver.com/oauth2.0/token?client_id=${NAVER_CLIENT_ID}&client_secret=${NAVER_CLIENT_SECRET}&grant_type=authorization_code&state=${STATE}&code=${authorizationCode}`
  );

  const accessToken = tokenRes.data.access_token;

  const userRes = await axios.get("https://openapi.naver.com/v1/nid/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  req.session.user = {
    profile_image: userRes.data.response.profile_image,
    name: userRes.data.response.name,
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

app.post("/auth/naver/logout", async (req, res) => {
  try {
    const accessToken = req.session.token;

    if (!accessToken) {
      return res.status(401).json({ ok: false, message: "No token" });
    }

    if (accessToken) {
      try {
        await axios.post(
          `https://nid.naver.com/oauth2.0/token?grant_type=delete&client_id=${NAVER_CLIENT_ID}&client_secret=${NAVER_CLIENT_SECRET}&access_token=${accessToken}&service_provider=NAVER`
        );
      } catch (err) {
        console.log(err || "Naver unlink failed");
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

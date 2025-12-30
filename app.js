import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serves index.html

// OAuth callback
app.get("/callback", (req, res) => {
  res.redirect("/?code=" + req.query.code);
});

// Exchange code + call MCP
app.post("/exchange", async (req, res) => {
  try {
    const { code } = req.body;

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);

    // ✅ UPDATED redirect_uri
    params.append("redirect_uri", "https://callback.mistral.ai@stripe-2pke.onrender.com/callback");

    // ✅ UPDATED client_id
    params.append("client_id", "oacli_ThHPvdbfGDl2MF");

    // PKCE verifier (unchanged)
    params.append(
      "code_verifier",
      "zBnKB-IrTs8SPUwW69DmsxbddFiO2NIO5yJE_qdvR1Y"
    );

    // 1️⃣ Exchange authorization code for access token
    const tokenRes = await fetch("https://access.stripe.com/mcp/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: params.toString()
    });

    const token = await tokenRes.json();
    if (!token.access_token) return res.status(400).json(token);

    // 2️⃣ Call Stripe MCP endpoint
    const mcpRes = await fetch("https://mcp.stripe.com/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "customers_create",
          input: {
            name: "Nikhil Kaushik",
            email: "asidasuhdih@gmail.com"
          }
        }
      })
    });

    const data = await mcpRes.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port", PORT));

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleAuth } from "npm:google-auth-library@9.2.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const raw = Deno.env.get("SERVICE_ACCOUNT_JSON");
    if (!raw) return json({ error: "SERVICE_ACCOUNT_JSON missing" }, 500);

    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(raw);
    } catch (e: any) {
      return json({ error: "SERVICE_ACCOUNT_JSON invalid JSON", detail: e.message }, 500);
    }

    const { token, title, body } = await req.json().catch(() => ({}));
    if (!token) return json({ error: "Missing FCM token" }, 400);

    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken?.token) {
      return json({ error: "Failed to obtain access token" }, 500);
    }

    const projectId = serviceAccount.project_id;
    if (!projectId) {
      return json({ error: "Missing project_id in service account" }, 500);
    }

    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: title ?? "New message",
              body: body ?? "You received a notification",
            },
          },
        }),
      }
    );

    const text = await fcmRes.text();
    return new Response(text, {
      status: fcmRes.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    console.error("sendPushV2 error:", err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});

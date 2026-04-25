import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";

interface PaymentsDeps {
  supabaseAdmin: SupabaseClient;
  paystackSecretKey: string;
  webUrl: string;
}

export function registerPaymentsRoutes(app: Express, deps: PaymentsDeps) {
  const { supabaseAdmin, paystackSecretKey, webUrl } = deps;

  const paystackApiUrl = "https://api.paystack.co";

  app.post("/api/payments/initiate", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({
          status: "error",
          message: "Missing or invalid Authorization header",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { plan } = req.body;

      if (!plan || !["monthly", "per_university", "bundle"].includes(plan)) {
        res.status(400).json({
          status: "error",
          message: "Invalid plan. Must be 'monthly', 'per_university', or 'bundle'",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const pricing = {
        monthly: 200000,
        per_university: 150000,
        bundle: 500000,
      };

      const amount = pricing[plan as keyof typeof pricing];
      const reference = `RS-${user.id.slice(0, 8)}-${Date.now()}`;

      try {
        const paystackRes = await axios.post(
          `${paystackApiUrl}/transaction/initialize`,
          {
            email: user.email,
            amount,
            reference,
            callback_url: `${webUrl}/payments/success?reference=${reference}`,
            metadata: { user_id: user.id, plan },
          },
          {
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
            },
          }
        );

        if (!paystackRes.data.status) {
          throw new Error("Paystack initialization failed");
        }

        await supabaseAdmin.from("subscriptions").insert({
          user_id: user.id,
          plan,
          status: "pending",
          paystack_reference: reference,
          amount,
        });

        res.json({
          status: "success",
          data: {
            authorization_url: paystackRes.data.data.authorization_url,
            reference,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (paystackError) {
        console.error("Paystack error:", paystackError);
        res.status(500).json({
          status: "error",
          message: "Failed to initialize payment",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[payments/initiate] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post("/api/payments/verify", async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;

      if (!reference) {
        res.status(400).json({
          status: "error",
          message: "Missing reference",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      try {
        const paystackRes = await axios.get(
          `${paystackApiUrl}/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
            },
          }
        );

        if (paystackRes.data.status && paystackRes.data.data.status === "success") {
          const metadata = paystackRes.data.data.metadata;
          const { user_id, plan } = metadata;

          const durationDays = plan === "monthly" ? 30 : plan === "bundle" ? 90 : 365;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + durationDays);

          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              expires_at: expiresAt.toISOString(),
            })
            .eq("paystack_reference", reference);

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "active",
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq("id", user_id);

          res.json({
            status: "success",
            data: { success: true },
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(400).json({
            status: "error",
            message: "Payment verification failed",
            timestamp: new Date().toISOString(),
          });
        }
      } catch (paystackError) {
        console.error("Paystack verification error:", paystackError);
        res.status(500).json({
          status: "error",
          message: "Failed to verify payment",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[payments/verify] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post("/api/payments/webhook", async (req: Request, res: Response) => {
    try {
      const hash = crypto
        .createHmac("sha512", paystackSecretKey || "")
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { event, data } = req.body;

      if (event === "charge.success") {
        const { reference, metadata } = data;
        const { user_id, plan } = metadata;

        const durationDays = plan === "monthly" || plan === "bundle" ? 30 : 365;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "active",
            expires_at: expiresAt.toISOString(),
          })
          .eq("paystack_reference", reference);

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq("id", user_id);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[payments/webhook] Error:", error);
      res.status(200).json({ success: true });
    }
  });

  app.get("/api/payments/status", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({
          status: "error",
          message: "Missing or invalid Authorization header",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: subscription } = await supabaseAdmin
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const isActive =
        subscription?.status === "active" &&
        new Date(subscription.expires_at) > new Date();

      res.json({
        status: "success",
        data: {
          subscription_status: isActive ? "active" : "inactive",
          plan: subscription?.plan || null,
          expires_at: subscription?.expires_at || null,
          is_active: isActive,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[payments/status] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}

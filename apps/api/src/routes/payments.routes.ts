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

      if (!plan || !["scholar", "elite"].includes(plan)) {
        res.status(400).json({
          status: "error",
          message: "Invalid plan. Must be 'scholar' or 'elite'",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const pricing = {
        scholar: 350000, // ₦3,500
        elite: 500000,   // ₦5,000
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
          const { user_id, plan, upgrade_to } = metadata;

          // Handle plan upgrade
          if (upgrade_to) {
            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "active",
              })
              .eq("paystack_reference", reference);

            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: upgrade_to,
              })
              .eq("id", user_id);
          } else {
            // Handle plan payment for scholar and elite
            const durationDays = 180; // 6 months for all plans
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
                subscription_status: plan,
                subscription_expires_at: expiresAt.toISOString(),
              })
              .eq("id", user_id);
          }

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
        const { user_id, plan, upgrade_to } = metadata;

        if (upgrade_to) {
          // Handle plan upgrade
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
            })
            .eq("paystack_reference", reference);

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: upgrade_to,
            })
            .eq("id", user_id);
        } else {
          // Handle plan payment for scholar and elite
          const durationDays = 180; // 6 months for all plans
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
              subscription_status: plan,
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq("id", user_id);
        }
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

      // Get subscription status from profiles table (which is the source of truth)
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status, subscription_expires_at")
        .eq("id", user.id)
        .single();

      const isActive =
        profile?.subscription_status &&
        profile.subscription_status !== "explorer" &&
        new Date(profile.subscription_expires_at) > new Date();

      res.json({
        status: "success",
        data: {
          subscription_status: profile?.subscription_status || "explorer",
          expires_at: profile?.subscription_expires_at || null,
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

  app.post("/api/payments/upgrade", async (req: Request, res: Response) => {
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

      const { target_plan } = req.body;

      if (!target_plan || !["explorer", "scholar", "elite"].includes(target_plan)) {
        res.status(400).json({
          status: "error",
          message: "Invalid target plan. Must be 'explorer', 'scholar', or 'elite'",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get user's current subscription
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        res.status(401).json({
          status: "error",
          message: "Profile not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (profile.subscription_status === target_plan) {
        res.status(400).json({
          status: "error",
          message: "You are already on this plan",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get plan prices for current and target plans
      const { data: plans, error: plansError } = await supabaseAdmin
        .from("plan_limits")
        .select("plan_id")
        .in("plan_id", [profile.subscription_status, target_plan]);

      if (plansError || !plans || plans.length < 2) {
        res.status(500).json({
          status: "error",
          message: "Plan not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Define plan pricing (in kobo)
      const planPricing: Record<string, number> = {
        explorer: 0,
        scholar: 500000,
        elite: 1000000,
      };

      const currentPlanPrice = planPricing[profile.subscription_status];
      const targetPlanPrice = planPricing[target_plan];
      const upgradeDifference = Math.max(0, targetPlanPrice - currentPlanPrice);

      if (upgradeDifference === 0) {
        res.status(400).json({
          status: "error",
          message: "No upgrade cost for this plan transition",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const reference = `UPGRADE-${user.id.slice(0, 8)}-${Date.now()}`;

      try {
        const paystackRes = await axios.post(
          `${paystackApiUrl}/transaction/initialize`,
          {
            email: user.email,
            amount: upgradeDifference,
            reference,
            callback_url: `${webUrl}/plans/upgrade/success?reference=${reference}`,
            metadata: {
              user_id: user.id,
              upgrade_from: profile.subscription_status,
              upgrade_to: target_plan,
            },
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

        // Record the pending upgrade
        await supabaseAdmin.from("subscriptions").insert({
          user_id: user.id,
          plan_id: target_plan,
          plan_price: upgradeDifference,
          upgraded_from: profile.subscription_status,
          status: "pending",
          paystack_reference: reference,
        });

        res.json({
          status: "success",
          data: {
            authorization_url: paystackRes.data.data.authorization_url,
            reference,
            upgrade_cost: upgradeDifference,
            from_plan: profile.subscription_status,
            to_plan: target_plan,
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
      console.error("[payments/upgrade] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}

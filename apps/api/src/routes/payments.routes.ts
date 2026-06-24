import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import getFlutterwave from "../lib/flutterwave";
import crypto from "crypto";

interface PaymentsDeps {
  supabaseAdmin: SupabaseClient;
  webUrl: string;
  flwWebhookHash?: string;
}

export function registerPaymentsRoutes(app: Express, deps: PaymentsDeps) {
  const { supabaseAdmin, webUrl, flwWebhookHash } = deps;

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

      if (!plan || !["explorer", "scholar", "elite"].includes(plan)) {
        res.status(400).json({
          status: "error",
          message: "Invalid plan. Must be 'explorer', 'scholar', or 'elite'",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Explorer is free, no payment needed
      if (plan === "explorer") {
        res.status(400).json({
          status: "error",
          message: "Explorer plan is free",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Pricing in kobo (Naira × 100)
      const pricing = {
        explorer: 0,       // Free
        scholar: 350000,   // ₦3,500
        elite: 500000,     // ₦5,000
      };

      const amountInKobo = pricing[plan as keyof typeof pricing];
      const amountInNaira = amountInKobo / 100;
      const tx_ref = `RS-${user.id.slice(0, 8)}-${Date.now()}`;

      // Get user profile
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      try {
        // Insert subscription record with pending status
        await supabaseAdmin.from("subscriptions").insert({
          user_id: user.id,
          plan,
          status: "pending",
          paystack_reference: tx_ref, // Keep column name for now to avoid schema change
          amount: amountInKobo,
        });

        // Return Flutterwave payment config
        const paymentConfig = {
          tx_ref,
          amount: amountInNaira,
          currency: "NGN",
          redirect_url: `${webUrl}/payments/success`,
          customer: {
            email: user.email,
            name: profile?.full_name || "Roman Series Student",
          },
          customizations: {
            title: "Roman Series",
            description: `${plan} subscription`,
            logo: "https://romanseries.com.ng/logo.png",
          },
          payment_options: "card,banktransfer,ussd,opay",
        };

        res.json({
          status: "success",
          data: {
            tx_ref: paymentConfig.tx_ref,
            amount: paymentConfig.amount,
            currency: paymentConfig.currency,
            customer: paymentConfig.customer,
            customizations: paymentConfig.customizations,
            payment_options: paymentConfig.payment_options,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Flutterwave error:", error);
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
      const { transaction_id, tx_ref } = req.body;

      if (!transaction_id || !tx_ref) {
        res.status(400).json({
          status: "error",
          message: "Missing transaction_id or tx_ref",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      try {
        console.log("[payments/verify] Verifying transaction:", { transaction_id, tx_ref });

        // Verify transaction with Flutterwave
        const flutterwave = getFlutterwave();
        if (!flutterwave) {
          res.status(500).json({
            status: "error",
            message: "Flutterwave not configured - missing API keys",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await flutterwave.Transaction.verify({ id: transaction_id });
        console.log("[payments/verify] Flutterwave response:", response.data?.status);

        if (response.data.status === "successful" && response.data.tx_ref === tx_ref) {
          const metadata = response.data.meta || {};
          const { user_id, plan, upgrade_to } = metadata;

          // Extract user_id from tx_ref if not in metadata
          let actualUserId = user_id;
          if (!actualUserId && tx_ref) {
            const txRefParts = tx_ref.split("-");
            if (txRefParts.length >= 2) {
              // Find the subscription record by tx_ref to get user_id
              const { data: subscription } = await supabaseAdmin
                .from("subscriptions")
                .select("user_id, plan")
                .eq("paystack_reference", tx_ref)
                .single();

              if (subscription) {
                actualUserId = subscription.user_id;
              }
            }
          }

          if (!actualUserId) {
            throw new Error("Cannot determine user_id from transaction");
          }

          // Get plan from subscription record if not in metadata
          let actualPlan = plan;
          if (!actualPlan) {
            const { data: subscription } = await supabaseAdmin
              .from("subscriptions")
              .select("plan")
              .eq("paystack_reference", tx_ref)
              .single();

            if (subscription) {
              actualPlan = subscription.plan;
            }
          }

          // Handle plan upgrade
          if (upgrade_to) {
            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "active",
              })
              .eq("paystack_reference", tx_ref);

            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: upgrade_to,
              })
              .eq("id", actualUserId);
          } else {
            // Handle plan payment for scholar and elite
            const durationDays = 180; // 6 months
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + durationDays);

            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "active",
                expires_at: expiresAt.toISOString(),
              })
              .eq("paystack_reference", tx_ref);

            const updateResult = await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: actualPlan,
                subscription_expires_at: expiresAt.toISOString(),
              })
              .eq("id", actualUserId);

            console.log("[payments/verify] Profile updated:", {
              userId: actualUserId,
              plan: actualPlan,
              expiresAt: expiresAt.toISOString(),
              updateError: updateResult.error,
            });
          }

          res.json({
            status: "success",
            data: { success: true, plan: actualPlan },
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(400).json({
            status: "error",
            message: "Payment verification failed",
            timestamp: new Date().toISOString(),
          });
        }
      } catch (flwError) {
        console.error("Flutterwave verification error:", flwError);
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
      // Verify webhook signature
      const hash = req.headers["verif-hash"] as string;

      if (!hash || hash !== (flwWebhookHash || process.env.FLW_WEBHOOK_HASH)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { event, data } = req.body;

      if (event === "charge.completed" && data.status === "successful") {
        const { tx_ref } = data;

        try {
          // Get subscription record
          const { data: subscription } = await supabaseAdmin
            .from("subscriptions")
            .select("user_id, plan")
            .eq("paystack_reference", tx_ref)
            .single();

          if (!subscription) {
            res.status(200).json({ status: "success" });
            return;
          }

          const { user_id, plan } = subscription;

          // Update subscription
          const durationDays = 180; // 6 months
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + durationDays);

          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              expires_at: expiresAt.toISOString(),
            })
            .eq("paystack_reference", tx_ref);

          // Update profile
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: plan,
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq("id", user_id);
        } catch (error) {
          console.error("[payments/webhook] Processing error:", error);
        }
      }

      res.status(200).json({ status: "success" });
    } catch (error) {
      console.error("[payments/webhook] Error:", error);
      res.status(200).json({ status: "success" });
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

      // Get subscription status from profiles table
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
          message: "Invalid target plan",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get user's current subscription
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      if (!profile) {
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

      // Pricing in kobo
      const planPricing: Record<string, number> = {
        explorer: 0,       // Free
        scholar: 350000,   // ₦3,500
        elite: 500000,     // ₦5,000
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

      const tx_ref = `UPGRADE-${user.id.slice(0, 8)}-${Date.now()}`;
      const amountInNaira = upgradeDifference / 100;

      // Get user profile
      const { data: userProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      try {
        // Record the pending upgrade
        await supabaseAdmin.from("subscriptions").insert({
          user_id: user.id,
          plan: target_plan,
          amount: upgradeDifference,
          upgraded_from: profile.subscription_status,
          status: "pending",
          paystack_reference: tx_ref,
        });

        // Return Flutterwave payment config
        const paymentConfig = {
          tx_ref,
          amount: amountInNaira,
          currency: "NGN",
          redirect_url: `${webUrl}/payments/success`,
          customer: {
            email: user.email,
            name: userProfile?.full_name || "Roman Series Student",
          },
          customizations: {
            title: "Roman Series",
            description: `Upgrade to ${target_plan}`,
          },
          payment_options: "card,banktransfer,ussd,opay",
        };

        res.json({
          status: "success",
          data: {
            tx_ref: paymentConfig.tx_ref,
            amount: paymentConfig.amount,
            currency: paymentConfig.currency,
            customer: paymentConfig.customer,
            customizations: paymentConfig.customizations,
            payment_options: paymentConfig.payment_options,
            upgrade_cost: upgradeDifference,
            from_plan: profile.subscription_status,
            to_plan: target_plan,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Flutterwave error:", error);
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

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
      console.log("[Initiate] ========= INITIATE CALLED =========");
      console.log("[Initiate] User ID from auth:", req.headers.authorization?.substring(7) ? "present" : "missing");
      console.log("[Initiate] Body:", JSON.stringify(req.body));

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
        console.error("[Initiate] Auth error:", authError);
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log("[Initiate] User:", user.id);

      const { plan } = req.body;

      if (!plan || !["explorer", "scholar", "elite"].includes(plan)) {
        console.error("[Initiate] Invalid plan:", plan);
        res.status(400).json({
          status: "error",
          message: "Invalid plan. Must be 'explorer', 'scholar', or 'elite'",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log("[Initiate] Plan:", plan);

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

      console.log("[Initiate] Amount:", amountInKobo, "kobo,", amountInNaira, "NGN");
      console.log("[Initiate] tx_ref:", tx_ref);

      // Get user profile
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // INSERT subscription record FIRST before returning
      const { data: newSub, error: insertError } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan,
          status: "pending",
          paystack_reference: tx_ref,
          amount: amountInKobo,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[Initiate] Insert error:", insertError);
        res.status(500).json({
          status: "error",
          message: "Failed to initiate payment",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log("[Initiate] Subscription inserted:", JSON.stringify(newSub));

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
      console.error("[payments/initiate] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post("/api/payments/verify", async (req: Request, res: Response) => {
    console.log("[Verify] ========= VERIFY CALLED =========");
    console.log("[Verify] Body:", JSON.stringify(req.body));

    const { transaction_id, tx_ref } = req.body;

    if (!transaction_id || !tx_ref) {
      console.error("[Verify] Missing required fields - transaction_id:", !!transaction_id, "tx_ref:", !!tx_ref);
      return res.status(400).json({
        status: "error",
        message: "transaction_id and tx_ref are required",
      });
    }

    console.log("[Verify] transaction_id:", transaction_id);
    console.log("[Verify] tx_ref:", tx_ref);

    try {
      const flutterwave = getFlutterwave();
      if (!flutterwave) {
        return res.status(500).json({
          status: "error",
          message: "Flutterwave not configured",
        });
      }

      // Verify with Flutterwave
      const flwResponse = await flutterwave.Transaction.verify({
        id: String(transaction_id),
      });

      console.log("[Verify] FLW raw response:", JSON.stringify(flwResponse?.data));

      if (flwResponse?.data?.status !== "successful") {
        console.error("[Verify] FLW status not successful:", flwResponse?.data?.status);
        return res.status(400).json({
          status: "error",
          message: "Transaction not successful",
        });
      }

      if (flwResponse.data.tx_ref !== tx_ref) {
        console.error("[Verify] tx_ref mismatch - FLW:", flwResponse.data.tx_ref, "Request:", tx_ref);
        return res.status(400).json({
          status: "error",
          message: "Transaction reference mismatch",
        });
      }

      // Find subscription by tx_ref
      console.log("[Verify] Looking for tx_ref:", tx_ref);
      const { data: subscription, error: subFindError } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id, plan, status")
        .eq("paystack_reference", tx_ref)
        .single();

      console.log("[Verify] Subscription query result:", JSON.stringify(subscription));
      console.log("[Verify] Subscription error:", subFindError);

      if (subFindError || !subscription) {
        console.error("[Verify] Subscription not found for tx_ref:", tx_ref);
        return res.status(404).json({
          status: "error",
          message: "Subscription record not found for this transaction",
        });
      }

      // Already processed
      if (subscription.status === "active") {
        console.log("[Verify] Subscription already active for tx_ref:", tx_ref);
        return res.json({
          status: "success",
          data: { plan: subscription.plan, already_active: true },
        });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 180);

      console.log("[Verify] Updating subscription status to active, expires:", expiresAt.toISOString());

      // Update subscription status
      const { error: subUpdateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          expires_at: expiresAt.toISOString(),
        })
        .eq("paystack_reference", tx_ref);

      if (subUpdateError) {
        console.error("[Verify] Subscription update error:", subUpdateError);
      }

      // Update profile subscription status
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: subscription.plan,
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq("id", subscription.user_id);

      console.log("[Verify] Profile update error:", profileError);
      console.log("[Verify] Profile update success for user:", subscription.user_id);

      if (profileError) {
        console.error("[Verify] Profile update failed:", profileError);
        return res.status(500).json({
          status: "error",
          message:
            "Payment received but profile update failed. Contact support.",
        });
      }

      console.log("[Verify] Payment verified successfully for tx_ref:", tx_ref);

      return res.json({
        status: "success",
        data: {
          plan: subscription.plan,
          expires_at: expiresAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.error("[Verify] Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Verification failed: " + error.message,
      });
    }
  });

  app.post("/api/payments/webhook", async (req: Request, res: Response) => {
    console.log("[Webhook] ========= WEBHOOK CALLED =========");
    console.log("[Webhook] Headers:", JSON.stringify(req.headers));
    console.log("[Webhook] Body:", JSON.stringify(req.body));

    const secretHash = process.env.FLW_WEBHOOK_HASH;
    const signature = req.headers["verif-hash"];

    const hashMatch = signature === secretHash;
    console.log("[Webhook] verif-hash match:", hashMatch);

    if (!hashMatch) {
      console.error("[Webhook] Signature mismatch - Expected:", secretHash ? "set" : "not set", "Received:", signature);
      return res.status(401).send("Unauthorized");
    }

    const payload = req.body;

    console.log("[Webhook] Event:", payload.event, "Status:", payload.data?.status);

    if (
      payload.event === "charge.completed" &&
      payload.data?.status === "successful"
    ) {
      const { tx_ref, id: transaction_id } = payload.data;

      console.log("[Webhook] Processing successful charge - tx_ref:", tx_ref, "transaction_id:", transaction_id);

      try {
        const { data: subscription } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id, plan, status")
          .eq("paystack_reference", tx_ref)
          .single();

        console.log("[Webhook] Found subscription:", !!subscription, "Status:", subscription?.status);

        if (subscription && subscription.status !== "active") {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 180);

          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              expires_at: expiresAt.toISOString(),
            })
            .eq("paystack_reference", tx_ref);

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: subscription.plan,
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq("id", subscription.user_id);

          console.log("[Webhook] Payment processed for tx_ref:", tx_ref, "Plan:", subscription.plan, "User:", subscription.user_id);
        } else if (subscription?.status === "active") {
          console.log("[Webhook] Subscription already active for tx_ref:", tx_ref);
        }
      } catch (err) {
        console.error("[Webhook] Error processing:", err);
      }
    } else {
      console.log("[Webhook] Ignoring non-successful or non-charge.completed event");
    }

    console.log("[Webhook] Webhook response sent");
    return res.status(200).json({ status: "success" });
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

      // Record the pending upgrade
      const { data: newUpgrade, error: upgradeError } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan: target_plan,
          amount: upgradeDifference,
          upgraded_from: profile.subscription_status,
          status: "pending",
          paystack_reference: tx_ref,
        })
        .select()
        .single();

      if (upgradeError) {
        console.error("[Upgrade] Failed to create subscription:", upgradeError);
        res.status(500).json({
          status: "error",
          message: "Failed to initiate payment",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log("[Upgrade] Subscription created:", newUpgrade?.id, "tx_ref:", tx_ref);

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
      console.error("[payments/upgrade] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}

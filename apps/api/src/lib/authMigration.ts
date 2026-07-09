import crypto from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { firebaseAdminAuth } from "./firebaseAdmin";

interface MigrateLegacyUserParams {
  profileId: string;
  email: string;
  supabaseAdmin: SupabaseClient;
}

interface MigrateLegacyUserResult {
  success: boolean;
  firebaseUid?: string;
}

export async function migrateLegacyUserToFirebase({
  profileId,
  email,
  supabaseAdmin,
}: MigrateLegacyUserParams): Promise<MigrateLegacyUserResult> {
  let firebaseUid: string;

  try {
    const firebaseUser = await firebaseAdminAuth.createUser({
      email,
      password: crypto.randomBytes(24).toString("hex"),
      emailVerified: true,
    });
    firebaseUid = firebaseUser.uid;
  } catch (error: any) {
    if (error?.code === "auth/email-already-exists") {
      const existing = await firebaseAdminAuth.getUserByEmail(email);
      firebaseUid = existing.uid;
    } else {
      throw error;
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ firebase_uid: firebaseUid })
    .eq("id", profileId);

  if (updateError) {
    return { success: false };
  }

  return { success: true, firebaseUid };
}

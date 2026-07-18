import axios from "axios";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const getSecretKey = () => process.env.PAYSTACK_SECRET_KEY;

interface InitializeTransactionParams {
  email: string;
  amount: number; // kobo
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string; // "success" | "failed" | "abandoned" | ...
    reference: string;
    amount: number; // kobo
    metadata?: Record<string, unknown>;
  };
}

export async function initializeTransaction(
  params: InitializeTransactionParams
): Promise<PaystackInitializeResponse> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error("Paystack not configured");
  }

  const { data } = await axios.post<PaystackInitializeResponse>(
    `${PAYSTACK_BASE_URL}/transaction/initialize`,
    params,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );

  return data;
}

export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error("Paystack not configured");
  }

  const { data } = await axios.get<PaystackVerifyResponse>(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );

  return data;
}

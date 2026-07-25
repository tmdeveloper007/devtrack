import { createHmac, randomBytes } from "crypto";
import { supabaseAdmin } from "./supabase";
import { encryptToken, decryptToken } from "./crypto";

const WEBHOOK_TIMEOUT_MS = 10_000;
const WEBHOOK_MAX_RETRIES = 3;
const WEBHOOK_BACKOFF_BASE_MS = 1_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFailure(statusCode: number): boolean {
  // Retry on 5xx server errors.
  return statusCode >= 500;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

const WEBHOOK_EVENTS = [
  "goal.completed",
  "goal.created",
  "streak.milestone",
  "daily.summary",
  "weekly.summary",
  "metrics.updated",
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export function isValidWebhookEvent(event: string): event is WebhookEvent {
  return WEBHOOK_EVENTS.includes(event as WebhookEvent);
}

export function getAvailableEvents(): readonly string[] {
  return WEBHOOK_EVENTS;
}

export function generateSecretKey(): string {
  return randomBytes(32).toString("hex");
}

export function encryptSecretKey(secret: string): { encrypted: string; iv: string } {
  return encryptToken(secret);
}

export function decryptSecretKey(encrypted: string, iv: string): string | null {
  return decryptToken(encrypted, iv);
}

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dispatchWebhook(
  webhookId: string,
  event: string,
  data: Record<string, unknown>
): Promise<WebhookDeliveryResult> {
  const { data: webhook, error } = await supabaseAdmin
    .from("webhook_configs")
    .select("*")
    .eq("id", webhookId)
    .eq("is_enabled", true)
    .single();

  if (error || !webhook) {
    return { success: false, error: "Webhook not found or disabled" };
  }

  const secret = decryptSecretKey(webhook.secret_key, webhook.secret_iv);
  if (!secret) {
    return { success: false, error: "Failed to decrypt webhook secret" };
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, secret);

  const { isSafeUrl } = await import("./ssrf-protection");
  const safe = await isSafeUrl(webhook.url);
  if (!safe) {
    const errorMessage = "SSRF protection: blocked request to private/internal address";
    await supabaseAdmin.from("webhook_deliveries").insert({
      webhook_id: webhookId,
      event,
      payload,
      success: false,
      error_message: errorMessage,
    });
    return { success: false, error: errorMessage };
  }

  let statusCode: number | undefined;
  let errorMessage: string | undefined;

  for (let attempt = 1; attempt <= WEBHOOK_MAX_RETRIES; attempt++) {
    let response: Response | null = null;

    try {
      response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Event": event,
          "X-Webhook-Delivery-Id": webhookId,
        },
        body: payloadString,
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        redirect: "manual",
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");

        if (!location) {
          throw new Error("Redirect response missing location header");
        }

        const { isSafeUrl } = await import("./ssrf-protection");
        const redirectSafe = await isSafeUrl(location);

        if (!redirectSafe) {
          throw new Error(
            "SSRF protection: blocked redirect to private/internal address"
          );
        }
      }

      statusCode = response.status;

      if (response.ok) {
        await supabaseAdmin.from("webhook_deliveries").insert({
          webhook_id: webhookId,
          event,
          payload,
          status_code: statusCode,
          success: true,
          error_message: null,
        });
        return { success: true, statusCode };
      }

      // Non-ok response: check if retryable
      if (!isRetryableFailure(response.status) || attempt === WEBHOOK_MAX_RETRIES) {
        errorMessage = `HTTP ${statusCode}`;
        await supabaseAdmin.from("webhook_deliveries").insert({
          webhook_id: webhookId,
          event,
          payload,
          status_code: statusCode,
          success: false,
          error_message: errorMessage,
        });
        return { success: false, statusCode, error: errorMessage };
      }

      // Retryable: log attempt and back off
      console.warn(
        `[webhooks] Delivery attempt ${attempt} failed for webhook ${webhookId}: HTTP ${statusCode}. Retrying...`
      );
      if (attempt < WEBHOOK_MAX_RETRIES) {
        const delay = WEBHOOK_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown error";

      if (attempt === WEBHOOK_MAX_RETRIES) {
        await supabaseAdmin.from("webhook_deliveries").insert({
          webhook_id: webhookId,
          event,
          payload,
          success: false,
          error_message: errorMessage,
        });
        return { success: false, statusCode, error: errorMessage };
      }

      console.warn(
        `[webhooks] Delivery attempt ${attempt} failed for webhook ${webhookId}: ${errorMessage}. Retrying...`
      );
      if (attempt < WEBHOOK_MAX_RETRIES) {
        const delay = WEBHOOK_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted (fallback, should not reach here)
  await supabaseAdmin.from("webhook_deliveries").insert({
    webhook_id: webhookId,
    event,
    payload,
    success: false,
    error_message: errorMessage ?? "Max retries exceeded",
  });
  return { success: false, statusCode, error: errorMessage ?? "Max retries exceeded" };
}

export async function dispatchToAllWebhooks(
  userId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const MAX_WEBHOOKS_PER_USER = 5;

  const { data: webhooks } = await supabaseAdmin
    .from("webhook_configs")
    .select("id")
    .eq("user_id", userId)
    .eq("is_enabled", true)
    .contains("events", [event])
    .limit(MAX_WEBHOOKS_PER_USER);

  if (!webhooks) return;

  await Promise.all(
    webhooks.map((webhook) => dispatchWebhook(webhook.id, event, data))
  );
}

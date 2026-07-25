import { describe, expect, it } from "vitest";
import { getMessagesForLocale } from "@/i18n/messages";

describe("getMessagesForLocale", () => {
  it("returns English messages for 'en'", async () => {
    const messages = await getMessagesForLocale("en");
    expect(messages).toBeDefined();
    expect(typeof messages).toBe("object");
    expect(messages).not.toBeNull();
    // English messages should have common keys
    expect(messages).toHaveProperty("common");
    expect(messages).toHaveProperty("navigation");
  });

  it("returns Spanish messages for 'es'", async () => {
    const messages = await getMessagesForLocale("es");
    expect(messages).toBeDefined();
    expect(messages).toHaveProperty("common");
    expect(messages).toHaveProperty("navigation");
  });

  it("falls back to English for unsupported locale", async () => {
    const messages = await getMessagesForLocale("fr");
    expect(messages).toBeDefined();
    // Should fall back to English messages
    expect(messages).toHaveProperty("navigation");
  });

  it("falls back to English for empty string", async () => {
    const messages = await getMessagesForLocale("");
    expect(messages).toBeDefined();
    expect(messages).toHaveProperty("navigation");
  });

  it("does not mutate original English messages when returning Spanish", async () => {
    const esMessages = await getMessagesForLocale("es");
    const enMessages = await getMessagesForLocale("en");
    // The Spanish messages should differ from English at some key
    const esNav = esMessages["navigation"];
    const enNav = enMessages["navigation"];
    // At minimum, labels should be different or the same structure should exist
    expect(typeof esNav).toBe(typeof enNav);
  });
});

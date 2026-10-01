import { describe, expect, it } from "vitest";

describe("Firebase Web Configuration", () => {
  it("has valid Firebase Spark project variables set in environment", () => {
    expect(process.env.VITE_FIREBASE_API_KEY).toBeDefined();
    expect(process.env.VITE_FIREBASE_API_KEY).toContain("AIzaSy");
    expect(process.env.VITE_FIREBASE_AUTH_DOMAIN).toBe("rdx-road-project-control.firebaseapp.com");
    expect(process.env.VITE_FIREBASE_PROJECT_ID).toBe("rdx-road-project-control");
    expect(process.env.VITE_FIREBASE_APP_ID).toContain("1:991144787805:web:");
    expect(process.env.GOOGLE_ADMIN_EMAIL).toBe("radhe30795@gmail.com");
  });

  it("can reach the Google identity toolkit endpoint using the configured Firebase API key", async () => {
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects?key=${apiKey}`
    );
    // Even without permission to list projects, a valid API key reaches the service
    // and returns HTTP 200 or 400/403 with a standard Google error structure, NOT 404.
    expect([200, 400, 403]).toContain(response.status);
  });
});

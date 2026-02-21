import { describe, expect, it } from "vitest";
import { resolveDashboardRedirect } from "./dashboardRouting";

describe("resolveDashboardRedirect", () => {
  it("redirects unauthenticated users to signin", () => {
    expect(
      resolveDashboardRedirect({
        isAuthResolved: true,
        isAuthenticated: false,
        user: null,
        pathname: "/overview",
      }),
    ).toBe("/signin");
  });

  it("redirects unsigned non-sponsor users to get-started", () => {
    expect(
      resolveDashboardRedirect({
        isAuthResolved: true,
        isAuthenticated: true,
        user: { signedUp: false, role: "Member" },
        pathname: "/overview",
      }),
    ).toBe("/get-started");
  });

  it("does not force sponsors to get-started", () => {
    expect(
      resolveDashboardRedirect({
        isAuthResolved: true,
        isAuthenticated: true,
        user: { signedUp: false, role: "Sponsor" },
        pathname: "/overview",
      }),
    ).toBeNull();
  });

  it("redirects signed-up users away from get-started", () => {
    expect(
      resolveDashboardRedirect({
        isAuthResolved: true,
        isAuthenticated: true,
        user: { signedUp: true, role: "Member" },
        pathname: "/get-started",
      }),
    ).toBe("/overview");
  });
});

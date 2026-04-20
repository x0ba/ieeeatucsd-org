import { describe, expect, it } from "vitest";
import {
  buildAdminProfilePatch,
  buildSelfProfilePatch,
} from "./users";

describe("buildSelfProfilePatch", () => {
  it("strips auth metadata", () => {
    const patch = buildSelfProfilePatch({
      logtoId: "logto_123",
      authToken: "token_123",
      syncPublicProfile: true,
      name: "Daniel Xu",
      major: "Math CS",
      aiFeaturesEnabled: false,
    });

    expect(patch).toEqual({
      name: "Daniel Xu",
      major: "Math CS",
      aiFeaturesEnabled: false,
    });
    expect(patch).not.toHaveProperty("logtoId");
    expect(patch).not.toHaveProperty("authToken");
    expect(patch).not.toHaveProperty("syncPublicProfile");
  });

  it("removes undefined values", () => {
    const patch = buildSelfProfilePatch({
      logtoId: "logto_123",
      authToken: "token_123",
      name: "Daniel",
      resume: undefined,
      memberId: undefined,
    });

    expect(patch).toEqual({
      name: "Daniel",
    });
  });
});

describe("buildAdminProfilePatch", () => {
  it("strips auth metadata and userId", () => {
    const patch = buildAdminProfilePatch({
      logtoId: "admin_123",
      authToken: "token_123",
      userId: "user_123",
      name: "Daniel Xu",
      pid: "A19229450",
      major: "Math CS",
    });

    expect(patch).toEqual({
      name: "Daniel Xu",
      pid: "A19229450",
      major: "Math CS",
    });
    expect(patch).not.toHaveProperty("logtoId");
    expect(patch).not.toHaveProperty("authToken");
    expect(patch).not.toHaveProperty("userId");
  });

  it("preserves legitimate falsey values", () => {
    const patch = buildAdminProfilePatch({
      logtoId: "admin_123",
      authToken: "token_123",
      userId: "user_123",
      graduationYear: 0,
      name: "",
    });

    expect(patch).toEqual({
      graduationYear: 0,
      name: "",
    });
  });
});

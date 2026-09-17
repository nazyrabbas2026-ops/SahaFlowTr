import { describe, expect, it } from "vitest";
import { authorize } from "./index";
describe("membership authorization policy", () => {
  const memberships = [
    {
      userId: "u1",
      organizationId: "org1",
      active: true,
      permissions: ["customer.read"],
    },
  ];
  it("allows an explicit permission", () =>
    expect(authorize(memberships, "u1", "org1", "customer.read")).toBe(true));
  it("rejects another tenant", () =>
    expect(authorize(memberships, "u1", "org2", "customer.read")).toBe(false));
  it("rejects another user", () =>
    expect(authorize(memberships, "u2", "org1", "customer.read")).toBe(false));
  it("rejects missing permission", () =>
    expect(authorize(memberships, "u1", "org1", "customer.delete")).toBe(
      false,
    ));
  it("rejects inactive memberships", () =>
    expect(
      authorize(
        [{ ...memberships[0]!, active: false }],
        "u1",
        "org1",
        "customer.read",
      ),
    ).toBe(false));
});

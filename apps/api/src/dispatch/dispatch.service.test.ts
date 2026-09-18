import { describe, expect, it } from "vitest";
import type { DatabaseService } from "../database/database.service";
import { DispatchService } from "./dispatch.service";

function fakeDatabase(options: {
  locations: Array<{ memberId: string; latitude: number; longitude: number }>;
}) {
  const jobLatitude = 36.8969;
  const jobLongitude = 30.7133;
  return {
    job: {
      findUniqueOrThrow: async () => ({
        requiredSkillIds: [],
        address: { latitude: jobLatitude, longitude: jobLongitude },
        estimatedDurationMinutes: 60,
      }),
    },
    employeeProfile: {
      findMany: async () => [
        {
          memberId: "member-near",
          workLatencyMinutes: 15,
          member: { id: "member-near", user: { name: "Yakın Teknisyen" } },
          skills: [],
        },
        {
          memberId: "member-unknown",
          workLatencyMinutes: 15,
          member: { id: "member-unknown", user: { name: "Konumu Bilinmeyen" } },
          skills: [],
        },
      ],
    },
    technicianLocation: {
      findMany: async ({ where }: { where: { memberId: { in: string[] } } }) =>
        options.locations
          .filter((location) => where.memberId.in.includes(location.memberId))
          .map((location) => ({
            memberId: location.memberId,
            latitude: location.latitude,
            longitude: location.longitude,
          })),
    },
  } as unknown as DatabaseService;
}

describe("DispatchService.suggestCandidates", () => {
  it("reads the technician's last recorded location instead of always scoring by default distance", async () => {
    const db = fakeDatabase({
      locations: [
        { memberId: "member-near", latitude: 36.8969, longitude: 30.7133 },
      ],
    });
    const service = new DispatchService(db);

    const ranked = await service.suggestCandidates("org-1", "job-1");

    const near = ranked.find((entry) => entry.memberId === "member-near")!;
    const unknown = ranked.find((entry) => entry.memberId === "member-unknown")!;

    expect(near.distanceScore).toBe(100);
    expect(unknown.distanceScore).toBe(50);
    expect(near.compositeScore).toBeGreaterThan(unknown.compositeScore);
    expect(ranked[0]!.memberId).toBe("member-near");
  });

  it("falls back to the default distance score when no technician has a recorded location", async () => {
    const db = fakeDatabase({ locations: [] });
    const service = new DispatchService(db);

    const ranked = await service.suggestCandidates("org-1", "job-1");

    for (const entry of ranked) expect(entry.distanceScore).toBe(50);
  });
});

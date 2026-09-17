import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  rankCandidates,
  type DispatchCandidate,
  type JobRequirements,
} from "@sahaflow/domain";

@Injectable()
export class DispatchService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async suggestCandidates(organizationId: string, jobId: string) {
    const job = await this.db.job.findUniqueOrThrow({
      where: { organizationId_id: { organizationId, id: jobId } },
      select: {
        requiredSkillIds: true,
        address: { select: { latitude: true, longitude: true } },
        estimatedDurationMinutes: true,
      },
    });

    const employees = await this.db.employeeProfile.findMany({
      where: { organizationId, active: true },
      include: {
        member: { select: { id: true, user: { select: { name: true } } } },
        skills: { include: { skill: true } },
      },
    });

    const candidates: DispatchCandidate[] = employees.map((emp) => ({
      memberId: emp.memberId,
      name: emp.member.user.name,
      skills: emp.skills.map((s) => ({ skillId: s.skillId, level: s.level })),
      latitude: undefined,
      longitude: undefined,
      workLatencyMinutes: emp.workLatencyMinutes,
      availableMinutes: job.estimatedDurationMinutes ?? 0,
    }));

    const jobReq: JobRequirements = {
      requiredSkillIds: job.requiredSkillIds,
      latitude: job.address?.latitude ?? undefined,
      longitude: job.address?.longitude ?? undefined,
      estimatedDurationMinutes: job.estimatedDurationMinutes ?? 0,
    };

    const names = new Map(candidates.map((c) => [c.memberId, c.name]));
    const ranked = rankCandidates(candidates, jobReq);
    return ranked.slice(0, 5).map((entry) => ({
      ...entry,
      name: names.get(entry.memberId) ?? "Bilinmeyen çalışan",
    }));
  }

  async assignJob(
    organizationId: string,
    jobId: string,
    memberId: string,
  ) {
    return this.db.jobAssignment.create({
      data: {
        organizationId,
        jobId,
        memberId,
        primary: true,
      },
    });
  }
}

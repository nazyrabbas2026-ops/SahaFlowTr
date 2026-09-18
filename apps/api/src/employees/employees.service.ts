import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@sahaflow/database";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class EmployeesService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async listSkills(organizationId: string) {
    return this.db.skill.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async createSkill(
    organizationId: string,
    input: { key: string; name: string; category: string },
  ) {
    return this.db.skill.upsert({
      where: { organizationId_key: { organizationId, key: input.key } },
      create: { organizationId, ...input },
      update: { name: input.name, category: input.category, active: true },
    });
  }

  async listByOrganization(organizationId: string) {
    return this.db.employeeProfile.findMany({
      where: { organizationId, active: true },
      include: {
        member: { select: { id: true, user: { select: { name: true, email: true } } } },
        skills: { include: { skill: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(organizationId: string, employeeId: string) {
    const employee = await this.db.employeeProfile.findUniqueOrThrow({
      where: { organizationId_id: { organizationId, id: employeeId } },
      include: {
        member: { select: { id: true, user: { select: { name: true, email: true } } } },
        skills: { include: { skill: true } },
      },
    });
    const [workSchedule, timeEntries] = await Promise.all([
      this.db.workSchedule.findMany({
        where: { organizationId, memberId: employee.memberId },
        orderBy: { weekday: "asc" },
      }),
      this.db.timeEntry.findMany({
        where: { organizationId, memberId: employee.memberId },
        include: { job: { select: { jobNumber: true, title: true } } },
        orderBy: { startsAt: "desc" },
        take: 10,
      }),
    ]);
    return { ...employee, workSchedule, timeEntries };
  }

  async create(
    organizationId: string,
    memberId: string,
    input: {
      employeeNumber: string;
      title: string;
      phone?: string;
      homeCity?: string;
      homeDistrict?: string;
    },
  ) {
    return this.db.employeeProfile.create({
      data: {
        organizationId,
        memberId,
        employeeNumber: input.employeeNumber,
        title: input.title,
        phone: input.phone,
        homeCity: input.homeCity,
        homeDistrict: input.homeDistrict,
      },
      include: {
        member: { select: { id: true, user: { select: { name: true, email: true } } } },
        skills: { include: { skill: true } },
      },
    });
  }

  async update(
    organizationId: string,
    employeeId: string,
    data: Prisma.EmployeeProfileUpdateInput,
  ) {
    return this.db.employeeProfile.update({
      where: { organizationId_id: { organizationId, id: employeeId } },
      data,
      include: {
        member: { select: { id: true, user: { select: { name: true, email: true } } } },
        skills: { include: { skill: true } },
      },
    });
  }

  async addSkill(
    organizationId: string,
    employeeId: string,
    skillId: string,
    level: number,
  ) {
    return this.db.employeeSkill.upsert({
      where: { organizationId_employeeId_skillId: { organizationId, employeeId, skillId } },
      create: { organizationId, employeeId, skillId, level },
      update: { level },
    });
  }

  async removeSkill(organizationId: string, employeeId: string, skillId: string) {
    return this.db.employeeSkill.delete({
      where: { organizationId_employeeId_skillId: { organizationId, employeeId, skillId } },
    });
  }

  async recordLocation(
    organizationId: string,
    employeeId: string,
    latitude: number,
    longitude: number,
    jobId?: string,
  ) {
    const employee = await this.db.employeeProfile.findUniqueOrThrow({
      where: { organizationId_id: { organizationId, id: employeeId } },
      select: { memberId: true },
    });
    return this.db.technicianLocation.create({
      data: {
        organizationId,
        memberId: employee.memberId,
        latitude,
        longitude,
        jobId,
        recordedAt: new Date(),
      },
    });
  }

  async getRecentLocation(organizationId: string, employeeId: string) {
    const employee = await this.db.employeeProfile.findUniqueOrThrow({
      where: { organizationId_id: { organizationId, id: employeeId } },
      select: { memberId: true },
    });
    return this.db.technicianLocation.findFirst({
      where: { organizationId, memberId: employee.memberId },
      orderBy: { recordedAt: "desc" },
    });
  }
}

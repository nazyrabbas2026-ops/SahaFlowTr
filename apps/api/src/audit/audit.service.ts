import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@sahaflow/database";
import { DatabaseService } from "../database/database.service";

export interface AuditInput {
  organizationId?: string;
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}
  write(
    input: AuditInput,
    transaction: Prisma.TransactionClient = this.database,
  ) {
    return transaction.auditLog.create({ data: input });
  }
}

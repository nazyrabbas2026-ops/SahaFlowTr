import console from "node:console";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const users = await p.user.findMany({
  select: { id: true, email: true, name: true },
});
const orgs = await p.organization.findMany({
  select: { id: true, name: true, slug: true },
});
const members = await p.organizationMember.findMany({
  select: { organizationId: true, userId: true, active: true },
});
console.log(JSON.stringify({ users, orgs, members }, null, 1));
await p.$disconnect();

export interface CandidateSkill {
  skillId: string;
  level: number;
}

export interface DispatchCandidate {
  memberId: string;
  name: string;
  skills: readonly CandidateSkill[];
  latitude?: number;
  longitude?: number;
  workLatencyMinutes: number;
  availableMinutes: number;
}

export interface JobRequirements {
  requiredSkillIds: readonly string[];
  latitude?: number;
  longitude?: number;
  estimatedDurationMinutes: number;
}

export interface DispatchScore {
  memberId: string;
  skillScore: number;
  distanceScore: number;
  availabilityScore: number;
  compositeScore: number;
  reason: string;
}

function skillScore(
  required: readonly string[],
  held: readonly CandidateSkill[],
): number {
  if (!required.length) return 100;
  const rank = new Map(held.map((entry) => [entry.skillId, entry.level]));
  const matched = required
    .map((id) => rank.get(id) ?? 0)
    .filter((level) => level > 0)
    .sort((a, b) => b - a);
  const weights = [100, 70, 50];
  const earned = matched.reduce(
    (sum, _level, index) => sum + (weights[index] ?? 0),
    0,
  );
  const possible = required
    .slice(0, weights.length)
    .reduce((sum, _id, index) => sum + (weights[index] ?? 0), 0);
  return Math.min(100, Math.round((earned / possible) * 100));
}

function distanceScore(
  candidateLat?: number,
  candidateLng?: number,
  jobLat?: number,
  jobLng?: number,
): number {
  if (!candidateLat || !candidateLng || !jobLat || !jobLng) return 50;
  const dLat = (jobLat - candidateLat) * 111;
  const dLng = (jobLng - candidateLng) * 111 * Math.cos((jobLat * Math.PI) / 180);
  const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
  if (distKm < 1) return 100;
  if (distKm < 5) return 90;
  if (distKm < 10) return 75;
  if (distKm < 20) return 50;
  return Math.max(10, 100 - distKm * 2);
}

function availabilityScore(
  availableMinutes: number,
  requiredMinutes: number,
): number {
  if (availableMinutes < requiredMinutes) return 0;
  if (availableMinutes < requiredMinutes * 1.5) return 60;
  return 100;
}

export function scoreCandidate(
  candidate: DispatchCandidate,
  job: JobRequirements,
): DispatchScore {
  const skill = skillScore(job.requiredSkillIds, candidate.skills);
  const distance = distanceScore(
    candidate.latitude,
    candidate.longitude,
    job.latitude,
    job.longitude,
  );
  const availability = availabilityScore(
    candidate.availableMinutes,
    job.estimatedDurationMinutes,
  );

  const composite = Math.round(skill * 0.5 + distance * 0.3 + availability * 0.2);

  let reason = "";
  if (skill < 50) reason = "Yetersiz beceri";
  else if (availability === 0) reason = "Yeterli zaman yok";
  else if (distance < 40) reason = "Uzak konumda";

  return {
    memberId: candidate.memberId,
    skillScore: skill,
    distanceScore: distance,
    availabilityScore: availability,
    compositeScore: composite,
    reason,
  };
}

export function rankCandidates(
  candidates: readonly DispatchCandidate[],
  job: JobRequirements,
): DispatchScore[] {
  return candidates
    .map((c) => scoreCandidate(c, job))
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

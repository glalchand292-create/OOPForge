import "./env.js";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function ensureUserProfile() {
  return prisma.userProfile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      displayName: "CSE Candidate",
      theme: "dark",
      dailyTargetMinutes: 75,
      streakCount: 0,
      totalStudySeconds: 0,
    },
  });
}

export function todayDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function recordStudyActivity(secondsDelta: number, moduleName: string) {
  const profile = await ensureUserProfile();
  const today = todayDateKey();
  const yesterday = todayDateKey(new Date(Date.now() - 86400000));

  let nextStreak = profile.streakCount;
  if (profile.lastStudyDate !== today) {
    if (profile.lastStudyDate === yesterday) {
      nextStreak = profile.streakCount + 1;
    } else {
      nextStreak = 1;
    }
  } else if (nextStreak === 0) {
    nextStreak = 1;
  }

  await prisma.userProfile.update({
    where: { id: 1 },
    data: {
      streakCount: nextStreak,
      lastStudyDate: today,
      totalStudySeconds: { increment: Math.max(0, Math.round(secondsDelta)) },
    },
  });

  if (secondsDelta >= 30) {
    await prisma.studySessionLog.create({
      data: {
        dateKey: today,
        minutes: Math.max(1, Math.round(secondsDelta / 60)),
        module: moduleName,
      },
    });
  }
}

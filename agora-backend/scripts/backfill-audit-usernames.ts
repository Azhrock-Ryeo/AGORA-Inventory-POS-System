import prisma from '../src/utils/prisma'

async function main() {
  const logsMissingUsername = await prisma.auditLog.findMany({
    where: { username: null, user_id: { not: null } },
    select: { id: true, user_id: true },
  })

  console.log(`Found ${logsMissingUsername.length} logs missing username`)

  const uniqueUserIds = [...new Set(logsMissingUsername.map((l) => l.user_id!))]

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, name: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u.name]))

  let updated = 0
  for (const log of logsMissingUsername) {
    const name = userMap.get(log.user_id!)
    if (!name) continue
    await prisma.auditLog.update({
      where: { id: log.id },
      data: { username: name },
    })
    updated++
  }

  console.log(`Backfilled ${updated} rows. ${logsMissingUsername.length - updated} skipped (user no longer exists).`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => process.exit(0))

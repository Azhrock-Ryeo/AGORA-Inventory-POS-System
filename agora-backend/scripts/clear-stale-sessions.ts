import { redis, invalidateCachePattern } from '../src/utils/redis'

async function main() {
  const keys = await redis.keys('session:active:*')
  console.log(`Found ${keys.length} stale session keys:`, keys)

  await invalidateCachePattern('session:active:*')
  console.log('Cleared.')

  await redis.quit()
}

main()
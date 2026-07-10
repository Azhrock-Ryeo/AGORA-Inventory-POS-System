import { redis } from '../src/utils/redis'

async function main() {
  const keys = await redis.keys('session:active:*')
  console.log('Active session keys:', keys)

  for (const key of keys) {
    const ttl = await redis.ttl(key)
    console.log(`${key} → TTL: ${ttl} seconds`)
  }

  process.exit(0)
}

main()
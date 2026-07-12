import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const users = [
    { phone: '15250092360', nickname: '亲子用户1' },
    { phone: '15370980317', nickname: '亲子用户2' },
    { phone: '13900139000', nickname: '运营管理员' },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { phone: u.phone },
      update: { nickname: u.nickname },
      create: u,
    })
  }

  const destinations = [
    {
      name: '北京',
      englishName: 'Beijing',
      emoji: '🏛️',
      region: '华北',
      bestSeason: '春秋',
      kidFriendly: 4.2,
      tags: ['历史', '文化', '博物馆'],
      seasonTags: ['spring', 'autumn'],
      ageRange: '5-16',
    },
    {
      name: '上海',
      englishName: 'Shanghai',
      emoji: '🌃',
      region: '华东',
      bestSeason: '春秋',
      kidFriendly: 4.5,
      tags: ['主题乐园', '科技', '都市'],
      seasonTags: ['spring', 'autumn'],
      ageRange: '3-16',
    },
    {
      name: '广州',
      englishName: 'Guangzhou',
      emoji: '🌺',
      region: '华南',
      bestSeason: '秋冬',
      kidFriendly: 4.3,
      tags: ['美食', '动物园', '主题乐园'],
      seasonTags: ['autumn', 'winter'],
      ageRange: '2-16',
    },
    {
      name: '成都',
      englishName: 'Chengdu',
      emoji: '🐼',
      region: '西南',
      bestSeason: '春秋',
      kidFriendly: 4.8,
      tags: ['熊猫', '自然', '美食'],
      seasonTags: ['spring', 'autumn'],
      ageRange: '3-16',
    },
    {
      name: '西安',
      englishName: "Xi'an",
      emoji: '🏯',
      region: '西北',
      bestSeason: '春秋',
      kidFriendly: 3.8,
      tags: ['历史', '古迹', '文化'],
      seasonTags: ['spring', 'autumn'],
      ageRange: '6-16',
    },
    {
      name: '三亚',
      englishName: 'Sanya',
      emoji: '🏖️',
      region: '华南',
      bestSeason: '冬季',
      kidFriendly: 4.6,
      tags: ['海滩', '水上活动', '度假'],
      seasonTags: ['winter'],
      ageRange: '2-16',
    },
  ]

  await prisma.destination.deleteMany()
  await prisma.destination.createMany({ data: destinations })

  console.log('Seed completed: users + destinations')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

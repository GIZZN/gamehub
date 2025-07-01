const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.create({
      data: {
        externalUserId: 'test_id',
        username: 'test_user',
        imageUrl: 'https://example.com/image.jpg',
        stream: {
          create: {
            name: 'Test Stream'
          }
        }
      }
    });
    console.log('Created test user:', user);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test(); 
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  'Paychecks',
  'Refunds',
  'Fees',
  'Shopping',
  'Rent',
  'Auto & Transport',
  'Utilities',
  'Drinks & Dining',
  'Groceries',
  'Personal Care',
  'Healthcare',
  'Entertainment',
  'Taxes',
  'Travel & Vacation',
  'Other',
];

async function main() {
  console.log(`Start seeding ...`);
  for (const categoryName of defaultCategories) {
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: categoryName,
        userId: null,
      },
    });

    if (!existingCategory) {
      const category = await prisma.category.create({
        data: {
          name: categoryName,
          userId: null,
        },
      });
      console.log(`Created category: ${category.name}`);
    } else {
      console.log(`Category '${categoryName}' already exists.`);
    }
  }
  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
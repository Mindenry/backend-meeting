import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.log('No organization found');
    return;
  }

  const currentSettings = (org.settings as Record<string, any>) || {};
  
  const updatedSettings = {
    ...currentSettings,
    departments: [
      {
        name: 'Engineering',
        positions: ['Software Engineer', 'Senior Software Engineer', 'Engineering Manager', 'Head of Engineering'],
      },
      {
        name: 'Product',
        positions: ['Product Manager', 'Product Director', 'Product Owner'],
      },
      {
        name: 'Design',
        positions: ['UI/UX Designer', 'Design Manager', 'Senior Designer'],
      },
      {
        name: 'Operations',
        positions: ['Operations Director', 'Operations Manager', 'Operations Specialist'],
      },
      {
        name: 'Customer Success',
        positions: ['Technical Support Specialist', 'Customer Success Manager', 'Support Lead'],
      },
      {
        name: 'Data & Analytics',
        positions: ['Data Analyst', 'Data Engineer', 'Data Scientist'],
      },
      {
        name: 'Finance',
        positions: ['Finance Manager', 'Accountant', 'Financial Analyst'],
      },
    ],
  };

  await prisma.organization.update({
    where: { id: org.id },
    data: { settings: updatedSettings },
  });

  console.log('✅ Organization departments updated successfully!');
  console.log('Departments:', updatedSettings.departments.map((d: any) => d.name).join(', '));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { prisma } from "../lib/prisma.js";

async function main() {
  console.log("🧹 Clearing all users from the database...");

  // Project relation has onDelete: SetNull, so projects will remain intact with userId set to null
  const sessionDelete = await prisma.session.deleteMany();
  console.log(`- Deleted ${sessionDelete.count} active sessions`);

  const accountDelete = await prisma.account.deleteMany();
  console.log(`- Deleted ${accountDelete.count} linked accounts/credentials`);

  const userDelete = await prisma.user.deleteMany();
  console.log(`- Deleted ${userDelete.count} users from database`);

  const verificationDelete = await prisma.verification.deleteMany();
  console.log(`- Deleted ${verificationDelete.count} verification tokens`);

  const remainingProjects = await prisma.project.count();
  console.log(`✅ All users cleared successfully! Projects remain safe in database (${remainingProjects} projects retained).`);
}

main()
  .catch((err) => {
    console.error("❌ Failed to clear users:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

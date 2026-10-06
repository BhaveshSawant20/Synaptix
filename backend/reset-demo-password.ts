import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "./src/lib/prisma";

async function main() {
  const email = "admin@synaptixdemo.com";
  const newPassword = "Synaptix@2026";

  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (!admin) {
    throw new Error(`Admin not found: ${email}`);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      passwordHash,
    },
  });

  console.log("Demo password reset successfully.");
  console.log(`Email: ${email}`);
  console.log(`Password: ${newPassword}`);
}

main()
  .catch((error) => {
    console.error("Password reset failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
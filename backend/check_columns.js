const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
    const r = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \x27User\x27 ORDER BY ordinal_position");
    console.log("User columns:", r.map(x => x.column_name + " (" + x.data_type + ")").join(", "));
  } catch(e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

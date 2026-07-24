import { PrismaClient, type BudgetRange, type LeadStatus } from "@prisma/client";
import { hash } from "bcryptjs";

/**
 * Database seed.
 *
 * Creates the first admin account from environment variables, so no real
 * credential is ever committed to the repository, and (optionally) a handful
 * of demo leads so the admin inbox isn't empty during a walkthrough.
 *
 * Run with:  npx prisma db seed
 */

const prisma = new PrismaClient();

/**
 * bcrypt cost factor. 12 is the current sensible default: ~250ms per hash on
 * commodity hardware, which is slow enough to make offline brute-forcing
 * expensive and fast enough that a login still feels instant.
 */
const BCRYPT_ROUNDS = 12;

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  // Trimmed to match `loginSchema`, which also trims. A .env value can easily
  // carry a trailing space; without this the seeded hash would cover a
  // password the login form can no longer produce.
  const password = process.env.SEED_ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set. Copy .env.example to .env and fill them in.",
    );
  }

  if (password.length < 10) {
    throw new Error(
      "SEED_ADMIN_PASSWORD must be at least 10 characters. This account guards every lead in the database.",
    );
  }

  // The plaintext never reaches the database — only this digest does.
  const passwordHash = await hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    // Re-running the seed rotates the password rather than failing on the
    // unique constraint, which makes it a usable "reset my admin" command.
    update: { passwordHash },
    create: { email, passwordHash },
    select: { id: true, email: true },
  });

  console.log(`✔ Admin user ready: ${admin.email}`);
}

/** Demo leads, so the inbox has something to search, filter and page through. */
const DEMO_LEADS: Array<{
  name: string;
  email: string;
  budgetRange: BudgetRange;
  message: string;
  status: LeadStatus;
}> = [
  {
    name: "Priya Raman",
    email: "priya@northwind-retail.com",
    budgetRange: "FROM_5K_TO_20K",
    message:
      "We run a 40-store retail chain and our current stock reporting is a spreadsheet someone emails around on Mondays. Looking for a proper dashboard by end of quarter.",
    status: "NEW",
  },
  {
    name: "Tom Okafor",
    email: "tom.okafor@brightpath.io",
    budgetRange: "FROM_1K_TO_5K",
    message:
      "Need a landing page and booking flow for a coaching business. Design is done in Figma, just need it built and hooked up to Stripe.",
    status: "CONTACTED",
  },
  {
    name: "Lena Fischer",
    email: "l.fischer@atlas-logistics.de",
    budgetRange: "OVER_20K",
    message:
      "Replacing an internal fleet management tool that has been unmaintained for three years. Roughly 200 daily users, needs to integrate with our existing SAP setup. Happy to run a paid discovery phase first.",
    status: "NEW",
  },
  {
    name: "Marcus Bell",
    email: "marcus@bellandsons.co.uk",
    budgetRange: "UNDER_1K",
    message:
      "Small joinery business, just need a one-page site with a contact form and a gallery of past work.",
    status: "CLOSED",
  },
  {
    name: "Aisha Nkemelu",
    email: "aisha@clearwaterhealth.org",
    budgetRange: "FROM_5K_TO_20K",
    message:
      "Patient intake forms are still on paper. We want a secure web form that our staff can review, with an audit trail. Data protection review will be part of the process.",
    status: "CONTACTED",
  },
  {
    name: "Diego Santos",
    email: "diego.santos@vela-studio.com",
    budgetRange: "FROM_1K_TO_5K",
    message:
      "Portfolio site rebuild. Currently on a page builder that has become slow and expensive to maintain.",
    status: "NEW",
  },
  {
    name: "Hannah Whitfield",
    email: "hannah@meridian-legal.com",
    budgetRange: "OVER_20K",
    message:
      "Document automation for a mid-size legal practice. We generate about 800 contracts a month from templates and the manual steps are eating junior hours.",
    status: "NEW",
  },
  {
    name: "Yusuf Demir",
    email: "yusuf@kadikoy-imports.com",
    budgetRange: "FROM_5K_TO_20K",
    message:
      "Customer portal where our wholesale buyers can see live pricing and place repeat orders. We have an existing API for stock levels.",
    status: "CONTACTED",
  },
];

async function seedDemoLeads() {
  const existing = await prisma.lead.count();

  // Only seed an empty table — this must never clobber real submissions if it
  // is accidentally run against a live database.
  if (existing > 0) {
    console.log(`• Skipping demo leads — ${existing} lead(s) already present.`);
    return;
  }

  // Backdate the rows across the last few days so "newest first" sorting and
  // the created-at column are actually demonstrable.
  const now = Date.now();
  const created = await prisma.lead.createMany({
    data: DEMO_LEADS.map((lead, index) => ({
      ...lead,
      createdAt: new Date(now - index * 9 * 60 * 60 * 1000),
    })),
  });

  console.log(`✔ Inserted ${created.count} demo lead(s).`);
}

async function main() {
  await seedAdminUser();
  await seedDemoLeads();
}

main()
  .catch((error) => {
    console.error("✖ Seed failed:", error);
    // Non-zero exit so a CI or deploy step actually fails instead of
    // continuing with an unseeded database.
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

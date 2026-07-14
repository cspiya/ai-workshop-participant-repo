import { PrismaClient } from "@prisma/client";

// Seed the database with the sample data from the product spec §15.
// Idempotent: clears the three tables first, then recreates the sample rows,
// so re-running `npm run db:seed` always yields the same known state.

const db = new PrismaClient();

async function main() {
  // Order matters: Interaction -> Contact -> Company (respect FKs).
  await db.interaction.deleteMany();
  await db.contact.deleteMany();
  await db.company.deleteMany();

  // Sample companies (spec §15).
  const acme = await db.company.create({
    data: {
      name: "Acme Logistics",
      website: "https://acme-logistics.example.com",
      industry: "Logistics",
      notes: "Regional logistics provider.",
    },
  });

  const greenTech = await db.company.create({
    data: {
      name: "GreenTech Solutions",
      website: "https://greentech.example.com",
      industry: "Renewable Energy",
      notes: "Solar and energy-storage vendor.",
    },
  });

  const northstar = await db.company.create({
    data: {
      name: "Northstar Consulting",
      website: "https://northstar-consulting.example.com",
      industry: "Consulting",
      notes: "Boutique management consultancy.",
    },
  });

  // Sample contacts (spec §15).
  const anna = await db.contact.create({
    data: {
      name: "Anna Kovács",
      jobTitle: "Operations Director",
      email: "anna.kovacs@acme-logistics.example.com",
      phone: "+36 30 111 2222",
      linkedinUrl: "https://www.linkedin.com/in/anna-kovacs",
      status: "CONTACTED",
      companyId: acme.id,
      nextFollowUpAt: new Date("2026-07-21T09:00:00+02:00"),
      notes: "Met at the logistics expo.",
    },
  });

  const peter = await db.contact.create({
    data: {
      name: "Péter Nagy",
      jobTitle: "CEO",
      email: "peter.nagy@greentech.example.com",
      phone: "+36 30 333 4444",
      linkedinUrl: "https://www.linkedin.com/in/peter-nagy",
      status: "NEW",
      companyId: greenTech.id,
    },
  });

  const julia = await db.contact.create({
    data: {
      name: "Júlia Tóth",
      jobTitle: "HR Manager",
      email: "julia.toth@northstar-consulting.example.com",
      phone: "+36 30 555 6666",
      linkedinUrl: "https://www.linkedin.com/in/julia-toth",
      status: "REPLIED",
      companyId: northstar.id,
      nextFollowUpAt: new Date("2026-07-16T14:00:00+02:00"),
      notes: "Interested in a partnership.",
    },
  });

  // Sample interactions (spec §15).
  await db.interaction.createMany({
    data: [
      {
        contactId: anna.id,
        type: "LINKEDIN_MESSAGE",
        subject: "LinkedIn connection",
        notes: "Sent a connection request and short intro.",
        happenedAt: new Date("2026-07-10T10:00:00+02:00"),
      },
      {
        contactId: anna.id,
        type: "EMAIL",
        subject: "Introduction email",
        notes: "Sent the introduction email with our one-pager.",
        happenedAt: new Date("2026-07-12T11:30:00+02:00"),
      },
      {
        contactId: julia.id,
        type: "MEETING",
        subject: "30-minute online meeting",
        notes: "Discussed collaboration scope over a 30-minute call.",
        happenedAt: new Date("2026-07-13T15:00:00+02:00"),
      },
      {
        contactId: peter.id,
        type: "NOTE",
        subject: "Follow-up note",
        notes: "Reminder to follow up after the product launch.",
        happenedAt: new Date("2026-07-14T09:00:00+02:00"),
      },
    ],
  });

  const companies = await db.company.count();
  const contacts = await db.contact.count();
  const interactions = await db.interaction.count();
  console.log(
    `Seed complete: ${companies} companies, ${contacts} contacts, ${interactions} interactions.`,
  );
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });

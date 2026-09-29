/**
 * Database seed.
 *
 * Creates the demo administrator and a realistic set of IEEE ITB Student
 * Branch events spanning every status, category and format, with a mix of
 * upcoming and past dates so every filter and empty-state path can be seen.
 *
 * Run with:  npm run db:seed
 *
 * NOTE: this script clears the `events` and `sessions` tables before
 * inserting, so it is only ever run against a development database.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

const DAY = 86_400_000;

/** Midnight today, so seeded times stay stable within a run. */
function at(daysFromNow: number, hour: number, minute = 0): Date {
  const date = new Date(Date.now() + daysFromNow * DAY);
  date.setHours(hour, minute, 0, 0);
  return date;
}

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "admin@ieee-itb.ac.id").toLowerCase();
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Bagas Prakoso";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin#2026!";

type SeedEvent = {
  title: string;
  summary: string;
  description: string;
  category: string;
  format: string;
  status: string;
  startIn: number;
  endIn?: number;
  hour: number;
  minute?: number;
  endHour: number;
  location: string;
  address: string;
  city: string;
  price: number;
  capacity: number;
  attendees: number;
  isFeatured?: boolean;
};

const EVENTS: SeedEvent[] = [
  {
    title: "IEEE ITB Student Branch Annual Tech Summit 2026",
    summary:
      "Our flagship annual gathering: two days of keynotes, technical tracks and a student project expo.",
    description: `The IEEE ITB Student Branch Annual Tech Summit returns for its 2026 edition — the biggest student-led technology gathering on campus.

Over two days, six technical tracks run in parallel covering embedded systems, machine learning, power electronics, telecommunications and software engineering. Every track is led by alumni and industry practitioners, and each session ends with an open Q&A so students can ask the questions that matter.

The summit also hosts the Student Project Expo, where final-year capstone teams demonstrate working prototypes to industry judges. Last year the expo attracted more than 40 project teams and three partnership offers from partner companies.

Bring your student ID. Registration is free for members and includes lunch, refreshments and a certificate of attendance.`,
    category: "TECHNICAL_CONFERENCE",
    format: "IN_PERSON",
    status: "PUBLISHED",
    startIn: 45,
    endIn: 46,
    hour: 8,
    minute: 30,
    endHour: 17,
    location: "ITB Ganesha Campus — Aula Basement",
    address: "Jl. Ganesha No. 10, Lebak Sudi, Coblong",
    city: "Bandung",
    price: 0,
    capacity: 800,
    attendees: 612,
    isFeatured: true,
  },
  {
    title: "Full-Stack Next.js & Serverless Masterclass",
    summary:
      "Hands-on session building and deploying a production Next.js app with a serverless backend.",
    description: `A three-hour, hands-on masterclass that takes you from an empty folder to a deployed full-stack application.

You will build a small event platform with the App Router, a typed REST API, a relational database, cookie-based authentication and file uploads. Along the way we cover server components versus client components, form validation on the server, and how to reason about loading, empty and error states.

Bring a laptop with Node.js 20 or newer installed. The repository is shared beforehand so you can start from the same baseline as the instructor. Snacks and drinks are provided; the workshop is capped at 60 participants so everyone gets help.`,
    category: "WORKSHOP",
    format: "IN_PERSON",
    status: "PUBLISHED",
    startIn: 18,
    hour: 9,
    endHour: 12,
    location: "Lab Elektronika, Pawon 2 Lantai 3",
    address: "Jl. Ganesha No. 10, Coblong",
    city: "Bandung",
    price: 75000,
    capacity: 60,
    attendees: 54,
  },
  {
    title: "Embedded Systems & IoT Hands-on Lab",
    summary:
      "Programme STM32 microcontrollers, read sensors, and publish readings to a live dashboard.",
    description: `A practical laboratory session on embedded systems and the Internet of Things.

Participants are grouped in pairs and each pair receives an STM32 development board, a set of sensors and a soldering station. You will configure the clock tree, read temperature and motion sensors over I2C and SPI, then stream the readings over MQTT to a small dashboard you build yourself.

No prior embedded experience is required, but basic C knowledge helps. All equipment is provided and the boards can be taken home afterwards so you can keep experimenting.

Places are limited by the number of kits available. Registration includes the workshop fee and a take-home dev board.`,
    category: "HANDS_ON_LAB",
    format: "IN_PERSON",
    status: "PUBLISHED",
    startIn: 25,
    hour: 13,
    endHour: 17,
    location: "Lab Instrumentasi, Pawon 1",
    address: "Jl. Ganesha No. 10, Coblong",
    city: "Bandung",
    price: 150000,
    capacity: 40,
    attendees: 38,
  },
  {
    title: "Women in Engineering Leadership Forum",
    summary:
      "A half-day forum with alumnae leading research teams and engineering organisations.",
    description: `The Women in Engineering Leadership Forum brings together alumnae who now lead research laboratories, engineering teams and product organisations.

The format is a series of short fireside chats followed by an open panel. Speakers share how they moved from campus projects to their current roles, what they wish they had known earlier, and how they build teams that stay engaged.

The closing segment is a mentoring clinic: attendees can book fifteen-minute one-to-one conversations with speakers. Places are free but limited so that the mentoring portion stays meaningful.

A live stream is available for members who cannot travel to Bandung.`,
    category: "EXECUTIVE_SUMMIT",
    format: "HYBRID",
    status: "PUBLISHED",
    startIn: 60,
    hour: 9,
    endHour: 15,
    location: "Grand Aston Pasteur Hall",
    address: "Jl. Prof. Dr. Raoenoroat No. 13, Sukajadi",
    city: "Bandung",
    price: 0,
    capacity: 300,
    attendees: 187,
  },
  {
    title: "IEEE ITB Hackathon: Build for Bandung",
    summary:
      "Thirty-six hours to build something that improves daily life in the city. Prizes for the top three teams.",
    description: `The IEEE ITB Hackathon is a 36-hour build sprint open to all undergraduate students across Indonesia.

Teams of two to four pick a problem statement drawn from real challenges submitted by Bandung city agencies, campus laboratories and community organisations. Mentors from partner companies are on site throughout for technical guidance, and there is a hardware lab for teams that want to build a physical device.

Judging weighs working software, impact on the community, and how thoughtfully the team documented their work. The top three teams receive cash prizes and an incubation slot with our partner incubator.

Registration is free. Meals are provided throughout the event, and sleeping space is available for participants travelling from outside Bandung.`,
    category: "HACKATHON",
    format: "IN_PERSON",
    status: "SOLD_OUT",
    startIn: 10,
    endIn: 12,
    hour: 8,
    endHour: 20,
    location: "Ganesha Campus Innovation Center",
    address: "Jl. Ganesha No. 10, Coblong",
    city: "Bandung",
    price: 0,
    capacity: 240,
    attendees: 240,
  },
  {
    title: "Signal Processing Webinar: Beyond 5G",
    summary:
      "A live online lecture on modulation, massive MIMO and what comes after current 5G standards.",
    description: `A live online lecture in the Signal Processing Study Group series.

The session covers the physical layer of current 5G NR: OFDM numerology, subcarrier spacing, channel estimation and massive MIMO beamforming. It then looks at what is being standardised next — sub-THz communications, integrated sensing and communication, and AI-native air interfaces.

Expect roughly 45 minutes of material followed by 30 minutes of questions. Slides and the recording are shared with everyone who registers, whether or not you attend live.

Join from anywhere: the session is streamed and the chat is moderated for the Q&A.`,
    category: "WEBINAR",
    format: "VIRTUAL",
    status: "PUBLISHED",
    startIn: 7,
    hour: 19,
    endHour: 21,
    location: "Zoom (link shared by email)",
    address: "",
    city: "Online",
    price: 0,
    capacity: 500,
    attendees: 233,
  },
  {
    title: "Community Coffee & Code Meetup",
    summary:
      "A relaxed Sunday morning meetup: short talks, open tables and a lot of coffee.",
    description: `Our regular community meetup, held on the last Sunday of every month.

The format is deliberately low-key: two lightning talks of ten minutes each, then open tables where people work on their own projects or help each other out. Some members bring hardware to show, some bring questions about a course they are stuck on, some just come for the coffee.

Newcomers are especially welcome — if it is your first time, just say hello and someone will walk you through how the evening works.

There is no charge and no registration fee. Coffee and snacks are covered by the branch.`,
    category: "COMMUNITY",
    format: "IN_PERSON",
    status: "PUBLISHED",
    startIn: 3,
    hour: 9,
    minute: 30,
    endHour: 12,
    location: "Beans Cafe, Jl. Dago",
    address: "Jl. Ir. H. Juanda No. 204, Dago",
    city: "Bandung",
    price: 0,
    capacity: 80,
    attendees: 43,
  },
  {
    title: "Robotics Competition — IEEE Southeast Asia Regional",
    summary:
      "Our robotics team competes regionally. Come cheer, or join the build crew that gets them there.",
    description: `The IEEE ITB robotics team is heading to the IEEE Southeast Asia Regional Robotics Competition.

The competition covers autonomous navigation, manipulation and a surprise challenge revealed on the day. The team has been meeting twice a week since June and this is the event that decides whether they advance to the world finals.

The public is welcome. Spectators can watch the arena, try the calibration rigs and meet the team. If you are interested in joining the build crew for the next cycle, there is a sign-up table at the entrance.

Entry to the venue is free; registration for competitors happens through the team, not this page.`,
    category: "TECHNICAL_CONFERENCE",
    format: "IN_PERSON",
    status: "DRAFT",
    startIn: 75,
    endIn: 76,
    hour: 8,
    endHour: 18,
    location: "Jakarta Convention Centre",
    address: "Jl. Gatot Subroto No. 3, Senayan",
    city: "Jakarta",
    price: 0,
    capacity: 500,
    attendees: 0,
  },
  {
    title: "Cloud & DevOps Certification Bootcamp",
    summary:
      "An intensive weekend bootcamp covering containers, pipelines and cloud deployment fundamentals.",
    description: `A two-day intensive that maps directly onto the associate-level cloud certification objectives.

Day one covers Linux fundamentals, containerisation and networking. Day two covers continuous integration and delivery, infrastructure as code, observability and cost management. Every module ends with a hands-on exercise on a real environment you keep afterwards.

Participants who complete the assignments receive a certificate of completion from the branch. The bootcamp is aimed at final-year students and early-career engineers preparing for certification.

Prerequisites: comfortable with a terminal and basic programming in any language. Fee covers lunch on both days.`,
    category: "WORKSHOP",
    format: "VIRTUAL",
    status: "DRAFT",
    startIn: 40,
    endIn: 41,
    hour: 9,
    endHour: 17,
    location: "Online — Zoom & Google Workspace",
    address: "",
    city: "Online",
    price: 250000,
    capacity: 100,
    attendees: 0,
  },
  {
    title: "AI Ethics & Governance Symposium",
    summary:
      "A symposium on deploying machine learning responsibly, with case studies from industry and public policy.",
    description: `A one-day symposium on the practical and ethical questions that come with deploying machine learning systems.

The morning covers governance frameworks and documentation practice. The afternoon is a case-study track: a fintech on explainability requirements, a healthtech startup on consent, and a public-sector project on fairness auditing.

Speakers are drawn from industry, academia and government. Each case study leaves time for questions from the floor, and there is a closing panel on what responsible deployment looks like for a small team with limited resources.

Members attend free. Non-members may attend for Rp 300.000, which covers lunch and the printed proceedings.`,
    category: "EXECUTIVE_SUMMIT",
    format: "HYBRID",
    status: "PUBLISHED",
    startIn: 90,
    hour: 9,
    endHour: 17,
    location: "Auditorium, SAPS ITB",
    address: "Jl. Ganesha No. 10, Coblong",
    city: "Bandung",
    price: 0,
    capacity: 250,
    attendees: 96,
  },
  {
    title: "Open Source Contribution Sprint",
    summary:
      "A guided sprint where members make their first pull request on a real project, with mentors on hand.",
    description: `Many people want to contribute to open source but never make the leap. This sprint is designed to remove that barrier.

We start with an hour on how contribution actually works: finding a project, reading the contributing guidelines, setting up a development environment, and what a good first pull request looks like. Then participants spend the rest of the day working on real issues that maintainers have marked as good first issues.

Mentors from partner companies review pull requests as they are opened, so you get feedback on the same day rather than waiting weeks.

Bring a laptop. Lunch is provided, and the sprint is free for members.`,
    category: "HACKATHON",
    format: "VIRTUAL",
    status: "PUBLISHED",
    startIn: 15,
    hour: 9,
    endHour: 16,
    location: "Online — GitHub Codespaces",
    address: "",
    city: "Online",
    price: 0,
    capacity: 150,
    attendees: 88,
  },
  {
    title: "Satellite Communication Workshop",
    summary:
      "Build a software-defined radio link and decode live satellite telemetry. Cancelled this cycle.",
    description: `A two-day workshop on satellite communications using software-defined radio.

Participants build a complete downlink chain: antenna selection, filtering, sampling, demodulation and decoding of amateur satellite telemetry. Several birds are in reach from Bandung, so most participants receive real signals during the session.

This event has been cancelled for the current cycle because our antenna installation is being replaced. The new date will be announced on this page once the hardware is ready.

Everyone who had already registered has been contacted directly with a refund.`,
    category: "HANDS_ON_LAB",
    format: "IN_PERSON",
    status: "CANCELLED",
    startIn: 20,
    endIn: 21,
    hour: 9,
    endHour: 16,
    location: "Lab Telekomunikasi, Pawon 3",
    address: "Jl. Ganesha No. 10, Coblong",
    city: "Bandung",
    price: 200000,
    capacity: 30,
    attendees: 27,
  },
  {
    title: "Engineering & Graduate School Career Fair",
    summary:
      "Thirty partner employers on campus, plus CV clinics and mock interviews across two days.",
    description: `Our annual career fair, held over two days in the co-working area.

More than thirty employers attend, ranging from local startups to multinational engineering firms and research institutes. Alongside the booths we run a CV clinic, mock technical interviews, and a session on graduate school applications and scholarships.

Bring printed copies of your CV — the free printing desk is next to the entrance. Alumni are welcome to attend; there is a dedicated lounge for mentor sign-ups.

The fair is free and open to all students from any university.`,
    category: "COMMUNITY",
    format: "IN_PERSON",
    status: "PUBLISHED",
    startIn: -12,
    endIn: -11,
    hour: 9,
    endHour: 16,
    location: "Co-Working Area, Ganesha Campus",
    address: "Jl. Ganesha No. 10, Coblong",
    city: "Bandung",
    price: 0,
    capacity: 1200,
    attendees: 934,
  },
  {
    title: "Internet of Things Study Group Kickoff",
    summary:
      "Kickoff meeting for the IoT study group: roadmap, project proposals and weekly cadence. Completed.",
    description: `The kickoff meeting for the Internet of Things Study Group.

The group meets weekly to work through a structured roadmap covering sensor networks, edge computing, communication protocols and security. Members take on semester-long projects, and several have gone on to become competition entries.

This kickoff covered the roadmap for the current cycle, introduced the mentors, and collected project proposals from members.

The IoT Study Group meets every Wednesday evening and is open to all members.`,
    category: "COMMUNITY",
    format: "IN_PERSON",
    status: "ARCHIVED",
    startIn: -30,
    hour: 18,
    endHour: 20,
    location: "Ruang DISCUSSION, Pawon 4",
    address: "Jl. Ganesha No. 10, Coblong",
    city: "Bandung",
    price: 0,
    capacity: 60,
    attendees: 51,
  },
  {
    title: "Digital Signal Processing Lecture Series — Session 6",
    summary:
      "The sixth and final session of the DSP lecture series, covering multirate filter banks. Completed.",
    description: `The closing session of our digital signal processing lecture series.

This session covered multirate filter banks, quadrature mirror filters and the relationship between wavelets and subband decomposition, then worked through two extended examples from the previous sessions.

The full series covered sampling theory, discrete-time Fourier analysis, digital filter design and fixed-point arithmetic. Recordings of all six sessions remain available to members in the shared drive.

Thank you to everyone who attended — the next series starts next semester.`,
    category: "WEBINAR",
    format: "VIRTUAL",
    status: "ARCHIVED",
    startIn: -60,
    hour: 19,
    endHour: 21,
    location: "Online — Zoom",
    address: "",
    city: "Online",
    price: 0,
    capacity: 400,
    attendees: 176,
  },
];

async function main() {
  console.log("→ Seeding IEEE ITB Events database\n");

  // Development only: start from a clean slate so re-seeding is predictable.
  await prisma.session.deleteMany();
  await prisma.event.deleteMany();

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: ADMIN_NAME, passwordHash: await hashPassword(ADMIN_PASSWORD) },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      role: "ADMIN",
    },
  });

  console.log(`  ✓ admin: ${admin.email} / ${ADMIN_PASSWORD}`);

  let featuredCount = 0;

  for (const seed of EVENTS) {
    const slug = slugify(seed.title);

    await prisma.event.create({
      data: {
        slug,
        title: seed.title,
        summary: seed.summary,
        description: seed.description.trim(),
        category: seed.category,
        format: seed.format,
        status: seed.status,
        startDate: at(seed.startIn, seed.hour, seed.minute),
        endDate: at(seed.endIn ?? seed.startIn, seed.endHour),
        location: seed.location,
        address: seed.address || null,
        city: seed.city,
        organizer: "IEEE ITB Student Branch",
        price: seed.price,
        capacity: seed.capacity,
        attendees: seed.attendees,
        imageUrl: null,
        isFeatured: seed.isFeatured ?? false,
        createdById: admin.id,
      },
    });

    if (seed.isFeatured) featuredCount += 1;
  }

  const total = await prisma.event.count();
  const upcoming = await prisma.event.count({ where: { endDate: { gte: new Date() } } });

  console.log(`  ✓ ${total} events (${upcoming} upcoming, ${featuredCount} featured)`);
  console.log("\nSeed complete. Run `npm run dev` and open http://localhost:3000");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

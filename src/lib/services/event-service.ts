import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, notFound } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { endOfWibDay, startOfWibDay } from "@/lib/format";
import type { EventFormValues, EventQuery } from "@/lib/validation/event";

/**
 * Event service — the single source of truth for every read and write.
 *
 * Both entry points call into here:
 *   • Server Actions  (`src/app/actions/events.ts`) for the admin UI forms
 *   • Route Handlers  (`src/app/api/events/*`)      for the public REST API
 *
 * Keeping one implementation means validation, authorisation rules and query
 * shapes cannot drift between the two.
 */

export type EventRecord = Prisma.EventGetPayload<Record<string, never>>;

/** Which slice of the catalogue a caller may see. */
export type Scope = "public" | "admin";

/** Statuses the public catalogue is allowed to surface. */
const PUBLIC_STATUSES: string[] = ["PUBLISHED", "SOLD_OUT"];

const DAY_MS = 86_400_000;

/* -------------------------------------------------------------------------- */
/*  Query construction                                                        */
/* -------------------------------------------------------------------------- */

function priceFilter(price: EventQuery["price"]): Prisma.EventWhereInput | undefined {
  switch (price) {
    case "free":
      return { price: { equals: 0 } };
    case "under_100k":
      return { price: { gt: 0, lt: 100_000 } };
    case "100k_500k":
      return { price: { gte: 100_000, lte: 500_000 } };
    case "over_500k":
      return { price: { gt: 500_000 } };
    default:
      return undefined;
  }
}

function timeFilter(when: EventQuery["when"], now: Date): Prisma.EventWhereInput | undefined {
  switch (when) {
    case "upcoming":
      return { endDate: { gte: now } };
    case "past":
      return { endDate: { lt: now } };
    case "today": {
      // WIB day boundaries, not the host's: on a UTC deployment the local
      // midnight is seven hours off, which would misclassify early-morning
      // WIB events.
      return {
        startDate: { lte: endOfWibDay(now) },
        endDate: { gte: new Date(startOfWibDay(now)) },
      };
    }
    case "week":
      return { endDate: { gte: now }, startDate: { lte: new Date(now.getTime() + 7 * DAY_MS) } };
    case "month":
      return { endDate: { gte: now }, startDate: { lte: new Date(now.getTime() + 30 * DAY_MS) } };
    default:
      return undefined;
  }
}

function searchFilter(q: string | undefined): Prisma.EventWhereInput | undefined {
  const term = q?.trim();
  if (!term) return undefined;

  // SQLite's LIKE is already case-insensitive for ASCII, so `contains` is enough
  // here. (On PostgreSQL this would need `mode: "insensitive"`.)
  return {
    OR: [
      { title: { contains: term } },
      { summary: { contains: term } },
      { location: { contains: term } },
      { city: { contains: term } },
      { organizer: { contains: term } },
    ],
  };
}

function orderByClause(sort: EventQuery["sort"]): Prisma.EventOrderByWithRelationInput[] {
  switch (sort) {
    case "date_asc":
      return [{ startDate: "asc" }];
    case "date_desc":
      return [{ startDate: "desc" }];
    case "price_asc":
      return [{ price: "asc" }, { startDate: "asc" }];
    case "price_desc":
      return [{ price: "desc" }, { startDate: "asc" }];
    case "title_asc":
      return [{ title: "asc" }];
    case "featured":
    default:
      return [{ isFeatured: "desc" }, { startDate: "asc" }];
  }
}

/**
 * Facet counts deliberately ignore the facet they describe, so "Workshops (12)"
 * shows how many results you would get by *choosing* Workshops — not by keeping
 * the currently selected one.
 */
function buildWhere(
  query: EventQuery,
  scope: Scope,
  options: { ignoreFacets?: boolean } = {},
): Prisma.EventWhereInput {
  const now = new Date();
  const clauses: Prisma.EventWhereInput[] = [];

  if (scope === "public") {
    // A public `?status=` narrows the visible set; it can never widen it. The
    // intersection matters: accepting `?status=DRAFT` and returning nothing is
    // correct, but applying the filter on its own would leak drafts.
    const visible = query.status
      ? PUBLIC_STATUSES.filter((status) => status === query.status)
      : PUBLIC_STATUSES;
    clauses.push({ status: { in: visible } });
  } else if (!options.ignoreFacets && query.status) {
    clauses.push({ status: query.status });
  }

  if (!options.ignoreFacets) {
    if (query.category) clauses.push({ category: query.category });
    if (query.format) clauses.push({ format: query.format });
    if (query.featured) clauses.push({ isFeatured: query.featured === "true" });
  }

  const search = searchFilter(query.q);
  if (search) clauses.push(search);

  const time = timeFilter(query.when, now);
  if (time) clauses.push(time);

  const price = priceFilter(query.price);
  if (price) clauses.push(price);

  return clauses.length ? { AND: clauses } : {};
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

export type EventListResult = {
  events: EventRecord[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export async function listEvents(
  query: EventQuery,
  scope: Scope = "public",
): Promise<EventListResult> {
  const where = buildWhere(query, scope);
  const perPage = query.perPage ?? 9;
  const page = query.page ?? 1;

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: orderByClause(query.sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return {
    events,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export type CatalogFacets = {
  category: Record<string, number>;
  format: Record<string, number>;
};

/** Counts used by the catalog's filter sidebar. */
export async function getCatalogFacets(query: EventQuery, scope: Scope = "public") {
  const where = buildWhere(query, scope, { ignoreFacets: true });

  const [byCategory, byFormat] = await Promise.all([
    prisma.event.groupBy({ by: ["category"], where, _count: { _all: true } }),
    prisma.event.groupBy({ by: ["format"], where, _count: { _all: true } }),
  ]);

  const toRecord = (rows: Array<Record<string, unknown>>, key: string) =>
    Object.fromEntries(rows.map((row) => [String(row[key]), Number(row._count)]));

  return {
    category: toRecord(byCategory, "category") as Record<string, number>,
    format: toRecord(byFormat, "format") as Record<string, number>,
  };
}

/** Fetch one event by its public slug. Drafts stay hidden from the public site. */
export async function getEventBySlug(slug: string, scope: Scope = "public") {
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return null;
  if (scope === "public" && !PUBLIC_STATUSES.includes(event.status)) return null;
  return event;
}

export async function getEventById(id: string, scope: Scope = "public") {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return null;
  if (scope === "public" && !PUBLIC_STATUSES.includes(event.status)) return null;
  return event;
}

/** The event shown in the catalog hero: the next featured one, else the next one. */
export async function getHeroEvent() {
  const now = new Date();
  return (
    (await prisma.event.findFirst({
      where: { status: "PUBLISHED", endDate: { gte: now } },
      orderBy: [{ isFeatured: "desc" }, { startDate: "asc" }],
    })) ??
    (await prisma.event.findFirst({
      where: { status: { in: PUBLIC_STATUSES } },
      orderBy: [{ startDate: "desc" }],
    }))
  );
}

/** Same category first, then anything else — shown at the bottom of the detail page. */
export async function getRelatedEvents(event: EventRecord, limit = 3) {
  const now = new Date();
  return prisma.event.findMany({
    where: {
      id: { not: event.id },
      status: { in: PUBLIC_STATUSES },
      endDate: { gte: now },
    },
    orderBy: [{ category: "asc" }, { startDate: "asc" }],
    take: limit * 3,
  }).then((rows) => {
    const sameCategory = rows.filter((row) => row.category === event.category);
    const others = rows.filter((row) => row.category !== event.category);
    return [...sameCategory, ...others].slice(0, limit);
  });
}

/* -------------------------------------------------------------------------- */
/*  Dashboard statistics                                                      */
/* -------------------------------------------------------------------------- */

export type AdminStats = {
  total: number;
  published: number;
  draft: number;
  soldOut: number;
  archived: number;
  cancelled: number;
  upcoming: number;
  past: number;
  next30Days: number;
  totalAttendees: number;
  totalCapacity: number;
  occupancy: number;
  revenue: number;
  freeEvents: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * DAY_MS);

  const [
    total,
    published,
    draft,
    soldOut,
    archived,
    cancelled,
    upcoming,
    past,
    next30Days,
    aggregates,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.event.count({ where: { status: "DRAFT" } }),
    prisma.event.count({ where: { status: "SOLD_OUT" } }),
    prisma.event.count({ where: { status: "ARCHIVED" } }),
    prisma.event.count({ where: { status: "CANCELLED" } }),
    prisma.event.count({ where: { endDate: { gte: now } } }),
    prisma.event.count({ where: { endDate: { lt: now } } }),
    prisma.event.count({ where: { endDate: { gte: now }, startDate: { lte: horizon } } }),
    prisma.event.aggregate({
      _sum: { attendees: true, capacity: true, price: true },
      _count: { _all: true },
    }),
  ]);

  const totalAttendees = aggregates._sum.attendees ?? 0;
  const totalCapacity = aggregates._sum.capacity ?? 0;

  // "Revenue" is a proxy: registered attendees × ticket price, summed in SQL
  // would require fetching every row, so the per-event product is summed here.
  const pricedRows = await prisma.event.findMany({
    select: { price: true, attendees: true },
    where: { status: { in: ["PUBLISHED", "SOLD_OUT"] } },
  });
  const revenue = pricedRows.reduce((sum, row) => sum + row.price * row.attendees, 0);

  return {
    total,
    published,
    draft,
    soldOut,
    archived,
    cancelled,
    upcoming,
    past,
    next30Days,
    totalAttendees,
    totalCapacity,
    occupancy: totalCapacity === 0 ? 0 : Math.round((totalAttendees / totalCapacity) * 100),
    revenue,
    freeEvents: pricedRows.filter((row) => row.price === 0).length,
  };
}

/* -------------------------------------------------------------------------- */
/*  Writes                                                                    */
/* -------------------------------------------------------------------------- */

const toNullable = (value: string | null) => (value && value.trim() ? value.trim() : null);

/** Find a free slug by appending `-2`, `-3`, … when the base is taken. */
async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "event";

  for (let suffix = 1; suffix < 200; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new AppError("CONFLICT", "Could not generate a unique URL for this event.");
}

function toEventData(values: EventFormValues): Omit<
  Prisma.EventCreateInput,
  "slug" | "createdBy"
> {
  return {
    title: values.title,
    summary: values.summary,
    description: values.description,
    category: values.category,
    format: values.format,
    status: values.status,
    startDate: values.startDate,
    endDate: values.endDate ?? values.startDate,
    location: values.location,
    address: toNullable(values.address),
    city: values.city,
    organizer: values.organizer,
    price: values.price,
    capacity: values.capacity,
    attendees: values.attendees,
    imageUrl: toNullable(values.imageUrl),
    isFeatured: values.isFeatured,
  };
}

export async function createEvent(
  values: EventFormValues,
  createdById: string,
): Promise<EventRecord> {
  // Resolve the slug before inserting so the UNIQUE constraint cannot fire.
  const slug = await generateUniqueSlug(values.title);

  return prisma.event.create({
    data: { ...toEventData(values), slug, createdBy: { connect: { id: createdById } } },
  });
}

/**
 * Update an event.
 *
 * The `slug` is intentionally left untouched: it is part of the public URL, so
 * renaming a title must not break links that are already shared.
 */
export async function updateEvent(id: string, values: EventFormValues): Promise<EventRecord> {
  const existing = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Event");

  return prisma.event.update({ where: { id }, data: toEventData(values) });
}

export async function deleteEvent(id: string): Promise<EventRecord> {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw notFound("Event");
  return prisma.event.delete({ where: { id } });
}

/**
 * Set or clear an event's cover image.
 *
 * Separate from {@link updateEvent} so the image endpoints can change just the
 * cover without round-tripping the full validated form — the file itself is
 * written to disk by `lib/uploads` before this is called.
 */
export async function updateEventImage(id: string, imageUrl: string | null): Promise<EventRecord> {
  const existing = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Event");

  return prisma.event.update({ where: { id }, data: { imageUrl } });
}

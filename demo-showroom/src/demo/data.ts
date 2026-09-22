export const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Sales",
  "Marketing",
  "Finance",
  "Support",
  "Operations",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export interface Employee {
  id: number;
  name: string;
  email: string;
  department: Department;
  role: string;
  country: string;
  salary: number;
  rating: number;
  startDate: string;
  active: boolean;
}

export type OrderStatus = "pending" | "paid" | "shipped" | "refunded";

export interface Order {
  id: string;
  customer: string;
  product: string;
  quantity: number;
  total: number;
  status: OrderStatus;
  orderedAt: string;
}

const FIRST_NAMES = ["Ava", "Liam", "Noah", "Emma", "Olivia", "Mateo", "Aarav", "Sofia", "Yuki", "Zara", "Omar", "Priya", "Lucas", "Chloe", "Ivan", "Mei", "Diego", "Amara", "Elias", "Nora"];
const LAST_NAMES = ["Smith", "Garcia", "Kim", "Patel", "Müller", "Rossi", "Silva", "Nguyen", "Cohen", "Okafor", "Tanaka", "Dubois", "Novak", "Haddad", "Larsen", "Costa", "Singh", "Walker", "Ivanova", "Moreau"];
const COUNTRIES = ["India", "United States", "Germany", "Brazil", "Japan", "France", "Nigeria", "Canada", "Australia", "Spain", "Mexico", "Sweden"];
const ROLES = ["Associate", "Specialist", "Senior", "Lead", "Manager", "Director"];
const PRODUCTS = ["Standing desk", "Monitor arm", "Keyboard", "Headset", "Webcam", "Laptop stand", "Desk lamp", "Office chair"];
const STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "refunded"];

/** Deterministic PRNG so the demo data is the same on every load. */
function createRandom(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

export function createEmployees(count: number): Employee[] {
  const random = createRandom(42);
  const pick = <V>(list: readonly V[]) => list[Math.floor(random() * list.length)];
  const start = Date.UTC(2012, 0, 1);
  const span = Date.UTC(2026, 0, 1) - start;

  return Array.from({ length: count }, (_, i) => {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    return {
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first}.${last}${i + 1}@example.com`.toLowerCase(),
      department: pick(DEPARTMENTS),
      role: pick(ROLES),
      country: pick(COUNTRIES),
      salary: Math.round(35_000 + random() * 185_000),
      rating: 1 + Math.floor(random() * 5),
      startDate: isoDate(start + random() * span),
      active: random() > 0.15,
    };
  });
}

export function createOrders(count: number): Order[] {
  const random = createRandom(7);
  const pick = <V>(list: readonly V[]) => list[Math.floor(random() * list.length)];
  const start = Date.UTC(2025, 0, 1);
  const span = Date.UTC(2026, 8, 1) - start;

  return Array.from({ length: count }, (_, i) => {
    const quantity = 1 + Math.floor(random() * 8);
    return {
      id: `ORD-${String(100_000 + i)}`,
      customer: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      product: pick(PRODUCTS),
      quantity,
      total: Math.round(quantity * (20 + random() * 480) * 100) / 100,
      status: pick(STATUSES),
      orderedAt: isoDate(start + random() * span),
    };
  });
}

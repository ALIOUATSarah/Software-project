export type Role = "student" | "visitor" | "officer" | "admin"
export type DriverRole = Extract<Role, "student" | "visitor">
export type ReservationStatus = "Reserved" | "Checked In" | "Departed" | "Expired" | "Cancelled"
export type SpaceStatus = "available" | "occupied" | "restricted"

export type Vehicle = {
  id: string
  ownerId: DriverRole
  name: string
  plate: string
  permits: string[]
  color: string
}

export type Zone = { id: string; name: string }
export type PermitCategory = { name: string; enabled: boolean }

export type ParkingSpace = {
  id: string
  label: string
  zoneId: string
  permit: string
  status: SpaceStatus
}

export type Reservation = {
  id: string
  reference: string
  ownerId: DriverRole
  spaceId: string
  vehicleId: string
  date: string
  startTime: string
  endTime: string
  status: ReservationStatus
  checkedInAt: string | null
  createdAt: string
}

export type Closure = {
  id: string
  spaceId: string
  date: string
  startTime: string
  endTime: string
  reason: string
  createdAt: string
}

export type ExternalBooking = {
  id: string
  spaceId: string
  date: string
  startTime: string
  endTime: string
}

export type ParkingNotification = {
  id: string
  ownerId: DriverRole
  kind: "booking" | "cancellation" | "closure" | "system"
  title: string
  message: string
  createdAt: string
  read: boolean
  reservationId: string | null
}

export type DemoStore = {
  version: 2
  activeRole: Role | null
  simulatedTime: string
  arrivalWindowMinutes: number
  reservations: Reservation[]
  externalBookings: ExternalBooking[]
  vehicles: Vehicle[]
  zones: Zone[]
  spaces: ParkingSpace[]
  closures: Closure[]
  notifications: ParkingNotification[]
  permitCategories: PermitCategory[]
}

export const DEMO_DATE = "2026-11-18"
export const DEFAULT_ARRIVAL_WINDOW_MINUTES = 15
export const STORAGE_KEY = "smart-campus-parking-demo-v1"
export const TIME_PRESETS = ["09:55", "10:05", "10:15", "10:16"]

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student Driver",
  visitor: "Visitor",
  officer: "Parking Officer",
  admin: "Administrator",
}

export const initialZones: Zone[] = [
  { id: "north", name: "North Campus" },
  { id: "library", name: "Library East" },
]

export const initialSpaces: ParkingSpace[] = [
  ...Array.from({ length: 8 }, (_, index) => ({ id: `N-${String(index + 1).padStart(2, "0")}`, label: String(index + 1).padStart(2, "0"), zoneId: "north", permit: "Student", status: index === 2 ? "occupied" as const : "available" as const })),
  { id: "N-09", label: "09", zoneId: "north", permit: "EV", status: "available" },
  { id: "N-10", label: "10", zoneId: "north", permit: "EV", status: "available" },
  { id: "N-11", label: "11", zoneId: "north", permit: "Visitor", status: "available" },
  { id: "N-12", label: "12", zoneId: "north", permit: "Visitor", status: "available" },
  ...Array.from({ length: 6 }, (_, index) => ({ id: `L-${String(index + 1).padStart(2, "0")}`, label: String(index + 1).padStart(2, "0"), zoneId: "library", permit: index === 4 ? "Accessible" : "EV", status: index === 4 ? "restricted" as const : "available" as const })),
  { id: "L-07", label: "07", zoneId: "library", permit: "Student", status: "available" },
  { id: "L-08", label: "08", zoneId: "library", permit: "Visitor", status: "available" },
]

export const initialVehicles: Vehicle[] = [
  { id: "vehicle-student", ownerId: "student", name: "Mazda 3", plate: "D 52814", permits: ["Student"], color: "#7cdf78" },
  { id: "vehicle-electric", ownerId: "student", name: "Tesla Model 3", plate: "E 74102", permits: ["EV", "Student"], color: "#8bb8f7" },
  { id: "vehicle-visitor", ownerId: "visitor", name: "Toyota Corolla", plate: "V 20481", permits: ["Visitor"], color: "#d5b377" },
]

export const initialPermitCategories: PermitCategory[] = [
  { name: "Student", enabled: true },
  { name: "Visitor", enabled: true },
  { name: "EV", enabled: true },
  { name: "Staff", enabled: true },
  { name: "Accessible", enabled: true },
]

export function createId(prefix: string) {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}-${randomId}`
}

export function createInitialStore(): DemoStore {
  return {
    version: 2,
    activeRole: null,
    simulatedTime: "09:55",
    arrivalWindowMinutes: DEFAULT_ARRIVAL_WINDOW_MINUTES,
    reservations: [
      {
        id: "seed-upcoming",
        reference: "UD-2026-038",
        ownerId: "student",
        spaceId: "N-08",
        vehicleId: "vehicle-student",
        date: DEMO_DATE,
        startTime: "10:00",
        endTime: "11:00",
        status: "Reserved",
        checkedInAt: null,
        createdAt: "2026-11-18T08:42:00",
      },
      {
        id: "seed-expired",
        reference: "UD-2026-037",
        ownerId: "student",
        spaceId: "N-05",
        vehicleId: "vehicle-student",
        date: DEMO_DATE,
        startTime: "08:00",
        endTime: "09:00",
        status: "Expired",
        checkedInAt: null,
        createdAt: "2026-11-18T07:42:00",
      },
    ],
    externalBookings: [],
    vehicles: initialVehicles,
    zones: initialZones,
    spaces: initialSpaces,
    closures: [],
    notifications: [],
    permitCategories: initialPermitCategories,
  }
}

export function restoreDemoStore(value: unknown): DemoStore {
  const fresh = createInitialStore()
  if (!value || typeof value !== "object") return fresh
  const saved = value as Partial<DemoStore> & { reservations?: Array<Partial<Reservation> & Record<string, unknown>>; externalBookings?: ExternalBooking[]; simulatedTime?: string }
  if (!Array.isArray(saved.reservations) || typeof saved.simulatedTime !== "string") return fresh
  if (saved.version === 2 && Array.isArray(saved.spaces) && Array.isArray(saved.vehicles) && Array.isArray(saved.zones)) {
    return {
      ...fresh,
      ...saved,
      activeRole: saved.activeRole && saved.activeRole in ROLE_LABELS ? saved.activeRole : null,
      arrivalWindowMinutes: Number.isFinite(saved.arrivalWindowMinutes) ? Math.max(1, Number(saved.arrivalWindowMinutes)) : DEFAULT_ARRIVAL_WINDOW_MINUTES,
      externalBookings: Array.isArray(saved.externalBookings) ? saved.externalBookings : [],
      closures: Array.isArray(saved.closures) ? saved.closures : [],
      notifications: Array.isArray(saved.notifications) ? saved.notifications : [],
      permitCategories: Array.isArray(saved.permitCategories) ? saved.permitCategories : initialPermitCategories,
    }
  }

  const migratedReservations = saved.reservations.map((item, index): Reservation | null => {
    const status = item.status
    if (typeof item.id !== "string" || typeof item.spaceId !== "string" || typeof item.date !== "string" || typeof item.startTime !== "string" || typeof item.endTime !== "string") return null
    const safeStatus: ReservationStatus = status === "Checked In" || status === "Expired" ? status : status === "Departed" || status === "Cancelled" ? status : "Reserved"
    return {
      id: item.id,
      reference: typeof item.reference === "string" ? item.reference : `UD-2026-${String(index + 39).padStart(3, "0")}`,
      ownerId: item.ownerId === "visitor" ? "visitor" : "student",
      spaceId: item.spaceId,
      vehicleId: typeof item.vehicleId === "string" ? item.vehicleId : "vehicle-student",
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      status: safeStatus,
      checkedInAt: typeof item.checkedInAt === "string" ? item.checkedInAt : null,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    }
  }).filter((reservation): reservation is Reservation => reservation !== null)
  const reservations = migratedReservations.length ? migratedReservations : fresh.reservations
  if (!reservations.some((reservation) => reservation.status === "Reserved")) reservations.push(fresh.reservations[0])
  if (!reservations.some((reservation) => reservation.id === "seed-expired")) reservations.push(fresh.reservations[1])

  return {
    ...fresh,
    activeRole: null,
    simulatedTime: /^\d{2}:\d{2}$/.test(saved.simulatedTime) ? saved.simulatedTime : fresh.simulatedTime,
    reservations,
    externalBookings: Array.isArray(saved.externalBookings) ? saved.externalBookings : [],
  }
}

export function toLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`)
}

export function getArrivalDeadline(date: string, startTime: string, windowMinutes = DEFAULT_ARRIVAL_WINDOW_MINUTES) {
  const deadline = toLocalDateTime(date, startTime)
  deadline.setMinutes(deadline.getMinutes() + windowMinutes)
  return deadline
}

export function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  const date = new Date(2000, 0, 1, hours || 0, minutes || 0)
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

export function formatTimeRange(startTime: string, endTime: string) {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`
}

export function hasTimeOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA
}

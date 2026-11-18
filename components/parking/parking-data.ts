export type PermitType = "Student" | "EV" | "Staff" | "Accessible"
export type ReservationStatus = "Reserved" | "Checked In" | "Expired"

export type Vehicle = {
  id: string
  name: string
  plate: string
  permits: PermitType[]
  color: string
}

export type ParkingSpace = {
  id: string
  number: string
  zoneId: string
  zoneName: string
  permit: PermitType
  baseState: "available" | "occupied" | "restricted"
}

export type Reservation = {
  id: string
  reference: string
  spaceId: string
  vehicleId: string
  date: string
  startTime: string
  endTime: string
  status: ReservationStatus
  checkedInAt: string | null
  createdAt: string
}

export type ExternalBooking = {
  id: string
  spaceId: string
  startAt: string
  endAt: string
}

export type DemoStore = {
  reservations: Reservation[]
  externalBookings: ExternalBooking[]
  simulatedTime: string
}

export const DEMO_DATE = "2026-11-18"
export const ARRIVAL_WINDOW_MINUTES = 15
export const STORAGE_KEY = "smart-campus-parking-demo-v1"

export const vehicles: Vehicle[] = [
  {
    id: "vehicle-student",
    name: "Mazda 3",
    plate: "D 52814",
    permits: ["Student"],
    color: "#76db79",
  },
  {
    id: "vehicle-electric",
    name: "Tesla Model 3",
    plate: "E 74102",
    permits: ["EV"],
    color: "#74b8ff",
  },
]

export const zones = [
  { id: "north", name: "North Campus" },
  { id: "library", name: "Library East" },
]

export const parkingSpaces: ParkingSpace[] = [
  { id: "N-01", number: "01", zoneId: "north", zoneName: "North Campus", permit: "Student", baseState: "available" },
  { id: "N-02", number: "02", zoneId: "north", zoneName: "North Campus", permit: "Student", baseState: "available" },
  { id: "N-03", number: "03", zoneId: "north", zoneName: "North Campus", permit: "Student", baseState: "occupied" },
  { id: "N-04", number: "04", zoneId: "north", zoneName: "North Campus", permit: "Student", baseState: "available" },
  { id: "N-05", number: "05", zoneId: "north", zoneName: "North Campus", permit: "Student", baseState: "available" },
  { id: "N-06", number: "06", zoneId: "north", zoneName: "North Campus", permit: "Accessible", baseState: "restricted" },
  { id: "N-07", number: "07", zoneId: "north", zoneName: "North Campus", permit: "Staff", baseState: "restricted" },
  { id: "N-08", number: "08", zoneId: "north", zoneName: "North Campus", permit: "Student", baseState: "available" },
  { id: "N-09", number: "09", zoneId: "north", zoneName: "North Campus", permit: "EV", baseState: "available" },
  { id: "N-10", number: "10", zoneId: "north", zoneName: "North Campus", permit: "EV", baseState: "available" },
  { id: "L-01", number: "01", zoneId: "library", zoneName: "Library East", permit: "EV", baseState: "available" },
  { id: "L-02", number: "02", zoneId: "library", zoneName: "Library East", permit: "EV", baseState: "available" },
  { id: "L-03", number: "03", zoneId: "library", zoneName: "Library East", permit: "Staff", baseState: "restricted" },
  { id: "L-04", number: "04", zoneId: "library", zoneName: "Library East", permit: "EV", baseState: "available" },
  { id: "L-05", number: "05", zoneId: "library", zoneName: "Library East", permit: "Accessible", baseState: "restricted" },
  { id: "L-06", number: "06", zoneId: "library", zoneName: "Library East", permit: "EV", baseState: "available" },
  { id: "L-07", number: "07", zoneId: "library", zoneName: "Library East", permit: "EV", baseState: "available" },
  { id: "L-08", number: "08", zoneId: "library", zoneName: "Library East", permit: "EV", baseState: "available" },
]

export function createInitialStore(): DemoStore {
  return {
    simulatedTime: "09:55",
    externalBookings: [],
    reservations: [
      {
        id: "seed-expired",
        reference: "UD-2026-038",
        spaceId: "N-08",
        vehicleId: "vehicle-student",
        date: DEMO_DATE,
        startTime: "08:00",
        endTime: "09:00",
        status: "Expired",
        checkedInAt: null,
        createdAt: "2026-11-18T07:42:00",
      },
    ],
  }
}

export function toLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`)
}

export function getArrivalDeadline(date: string, startTime: string) {
  const deadline = toLocalDateTime(date, startTime)
  deadline.setMinutes(deadline.getMinutes() + ARRIVAL_WINDOW_MINUTES)
  return deadline
}

export function formatClock(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatTimeRange(startTime: string, endTime: string) {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`
}

export function formatTime(time: string) {
  return new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function hasTimeOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA
}

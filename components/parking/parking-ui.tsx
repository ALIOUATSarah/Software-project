"use client"

import { useRef, useState, type FormEvent, type ReactNode } from "react"
import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, CarFront, Check, CheckCircle2, CircleAlert,
  Clock3, Edit3, MapPin, ParkingCircle, Plus, RotateCcw, Search, ShieldCheck, Timer,
  Trash2, X,
} from "lucide-react"
import {
  DEMO_DATE, ROLE_LABELS, TIME_PRESETS, formatDate, formatTime, formatTimeRange,
  getArrivalDeadline, type Closure, type DemoStore, type DriverRole, type ParkingNotification,
  type ParkingSpace, type PermitCategory, type Reservation, type Role, type Vehicle, type Zone,
} from "./parking-data"
import { ParkingMap, type BayVisualState } from "./parking-map"

export type ScreenId = "search" | "confirm" | "reservations" | "vehicles" | "notifications" | "overview" | "bay-detail" | "closures" | "zones" | "permits" | "reports"
export type MapListMode = "map" | "list"

const roleDescriptions: Record<Role, string> = {
  student: "Find, book, and check in to campus parking.",
  visitor: "Book designated visitor parking with a demo permit.",
  officer: "Monitor bays, update occupancy, and manage closures.",
  admin: "Manage zones, spaces, permits, rules, and reports.",
}

export function RoleLanding({ spaces, zones, reservations, closures, simulatedTime, onChoose, controls, demoControlsOpen, onToggleControls }: {
  spaces: ParkingSpace[]
  zones: Zone[]
  reservations: Reservation[]
  closures: Closure[]
  simulatedTime: string
  onChoose: (role: Role) => void
  controls: ReactNode
  demoControlsOpen: boolean
  onToggleControls: () => void
}) {
  const currentTime = new Date(`${DEMO_DATE}T${simulatedTime}:00`)
  const mapStates = Object.fromEntries(spaces.map((space) => {
    if (closures.some((closure) => closure.spaceId === space.id && closure.date === DEMO_DATE && currentTime < new Date(`${closure.date}T${closure.endTime}:00`))) return [space.id, "closed"]
    if (reservations.some((reservation) => reservation.spaceId === space.id && reservation.status === "Checked In")) return [space.id, "occupied"]
    if (reservations.some((reservation) => reservation.spaceId === space.id && reservation.status === "Reserved")) return [space.id, "reserved"]
    return [space.id, space.status === "occupied" ? "occupied" : space.status === "restricted" ? "restricted" : "available"]
  })) as Record<string, BayVisualState>
  return (
    <div className="welcome-shell">
      <header className="welcome-topbar">
        <a className="brand-lockup" href="#welcome" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark"><ParkingCircle size={23} /></span>
          <span className="brand-copy"><strong>park<span>smart</span></strong><small>UNIVERSITY OF DUBAI</small></span>
        </a>
        <div className="welcome-actions"><span className="simulated-label"><span className="live-dot" /> Simulated campus data</span><button className={`controls-trigger ${demoControlsOpen ? "is-open" : ""}`} type="button" onClick={onToggleControls} aria-expanded={demoControlsOpen}><Clock3 size={16} /><span>Demo controls</span></button></div>
      </header>
      {demoControlsOpen && controls}
      <main className="welcome-content">
        <section className="welcome-hero">
          <div className="welcome-copy">
            <p className="page-kicker"><span className="kicker-dot" /> UNIVERSITY OF DUBAI <span>·</span> SMART CAMPUS PARKING</p>
            <h1>Make room for<br /><span>a better campus day.</span></h1>
            <p className="welcome-description">Choose your demo profile to explore parking from the driver, visitor, campus operations, or administrator perspective.</p>
            <div className="welcome-assurance"><ShieldCheck size={17} /><span>Shared demo data across every role</span><span className="assurance-divider" /><span>Reset any time</span></div>
          </div>
          <div className="welcome-map"><ParkingMap title="North Campus · overview" spaces={spaces.filter((space) => space.zoneId === (zones[0]?.id ?? "north"))} states={mapStates} interactive={false} caption="A closer look at the campus lot. Bay availability is simulated for this prototype." /></div>
        </section>
        <section className="role-picker-section" aria-labelledby="role-picker-title">
          <div className="role-section-heading"><div><p className="eyebrow">YOUR DEMO PROFILE</p><h2 id="role-picker-title">How will you use Parksmart?</h2></div><span>Choose a role to get started</span></div>
          <div className="role-grid">{(["student", "visitor", "officer", "admin"] as Role[]).map((role, index) => <RoleCard key={role} role={role} index={index + 1} onChoose={() => onChoose(role)} />)}</div>
        </section>
        <footer className="welcome-footer"><span>Parksmart <i>·</i> University of Dubai</span><span>All campus availability shown here is simulated.</span></footer>
      </main>
    </div>
  )
}

function RoleCard({ role, index, onChoose }: { role: Role; index: number; onChoose: () => void }) {
  const Icon = role === "student" ? CarFront : role === "visitor" ? MapPin : role === "officer" ? ShieldCheck : Edit3
  return (
    <button type="button" className={`role-card role-${role}`} onClick={onChoose}>
      <span className="role-card-top"><span className="role-icon"><Icon size={20} /></span><span className="role-index">0{index}</span></span>
      <strong>{ROLE_LABELS[role]}</strong><span className="role-description">{roleDescriptions[role]}</span>
      <span className="role-card-action">Open demo <ArrowRight size={16} /></span>
    </button>
  )
}

export function DemoControls({ time, arrivalWindowMinutes, onSelectTime, onReset, onSimulateConflict, conflictMessage }: {
  time: string
  arrivalWindowMinutes: number
  onSelectTime: (time: string) => void
  onReset: () => void
  onSimulateConflict: () => void
  conflictMessage: string
}) {
  const resetDialogRef = useRef<HTMLDialogElement>(null)

  return (
    <section className="demo-controls" id="demo-controls" aria-label="Shared demo controls">
      <div className="demo-controls-heading"><div className="demo-controls-icon"><Timer size={17} /></div><div><strong>Presenter controls</strong><span>Time, booking conflicts, and reset affect every demo role.</span></div><span className="demo-date">{formatDate(DEMO_DATE)}</span></div>
      <div className="demo-controls-bottom"><div className="preset-group" role="group" aria-label="Simulated time presets">{TIME_PRESETS.map((preset) => <button key={preset} className={`preset-button ${time === preset ? "active" : ""}`} type="button" onClick={() => onSelectTime(preset)} aria-pressed={time === preset}>{formatTime(preset)}</button>)}</div><button type="button" className="button button-race" onClick={onSimulateConflict}><CarFront size={15} /> Simulate booking conflict</button></div>
      <div className="demo-controls-footer"><p className="demo-hint">{formatTime("10:15")} is the inclusive {arrivalWindowMinutes}-minute arrival deadline; {formatTime("10:16")} expires a booking that started at {formatTime("10:00")}.</p><button className="reset-demo" type="button" onClick={() => { const dialog = resetDialogRef.current; if (dialog && !dialog.open) dialog.showModal() }}><RotateCcw size={14} /> Reset demo</button></div>
      {conflictMessage && <p className="demo-feedback" role="status">{conflictMessage}</p>}
      <dialog ref={resetDialogRef} className="reset-dialog" aria-labelledby="reset-demo-title" aria-describedby="reset-demo-description">
        <div className="reset-dialog-copy">
          <h2 id="reset-demo-title">Reset demo data?</h2>
          <p id="reset-demo-description">This clears changes across every demo role, including bookings, notifications, and closures, and restores the original campus data. This action cannot be undone.</p>
        </div>
        <div className="reset-dialog-actions">
          <button className="button button-secondary" type="button" onClick={() => resetDialogRef.current?.close()}>Cancel</button>
          <button className="button button-danger-ghost" type="button" onClick={() => { resetDialogRef.current?.close(); onReset() }}>Reset demo</button>
        </div>
      </dialog>
    </section>
  )
}

export function DriverSearch({ role, zoneId, setZoneId, zones, date, setDate, startTime, setStartTime, endTime, setEndTime, vehicles, vehicleId, setVehicleId, zoneSpaces, results, mapStates, selectedSpaceId, onSelectSpace, onContinue, mode, setMode, error, onSearch }: {
  role: DriverRole
  zoneId: string
  setZoneId: (value: string) => void
  zones: Zone[]
  date: string
  setDate: (value: string) => void
  startTime: string
  setStartTime: (value: string) => void
  endTime: string
  setEndTime: (value: string) => void
  vehicles: Vehicle[]
  vehicleId: string
  setVehicleId: (value: string) => void
  zoneSpaces: ParkingSpace[]
  results: ParkingSpace[]
  mapStates: Record<string, BayVisualState>
  selectedSpaceId: string | null
  onSelectSpace: (space: ParkingSpace) => void
  onContinue: () => void
  mode: MapListMode
  setMode: (value: MapListMode) => void
  error: string
  onSearch: () => void
}) {
  const vehicle = vehicles.find((item) => item.id === vehicleId) ?? vehicles[0]
  return (
    <>
      <PageHeading kicker={role === "visitor" ? "VISITOR PARKING" : "DRIVER PARKING"} title={role === "visitor" ? "Find visitor parking" : "Find a parking space"} description={role === "visitor" ? "Your demo visitor permit only shows bays set aside for campus guests." : "Choose a vehicle and time. Results match your active permit."} aside={<span className="heading-trust"><ShieldCheck size={17} /> Permit checked on every result</span>} />
      <section className="search-panel" aria-labelledby="search-form-title">
        <div className="panel-topline"><div><span className="step-number">01</span><h2 id="search-form-title">Your parking details</h2></div><span className="required-note"><span>*</span> Required fields</span></div>
        <div className="search-fields">
          <Field label="Vehicle"><select aria-label="Registered vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.plate}</option>)}</select></Field>
          <Field label="Parking zone"><select aria-label="Parking zone" value={zoneId} onChange={(event) => setZoneId(event.target.value)}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></Field>
          <Field label="Date"><input aria-label="Booking date" type="date" min={DEMO_DATE} value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          <Field label="Start time"><input aria-label="Start time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></Field>
          <Field label="End time"><input aria-label="End time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></Field>
          <button className="button button-primary search-submit" type="button" onClick={onSearch}><Search size={16} /> Find spaces</button>
        </div>
        <div className="vehicle-permit-line"><span className="permit-icon"><ShieldCheck size={15} /></span><span><strong>{vehicle?.name ?? "Select a vehicle"}</strong>{vehicle ? ` · plate ${vehicle.plate}` : ""}</span><div className="permit-pills">{vehicle?.permits.map((permit) => <span key={permit} className={`permit-pill permit-${permit.toLowerCase()}`}>{permit} permit</span>)}</div></div>
        {error && <div className="inline-alert alert-error" role="alert"><CircleAlert size={17} />{error}</div>}
      </section>
      <div className="results-heading"><div><div className="results-title-line"><h2>{role === "visitor" ? "Visitor-eligible spaces" : "Available spaces"}</h2><span className="result-count">{results.length}</span></div><p>{results.length ? `${results.length} eligible ${results.length === 1 ? "bay" : "bays"} for ${formatTimeRange(startTime, endTime)}` : "No bays match the current filters"}</p></div><div className="map-list-toggle" role="group" aria-label="Map or list view"><button className={mode === "map" ? "active" : ""} type="button" aria-pressed={mode === "map"} onClick={() => setMode("map")}><MapPin size={15} /> Map</button><button className={mode === "list" ? "active" : ""} type="button" aria-pressed={mode === "list"} onClick={() => setMode("list")}>List <ArrowRight size={14} /></button></div></div>
      <div className={`parking-layout view-${mode}`}>
        <div className="map-panel-wrap"><ParkingMap title={zones.find((zone) => zone.id === zoneId)?.name ?? "Campus parking"} spaces={zoneSpaces} states={mapStates} selectedSpaceId={selectedSpaceId} onSelect={onSelectSpace} availableOnly caption="Choose a green bay or select its matching row to review the booking." /></div>
        <section className="results-panel" aria-label="Eligible parking spaces">
          {results.length ? <div className="space-results">{results.map((space, index) => <button key={space.id} type="button" className={`space-result ${selectedSpaceId === space.id ? "selected" : ""}`} aria-pressed={selectedSpaceId === space.id} onClick={() => onSelectSpace(space)}><span className={`result-index ${selectedSpaceId === space.id ? "selected" : ""}`}>{selectedSpaceId === space.id ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span><span className="result-main"><strong>{space.id}</strong><span>{zones.find((zone) => zone.id === space.zoneId)?.name} <i>·</i> {space.permit} permit</span></span><span className="result-availability"><span className="availability-dot" /> Available<span className="result-time">{space.label}</span></span><ArrowRight className="result-chevron" size={16} /></button>)}</div> : <div className="empty-results"><div className="empty-icon"><ParkingCircle size={23} /></div><h3>No eligible spaces found</h3><p>{role === "visitor" ? "Visitor results never include student, staff, or restricted bays. Try another time or zone." : "Try another time or zone, or choose a vehicle with a matching permit."}</p><div className="empty-help"><ShieldCheck size={15} /> Only open spaces covered by your permit are shown.</div></div>}
          <div className="selection-footer"><div className="selection-summary">{selectedSpaceId && results.some((space) => space.id === selectedSpaceId) ? <><span className="selection-check"><Check size={13} /></span><span><strong>{selectedSpaceId}</strong> selected</span></> : <><span className="selection-empty-dot" /><span>Select a space to continue</span></>}</div><button className="button button-primary continue-button" type="button" disabled={!selectedSpaceId || !results.some((space) => space.id === selectedSpaceId)} onClick={onContinue}>Continue <ArrowRight size={16} /></button></div>
        </section>
      </div>
    </>
  )
}

export function ConfirmReservation({ space, vehicle, zoneName, date, startTime, endTime, arrivalWindowMinutes, error, onBack, onConfirm, onUpdatedResults }: {
  space?: ParkingSpace
  vehicle?: Vehicle
  zoneName: string
  date: string
  startTime: string
  endTime: string
  arrivalWindowMinutes: number
  error: string
  onBack: () => void
  onConfirm: () => void
  onUpdatedResults: () => void
}) {
  const deadline = space ? getArrivalDeadline(date, startTime, arrivalWindowMinutes) : null
  const deadlineText = deadline ? formatTime(`${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")}`) : "—"
  return (
    <>
      <PageHeading kicker="RESERVE PARKING SPACE" title="Review your reservation" description="Double-check the details before reserving your campus bay." aside={<button className="back-link" type="button" onClick={onBack}><ArrowLeft size={15} /> Back to search</button>} />
      {!space ? <EmptyState icon={<ParkingCircle size={23} />} title="No space selected" description="Choose an eligible bay from the parking map before continuing." action={<button className="button button-primary" type="button" onClick={onBack}>Return to search <ArrowRight size={16} /></button>} /> : (
        <div className="confirm-grid"><section className="confirm-card"><div className="confirm-card-heading"><div><span className="eyebrow">RESERVATION SUMMARY</span><h2>Ready to reserve?</h2></div><div className="confirmed-mark"><Check size={17} /></div></div><div className="reservation-bay-banner"><div className="bay-glyph"><ParkingCircle size={21} /></div><div><span>YOUR PARKING BAY</span><strong>{space.id}</strong></div><span className="available-tag"><span className="live-dot" /> Eligible</span></div><div className="confirm-detail-list"><DetailRow icon={<CarFront size={17} />} label="Vehicle" value={vehicle?.name ?? "Demo vehicle"} subvalue={`Plate ${vehicle?.plate ?? "—"}`} /><DetailRow icon={<MapPin size={17} />} label="Parking zone" value={zoneName} subvalue={`${space.permit} permit bay`} /><DetailRow icon={<CalendarDays size={17} />} label="Date" value={formatDate(date)} subvalue="Campus local time" /><DetailRow icon={<Clock3 size={17} />} label="Reserved period" value={formatTimeRange(startTime, endTime)} subvalue="No payment required in this demo" /></div><div className="arrival-window-note"><span className="arrival-clock"><Timer size={18} /></span><span><strong>Arrive by {deadlineText}</strong><small>Check-in opens at {formatTime(startTime)} · {arrivalWindowMinutes}-minute arrival window</small></span></div>{error && <div className="inline-alert alert-error confirm-error" role="alert"><CircleAlert size={17} />{error}</div>}{error.includes("No reservation was saved") && <button className="text-action update-results-action" type="button" onClick={onUpdatedResults}>See updated results <ArrowRight size={15} /></button>}<div className="confirm-actions"><button className="button button-secondary" type="button" onClick={onBack}><ArrowLeft size={15} /> Edit search</button><button className="button button-primary confirm-button" type="button" onClick={onConfirm}>Confirm reservation <Check size={16} /></button></div><div className="secure-note"><ShieldCheck size={14} /> Permit eligibility and availability are checked again on confirmation.</div></section><aside className="confirm-side-panel"><div className="side-panel-icon"><ShieldCheck size={21} /></div><h3>What happens next?</h3><p>Your reservation is held until the arrival deadline. Check in from My Reservations when you arrive on campus.</p><div className="arrival-timeline"><div className="timeline-line" /><div className="timeline-item"><span className="timeline-point active" /><span><strong>Reservation starts</strong><small>{formatTime(startTime)}</small></span></div><div className="timeline-item"><span className="timeline-point deadline" /><span><strong>Arrival deadline</strong><small>{deadlineText}</small></span></div></div></aside></div>
      )}
    </>
  )
}

export function ReservationsScreen({ reservations, spaces, zones, vehicles, simulatedTime, arrivalWindowMinutes, onCancel, onCheckIn, onDepart, feedback, onFindParking }: {
  reservations: Reservation[]
  spaces: ParkingSpace[]
  zones: Zone[]
  vehicles: Vehicle[]
  simulatedTime: string
  arrivalWindowMinutes: number
  onCancel: (reservation: Reservation) => void
  onCheckIn: (reservation: Reservation) => void
  onDepart: (reservation: Reservation) => void
  feedback: Record<string, { tone: "error" | "success"; text: string }>
  onFindParking: () => void
}) {
  const sorted = [...reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return <><PageHeading kicker="DRIVER ACCOUNT" title="My reservations" description="Your bookings, arrival windows, and check-in status." aside={<button className="button button-secondary new-booking-button" type="button" onClick={onFindParking}><MapPin size={15} /> Find parking</button>} /><div className="reservations-overview"><span className="overview-icon"><CalendarDays size={17} /></span><span><strong>{sorted.length} {sorted.length === 1 ? "reservation" : "reservations"}</strong><small>Simulated campus time: {formatTime(simulatedTime)} <span>·</span> arrival window {arrivalWindowMinutes} min</small></span><span className="overview-time"><Clock3 size={15} /> {formatTime(simulatedTime)}</span></div>{sorted.length ? <div className="reservation-list">{sorted.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} space={spaces.find((space) => space.id === reservation.spaceId)} zoneName={zones.find((zone) => zone.id === spaces.find((space) => space.id === reservation.spaceId)?.zoneId)?.name ?? "Campus parking"} vehicle={vehicles.find((item) => item.id === reservation.vehicleId)} arrivalWindowMinutes={arrivalWindowMinutes} feedback={feedback[reservation.id]} onCancel={() => onCancel(reservation)} onCheckIn={() => onCheckIn(reservation)} onDepart={() => onDepart(reservation)} />)}</div> : <EmptyState icon={<CalendarDays size={22} />} title="No reservations yet" description="Find a parking space and reserve a bay to see it here." action={<button className="button button-primary" type="button" onClick={onFindParking}>Find parking <ArrowRight size={16} /></button>} />}</>
}

function ReservationCard({ reservation, space, zoneName, vehicle, arrivalWindowMinutes, feedback, onCancel, onCheckIn, onDepart }: {
  reservation: Reservation
  space?: ParkingSpace
  zoneName: string
  vehicle?: Vehicle
  arrivalWindowMinutes: number
  feedback?: { tone: "error" | "success"; text: string }
  onCancel: () => void
  onCheckIn: () => void
  onDepart: () => void
}) {
  const deadline = getArrivalDeadline(reservation.date, reservation.startTime, arrivalWindowMinutes)
  const deadlineTime = `${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")}`
  return <article className={`reservation-card reservation-${reservation.status.toLowerCase().replaceAll(" ", "-")}`}><div className="reservation-card-top"><div className="reference-block"><span className="eyebrow">RESERVATION REFERENCE</span><strong>{reservation.reference}</strong></div><StatusBadge status={reservation.status} /></div><div className="reservation-card-body"><div className="reservation-space"><span className="reservation-space-icon"><ParkingCircle size={21} /></span><span><small>PARKING BAY</small><strong>{reservation.spaceId}</strong><span className="reservation-zone">{zoneName}</span></span></div><ReservationDetail icon={<CarFront size={15} />} label="Vehicle" value={vehicle?.name ?? "Vehicle removed"} subvalue={vehicle?.plate ?? "—"} /><ReservationDetail icon={<CalendarDays size={15} />} label="Booking period" value={formatTimeRange(reservation.startTime, reservation.endTime)} subvalue={formatDate(reservation.date)} /><ReservationDetail icon={<Timer size={15} />} label="Arrival deadline" value={formatTime(deadlineTime)} subvalue={reservation.checkedInAt ? `Arrived ${formatTime(reservation.checkedInAt.slice(11, 16))}` : `${arrivalWindowMinutes} min after start`} /></div>{reservation.status === "Reserved" && <div className="reservation-arrival-note"><Clock3 size={15} /><span>Check-in opens at <strong>{formatTime(reservation.startTime)}</strong> and closes at <strong>{formatTime(deadlineTime)}</strong>.</span></div>}{reservation.status === "Checked In" && <div className="reservation-checked-note"><CheckCircle2 size={15} /><span>Arrival recorded at {reservation.checkedInAt ? formatTime(reservation.checkedInAt.slice(11, 16)) : "—"}. Record departure when you leave.</span></div>}{reservation.status === "Expired" && <div className="reservation-expired-note"><CircleAlert size={15} /><span>Arrival window missed. This bay has been released.</span></div>}{reservation.status === "Cancelled" && <div className="reservation-expired-note"><X size={15} /><span>This reservation was cancelled. See Notifications for details.</span></div>}{reservation.status === "Departed" && <div className="reservation-checked-note"><CheckCircle2 size={15} /><span>Departure recorded. The parking session is complete.</span></div>}{feedback && <div className={`inline-alert checkin-feedback ${feedback.tone === "error" ? "alert-error" : "alert-success"}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.tone === "error" ? <CircleAlert size={16} /> : <CheckCircle2 size={16} />}{feedback.text}</div>}<div className="reservation-card-footer"><span className={`status-label status-text-${reservation.status.toLowerCase().replaceAll(" ", "-")}`}><span />{reservation.status}</span><div className="reservation-actions">{reservation.status === "Reserved" && <><button className="button button-danger-ghost" type="button" onClick={onCancel}>Cancel booking</button><button className="button button-primary record-arrival-button" type="button" onClick={onCheckIn}>Record arrival <ArrowRight size={15} /></button></>}{reservation.status === "Checked In" && <button className="button button-primary record-arrival-button" type="button" onClick={onDepart}>Record departure <ArrowRight size={15} /></button>}</div></div></article>
}

export function VehiclesScreen({ vehicles, permits, protectedVehicleIds, onSave, onDelete }: {
  vehicles: Vehicle[]
  permits: PermitCategory[]
  protectedVehicleIds: string[]
  onSave: (vehicle: Vehicle) => void
  onDelete: (vehicleId: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [plate, setPlate] = useState("")
  const [permit, setPermit] = useState("")
  const [error, setError] = useState("")
  const startEdit = (vehicle: Vehicle) => { setEditingId(vehicle.id); setName(vehicle.name); setPlate(vehicle.plate); setPermit(vehicle.permits[0] ?? "Student"); setError("") }
  const startAdd = () => { setEditingId("new"); setName(""); setPlate(""); setPermit(permits.find((item) => item.enabled)?.name ?? "Student"); setError("") }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !plate.trim()) { setError("Enter both a vehicle name and plate number."); return }
    const existing = vehicles.find((vehicle) => vehicle.id === editingId)
    onSave({ id: existing?.id ?? `vehicle-${Date.now()}`, ownerId: vehicles[0]?.ownerId ?? "student", name: name.trim(), plate: plate.trim().toUpperCase(), permits: [permit], color: existing?.color ?? "#8bb8f7" })
    setEditingId(null)
  }
  return <><PageHeading kicker="DRIVER ACCOUNT" title="Vehicles and permits" description="Manage the demo vehicles and the permit categories attached to each one." aside={<span className="heading-trust"><ShieldCheck size={17} /> Demo profile only</span>} /><div className="content-toolbar"><div><strong>{vehicles.length} registered {vehicles.length === 1 ? "vehicle" : "vehicles"}</strong><span>Permit eligibility is rechecked when you book.</span></div><button className="button button-primary" type="button" onClick={startAdd}><Plus size={16} /> Add demo vehicle</button></div>{editingId && <form className="edit-form" onSubmit={submit}><div className="form-title"><strong>{editingId === "new" ? "Register demo vehicle" : "Update vehicle details"}</strong><button className="icon-button" aria-label="Close vehicle editor" type="button" onClick={() => setEditingId(null)}><X size={17} /></button></div><div className="form-grid"><Field label="Vehicle name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Honda Civic" /></Field><Field label="Plate number"><input value={plate} onChange={(event) => setPlate(event.target.value)} placeholder="e.g. D 12345" /></Field><Field label="Permit category"><select value={permit} onChange={(event) => setPermit(event.target.value)}>{permits.filter((item) => item.enabled).map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></Field></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button className="button button-secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button><button className="button button-primary" type="submit">Save vehicle <Check size={15} /></button></div></form>}<div className="vehicle-grid">{vehicles.map((vehicle) => <article className="vehicle-card" key={vehicle.id}><div className="vehicle-card-top"><span className="vehicle-icon"><CarFront size={20} /></span><button className="icon-button" type="button" aria-label={`Edit ${vehicle.name}`} onClick={() => startEdit(vehicle)}><Edit3 size={16} /></button></div><h2>{vehicle.name}</h2><p className="vehicle-plate">{vehicle.plate}</p><div className="vehicle-permit-line"><ShieldCheck size={15} /><span>{vehicle.permits.join(", ")} permit{vehicle.permits.length === 1 ? "" : "s"}</span></div>{vehicle.id !== "vehicle-visitor" && <button className="text-action vehicle-delete" type="button" disabled={protectedVehicleIds.includes(vehicle.id)} title={protectedVehicleIds.includes(vehicle.id) ? "A current reservation is linked to this vehicle." : undefined} onClick={() => onDelete(vehicle.id)}><Trash2 size={14} />{protectedVehicleIds.includes(vehicle.id) ? " In active reservation" : " Remove vehicle"}</button>}</article>)}</div><div className="permit-explainer"><ShieldCheck size={17} /><span><strong>Permit categories</strong><small>{permits.filter((item) => item.enabled).map((item) => item.name).join(" · ") || "No active permit categories"}</small></span></div></>
}

export function NotificationsScreen({ notifications, reservations, onMarkRead, onOpenReservation, onMarkAllRead }: {
  notifications: ParkingNotification[]
  reservations: Reservation[]
  onMarkRead: (notificationId: string) => void
  onOpenReservation: (reservation: Reservation) => void
  onMarkAllRead: () => void
}) {
  const unreadCount = notifications.filter((item) => !item.read).length
  return <><PageHeading kicker="DRIVER ACCOUNT" title="Notifications" description="Booking confirmations, cancellations, and campus bay closure updates." aside={unreadCount > 0 ? <button className="text-action" type="button" onClick={onMarkAllRead}>Mark all read</button> : <span className="heading-trust"><CheckCircle2 size={17} /> You&apos;re all caught up</span>} />{notifications.length ? <div className="notification-list">{[...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => { const related = reservations.find((reservation) => reservation.id === item.reservationId); return <article className={`notification-card ${item.read ? "is-read" : "is-unread"}`} key={item.id}><span className={`notification-icon notification-${item.kind}`}>{item.kind === "booking" ? <CheckCircle2 size={18} /> : item.kind === "closure" ? <CircleAlert size={18} /> : item.kind === "cancellation" ? <X size={18} /> : <Bell size={18} />}</span><div className="notification-copy"><div className="notification-title"><strong>{item.title}</strong>{!item.read && <span className="unread-dot">New</span>}</div><p>{item.message}</p><small>{item.createdAt.replace("T", " · ").slice(0, 16)}</small></div><div className="notification-actions">{related && <button className="button button-secondary" type="button" onClick={() => onOpenReservation(related)}>Open booking <ArrowRight size={14} /></button>}{!item.read && <button className="icon-button" type="button" aria-label="Mark notification as read" onClick={() => onMarkRead(item.id)}><Check size={16} /></button>}</div></article> })}</div> : <EmptyState icon={<Bell size={22} />} title="No notifications yet" description="Booking confirmations and closure updates will appear here." />}</>
}

export function OfficerOverview({ zones, selectedZone, setSelectedZone, spaces, states, reservations, closures, onSelectSpace }: {
  zones: Zone[]
  selectedZone: string
  setSelectedZone: (value: string) => void
  spaces: ParkingSpace[]
  states: Record<string, BayVisualState>
  reservations: Reservation[]
  closures: Closure[]
  onSelectSpace: (space: ParkingSpace) => void
}) {
  const openCount = spaces.filter((space) => states[space.id] === "available").length
  const activeCount = spaces.filter((space) => states[space.id] === "occupied").length
  const reservedCount = spaces.filter((space) => states[space.id] === "reserved").length
  const closedCount = spaces.filter((space) => states[space.id] === "closed").length
  return <><PageHeading kicker="CAMPUS OPERATIONS" title="Occupancy overview" description="Monitor the live demo map and open a bay to review its current status." aside={<span className="simulated-label"><span className="live-dot" /> Simulated campus data</span>} /><div className="filter-bar"><Field label="Zone"><select aria-label="Filter by zone" value={selectedZone} onChange={(event) => setSelectedZone(event.target.value)}><option value="all">All zones</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></Field><span className="filter-note"><Clock3 size={15} /> Current demo time</span></div><div className="occupancy-summary"><Metric label="Available" value={openCount} tone="green" /><Metric label="Reserved" value={reservedCount} tone="amber" /><Metric label="Occupied" value={activeCount} tone="blue" /><Metric label="Closed" value={closedCount} tone="red" /></div><div className="officer-layout"><div className="map-panel-wrap"><ParkingMap title={selectedZone === "all" ? "All campus zones" : zones.find((zone) => zone.id === selectedZone)?.name ?? "Campus parking"} spaces={spaces} states={states} onSelect={onSelectSpace} caption="Select any bay to view its details and permitted actions." /></div><section className="bay-list-panel"><div className="panel-section-heading"><div><p className="eyebrow">BAY DIRECTORY</p><h2>{spaces.length} spaces</h2></div><span className="simulated-label compact-label">{reservations.filter((item) => item.status === "Reserved").length} upcoming bookings</span></div>{spaces.length ? <div className="bay-list">{spaces.map((space) => <button key={space.id} type="button" className="bay-list-row" onClick={() => onSelectSpace(space)}><span className={`bay-list-state state-${states[space.id] ?? "available"}`} aria-hidden="true" /><span className="bay-list-main"><strong>{space.id} <small>{space.label}</small></strong><span>{zones.find((zone) => zone.id === space.zoneId)?.name} · {space.permit}</span></span><StatusBadge status={mapStateToStatus(states[space.id] ?? "available")} /><ArrowRight size={15} /></button>)}</div> : <EmptyState icon={<ParkingCircle size={22} />} title="No spaces in this zone" description="Add a bay from the administrator profile." />}</section></div><div className="operations-note"><ShieldCheck size={16} /><span>Manual occupancy can only be changed when there is no active parking session.</span><span>{closures.length} scheduled {closures.length === 1 ? "closure" : "closures"}</span></div></>
}

export function BayDetails({ space, zone, state, reservations, closures, simulatedTime, onBack, onSetOccupied, onSetAvailable, onManageClosures }: {
  space?: ParkingSpace
  zone?: Zone
  state: BayVisualState
  reservations: Reservation[]
  closures: Closure[]
  simulatedTime: string
  onBack: () => void
  onSetOccupied: () => void
  onSetAvailable: () => void
  onManageClosures: () => void
}) {
  if (!space) return <EmptyState icon={<ParkingCircle size={22} />} title="Select a bay" description="Choose a bay from the occupancy map to inspect its status." action={<button className="button button-secondary" type="button" onClick={onBack}><ArrowLeft size={15} /> Back to overview</button>} />
  const relatedReservations = reservations.filter((reservation) => reservation.spaceId === space.id && ["Reserved", "Checked In"].includes(reservation.status))
  const relatedClosures = closures.filter((closure) => closure.spaceId === space.id)
  const activeSession = reservations.some((reservation) => reservation.spaceId === space.id && reservation.status === "Checked In")
  return <><PageHeading kicker="BAY DETAILS" title={space.id} description={`${zone?.name ?? "Campus zone"} · bay ${space.label}`} aside={<button className="back-link" type="button" onClick={onBack}><ArrowLeft size={15} /> Occupancy overview</button>} /><div className="bay-detail-grid"><section className="bay-detail-card"><div className="detail-state-head"><span className={`bay-list-state state-${state}`} /><div><p className="eyebrow">CURRENT DEMO STATUS</p><StatusBadge status={mapStateToStatus(state)} /></div><span className="detail-permit">{space.permit} permit</span></div><div className="bay-facts"><DetailRow icon={<MapPin size={17} />} label="Zone" value={zone?.name ?? "Campus parking"} subvalue={`Bay label ${space.label}`} /><DetailRow icon={<Clock3 size={17} />} label="Simulated time" value={formatTime(simulatedTime)} subvalue="Campus local time" /></div><div className="detail-subsection"><h2>Reservations and closures</h2>{relatedReservations.length ? relatedReservations.map((reservation) => <div className="period-row" key={reservation.id}><span className="period-icon"><CalendarDays size={15} /></span><span><strong>{reservation.reference} · {reservation.status}</strong><small>{formatDate(reservation.date)} · {formatTimeRange(reservation.startTime, reservation.endTime)}</small></span></div>) : <p className="muted-copy">No current or upcoming bookings.</p>}{relatedClosures.map((closure) => <div className="period-row period-closed" key={closure.id}><span className="period-icon"><CircleAlert size={15} /></span><span><strong>Closure · {closure.reason}</strong><small>{formatDate(closure.date)} · {formatTimeRange(closure.startTime, closure.endTime)}</small></span></div>)}</div></section><aside className="bay-actions-card"><p className="eyebrow">BAY ACTIONS</p><h2>Update this space</h2><p>Manual occupancy is available only when no parking session is active.</p>{activeSession ? <div className="inline-alert alert-success"><CheckCircle2 size={16} /> An active check-in is in progress. Manual status changes are disabled.</div> : <div className="bay-action-buttons"><button className="button button-primary" type="button" disabled={space.status === "occupied"} onClick={onSetOccupied}>Mark occupied</button><button className="button button-secondary" type="button" disabled={space.status !== "occupied"} onClick={onSetAvailable}>Mark available</button></div>}<button className="button button-secondary full-button" type="button" onClick={onManageClosures}><Clock3 size={15} /> Manage closures</button><div className="bay-action-note"><ShieldCheck size={15} /> Active parking sessions always take priority over scheduled closures.</div></aside></div></>
}

export function ManageClosures({ spaces, zones,   reservations,
  closures,
  arrivalWindowMinutes,
  simulatedTime,
  onSave, onRemove }: {
  spaces: ParkingSpace[]
  zones: Zone[]
  reservations: Reservation[]
  closures: Closure[]
  arrivalWindowMinutes: number
  simulatedTime: string
  onSave: (closure: Omit<Closure, "id" | "createdAt">) => void
  onRemove: (closureId: string) => void
}) {
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? "")
  const [startsAt, setStartsAt] = useState(`${DEMO_DATE}T10:00`)
  const [endsAt, setEndsAt] = useState(`${DEMO_DATE}T11:00`)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const startDate = startsAt.slice(0, 10)
  const startTime = startsAt.slice(11, 16)
  const endDate = endsAt.slice(0, 10)
  const endTime = endsAt.slice(11, 16)
  const preview = reservations.filter((reservation) => reservation.spaceId === spaceId && reservation.status === "Reserved" && `${reservation.date}T${reservation.startTime}` >= `${DEMO_DATE}T${simulatedTime}` && reservation.date === startDate && endDate === startDate && reservation.startTime < endTime && startTime < reservation.endTime)
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!spaceId || !reason.trim()) { setError("Choose a bay and add a closure reason."); return }
    if (!startsAt || !endsAt || startsAt >= endsAt) { setError("The closure end must be after its start."); return }
    if (startDate !== endDate) { setError("For this demo, choose a closure within a single campus date."); return }
    onSave({ spaceId, date: startDate, startTime, endTime, reason: reason.trim() })
    setReason("")
    setError("")
  }
  return <><PageHeading kicker="CAMPUS OPERATIONS" title="Manage closures" description="Schedule a bay closure and review any affected bookings before saving." aside={<span className="heading-trust"><ShieldCheck size={17} /> Active sessions continue</span>} /><div className="closure-layout"><form className="closure-form" onSubmit={save}><div className="panel-section-heading"><div><p className="eyebrow">NEW CLOSURE</p><h2>Block a parking bay</h2></div><span className="step-number">01</span></div><div className="closure-fields"><Field label="Parking bay"><select value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>{spaces.map((space) => <option key={space.id} value={space.id}>{space.id} · {zones.find((zone) => zone.id === space.zoneId)?.name}</option>)}</select></Field><Field label="Closure starts"><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></Field><Field label="Closure ends"><input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></Field><Field label="Reason"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Line marking maintenance" /></Field></div>{error && <div className="inline-alert alert-error" role="alert"><CircleAlert size={16} />{error}</div>}<div className={`affected-bookings ${preview.length ? "has-affected" : ""}`}><div><strong>{preview.length ? `${preview.length} upcoming ${preview.length === 1 ? "reservation" : "reservations"} affected` : "No upcoming reservations affected"}</strong><span>{preview.length ? "These bookings will be cancelled and their drivers notified." : "Active check-in sessions will continue during the closure."}</span></div>{preview.map((reservation) => <div className="affected-reservation" key={reservation.id}><span><strong>{reservation.reference}</strong> · {reservation.ownerId === "visitor" ? "Visitor" : "Student"}</span><small>{reservation.spaceId} · {formatTimeRange(reservation.startTime, reservation.endTime)}</small></div>)}</div><button className="button button-primary full-button" type="submit"><Check size={16} /> Schedule closure</button></form><section className="closure-list-panel"><div className="panel-section-heading"><div><p className="eyebrow">SCHEDULED</p><h2>{closures.length} {closures.length === 1 ? "closure" : "closures"}</h2></div></div>{closures.length ? <div className="closure-list">{[...closures].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).map((closure) => <article className="closure-row" key={closure.id}><span className="closure-icon"><CircleAlert size={17} /></span><div className="closure-copy"><strong>{closure.spaceId} <span>·</span> {closure.reason}</strong><small>{formatDate(closure.date)} · {formatTimeRange(closure.startTime, closure.endTime)}</small></div><button className="button button-danger-ghost" type="button" onClick={() => onRemove(closure.id)}>Remove</button></article>)}</div> : <EmptyState icon={<Clock3 size={22} />} title="No scheduled closures" description="New closures will appear here after they are saved." />}</section></div><p className="footnote"><Timer size={14} /> Arrival eligibility uses the shared {arrivalWindowMinutes}-minute arrival window.</p></>
}

export function AdminOverview({ metrics, zoneOccupancy, onNavigate }: {
  metrics: { total: number; available: number; reserved: number; occupied: number; closed: number; reservations: number; unread: number; permitAssignments: number }
  zoneOccupancy: Array<{ zone: Zone; total: number; occupied: number; reserved: number; closed: number }>
  onNavigate: (screen: ScreenId) => void
}) {
  const shortcuts: Array<{ label: string; description: string; screen: ScreenId; icon: ReactNode }> = [
    { label: "Zones and spaces", description: "Add bays and update permit requirements.", screen: "zones", icon: <MapPin size={18} /> },
    { label: "Permits and rules", description: "Manage categories and the arrival window.", screen: "permits", icon: <ShieldCheck size={18} /> },
    { label: "Reports", description: "Review reservations, check-ins, and changes.", screen: "reports", icon: <CalendarDays size={18} /> },
  ]
  return <><PageHeading kicker="ADMINISTRATION" title="Campus overview" description="Shared demo data, summarized across drivers, visitors, and campus operations." aside={<span className="simulated-label"><span className="live-dot" /> Simulated campus data</span>} /><div className="admin-metrics"><Metric label="Open bays" value={`${metrics.available} / ${metrics.total}`} tone="green" /><Metric label="Reserved now" value={metrics.reserved} tone="amber" /><Metric label="Active occupancy" value={metrics.occupied} tone="blue" /><Metric label="Scheduled closures" value={metrics.closed} tone="red" /></div><div className="admin-overview-grid"><section className="admin-panel"><div className="panel-section-heading"><div><p className="eyebrow">CAPACITY BY ZONE</p><h2>Where parking stands</h2></div></div><div className="occupancy-chart" role="img" aria-label="Occupancy by zone, based on simulated campus data">{zoneOccupancy.map(({ zone, total, occupied, reserved, closed }) => { const safeTotal = Math.max(total, 1); return <div className="chart-row" key={zone.id}><div className="chart-label"><strong>{zone.name}</strong><span>{occupied + reserved} of {total} bays in use or reserved</span></div><div className="bar-track"><span className="bar-segment bar-occupied" style={{ width: `${(occupied / safeTotal) * 100}%` }} /><span className="bar-segment bar-reserved" style={{ width: `${(reserved / safeTotal) * 100}%` }} /><span className="bar-segment bar-closed" style={{ width: `${(closed / safeTotal) * 100}%` }} /></div><span className="chart-total">{total}</span></div> })}{!zoneOccupancy.length && <p className="muted-copy">Add a zone and parking bays to see capacity.</p>}</div><div className="chart-legend"><span><i className="bar-occupied" /> Occupied</span><span><i className="bar-reserved" /> Reserved</span><span><i className="bar-closed" /> Closed</span></div></section><section className="admin-panel admin-snapshot"><div className="panel-section-heading"><div><p className="eyebrow">SHARED ACTIVITY</p><h2>Demo snapshot</h2></div></div><div className="snapshot-row"><span>Total reservations</span><strong>{metrics.reservations}</strong></div><div className="snapshot-row"><span>Unread driver notices</span><strong>{metrics.unread}</strong></div><div className="snapshot-row"><span>Active vehicle permits</span><strong>{metrics.permitAssignments}</strong></div><p className="snapshot-note"><ShieldCheck size={15} /> Changes made by any role are reflected here and in reports.</p></section></div><section className="admin-shortcuts"><div className="panel-section-heading"><div><p className="eyebrow">MANAGEMENT</p><h2>Administration tools</h2></div></div><div className="shortcut-grid">{shortcuts.map((item) => <button type="button" className="shortcut-card" key={item.screen} onClick={() => onNavigate(item.screen)}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.description}</small><ArrowRight size={16} /></button>)}</div></section></>
}

export function ZonesAndSpaces({ zones, spaces, permits, protectedSpaceIds, onAddZone, onRenameZone, onDeleteZone, onAddSpace, onUpdateSpace, onDeleteSpace }: {
  zones: Zone[]
  spaces: ParkingSpace[]
  permits: PermitCategory[]
  protectedSpaceIds: string[]
  onAddZone: (name: string) => void
  onRenameZone: (zoneId: string, name: string) => void
  onDeleteZone: (zoneId: string) => void
  onAddSpace: (zoneId: string, permit: string) => void
  onUpdateSpace: (spaceId: string, values: Partial<Pick<ParkingSpace, "label" | "permit" | "zoneId">>) => void
  onDeleteSpace: (spaceId: string) => void
}) {
  const [zoneName, setZoneName] = useState("")
  const [newSpaceZone, setNewSpaceZone] = useState(zones[0]?.id ?? "")
  const [newSpacePermit, setNewSpacePermit] = useState(permits.find((item) => item.enabled)?.name ?? "Student")
  const [message, setMessage] = useState("")
  const addZone = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!zoneName.trim()) return; onAddZone(zoneName.trim()); setZoneName(""); setMessage("Zone added to the shared campus map.") }
  const addSpace = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!newSpaceZone) return; onAddSpace(newSpaceZone, newSpacePermit); setMessage("Parking bay added to the shared campus map.") }
  return <><PageHeading kicker="ADMINISTRATION" title="Zones and spaces" description="Edit campus zones, bay labels, and the permit required for each space." aside={<span className="heading-trust"><MapPin size={17} /> Shared campus map</span>} /><div className="management-grid"><section className="admin-panel"><div className="panel-section-heading"><div><p className="eyebrow">CAMPUS ZONES</p><h2>{zones.length} {zones.length === 1 ? "zone" : "zones"}</h2></div></div><form className="inline-add-form" onSubmit={addZone}><Field label="New zone name"><input value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="e.g. South Campus" /></Field><button className="button button-primary" type="submit"><Plus size={15} /> Add zone</button></form><div className="zone-list">{zones.map((zone) => <div className="zone-row" key={zone.id}><label className="zone-edit"><MapPin size={15} /><input aria-label={`Zone name ${zone.name}`} value={zone.name} onChange={(event) => onRenameZone(zone.id, event.target.value)} /><span>{spaces.filter((space) => space.zoneId === zone.id).length} bays</span></label><button className="icon-button danger-icon" type="button" aria-label={`Delete ${zone.name}`} disabled={spaces.some((space) => space.zoneId === zone.id)} onClick={() => onDeleteZone(zone.id)} title="A zone can be removed only when it has no spaces"><Trash2 size={15} /></button></div>)}</div></section><section className="admin-panel"><div className="panel-section-heading"><div><p className="eyebrow">ADD SPACE</p><h2>Create a parking bay</h2></div></div><form className="add-space-form" onSubmit={addSpace}><Field label="Zone"><select value={newSpaceZone} onChange={(event) => setNewSpaceZone(event.target.value)}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></Field><Field label="Required permit"><select value={newSpacePermit} onChange={(event) => setNewSpacePermit(event.target.value)}>{permits.filter((item) => item.enabled).map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></Field><button className="button button-primary full-button" type="submit"><Plus size={15} /> Add bay</button></form></section></div>{message && <p className="success-note" role="status"><CheckCircle2 size={15} />{message}</p>}<section className="admin-panel spaces-table-panel"><div className="panel-section-heading"><div><p className="eyebrow">SPACE DIRECTORY</p><h2>{spaces.length} parking bays</h2></div><span className="simulated-label compact-label">Edits apply across roles</span></div>{spaces.length ? <div className="spaces-table-wrap"><table className="spaces-table"><thead><tr><th>Bay</th><th>Zone</th><th>Required permit</th><th>Base status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{spaces.map((space) => <tr key={space.id}><td><div className="table-bay"><ParkingCircle size={17} /><strong>{space.id}</strong><label className="sr-only" htmlFor={`label-${space.id}`}>Map label for {space.id}</label><input id={`label-${space.id}`} value={space.label} maxLength={4} onChange={(event) => onUpdateSpace(space.id, { label: event.target.value })} /></div></td><td><select aria-label={`Zone for ${space.id}`} value={space.zoneId} onChange={(event) => onUpdateSpace(space.id, { zoneId: event.target.value })}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></td><td><select aria-label={`Permit required for ${space.id}`} value={space.permit} onChange={(event) => onUpdateSpace(space.id, { permit: event.target.value })}>{permits.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></td><td><StatusBadge status={space.status === "occupied" ? "Occupied" : space.status === "restricted" ? "Restricted" : "Open"} /></td><td><button className="icon-button danger-icon" type="button" aria-label={`Remove bay ${space.id}`} disabled={protectedSpaceIds.includes(space.id)} title={protectedSpaceIds.includes(space.id) ? "A current reservation is linked to this bay." : undefined} onClick={() => onDeleteSpace(space.id)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div> : <EmptyState icon={<ParkingCircle size={22} />} title="No parking bays yet" description="Add a bay to begin building your campus map." />}</section></>
}

export function PermitsAndRules({ permits, arrivalWindowMinutes, onTogglePermit, onAddPermit, onRemovePermit, onSetArrivalWindow, spaces }: {
  permits: PermitCategory[]
  arrivalWindowMinutes: number
  onTogglePermit: (name: string) => void
  onAddPermit: (name: string) => void
  onRemovePermit: (name: string) => void
  onSetArrivalWindow: (value: number) => void
  spaces: ParkingSpace[]
}) {
  const [newPermit, setNewPermit] = useState("")
  const [message, setMessage] = useState("")
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!newPermit.trim()) return; onAddPermit(newPermit.trim()); setNewPermit(""); setMessage("Permit category added.") }
  return <><PageHeading kicker="ADMINISTRATION" title="Permits and rules" description="Manage demo permit categories and the arrival window applied to every reservation." aside={<span className="heading-trust"><ShieldCheck size={17} /> Eligibility is rechecked</span>} /><div className="rules-grid"><section className="admin-panel"><div className="panel-section-heading"><div><p className="eyebrow">PERMIT CATEGORIES</p><h2>Driver eligibility</h2></div><span className="result-count">{permits.filter((item) => item.enabled).length}</span></div><div className="permit-category-list">{permits.map((permit) => <div className={`permit-category-row ${permit.enabled ? "" : "is-disabled"}`} key={permit.name}><span className="permit-category-icon"><ShieldCheck size={17} /></span><span className="permit-category-copy"><strong>{permit.name}</strong><small>{spaces.filter((space) => space.permit === permit.name).length} bays require this permit</small></span><label className="switch-label"><input type="checkbox" checked={permit.enabled} onChange={() => onTogglePermit(permit.name)} aria-label={`${permit.enabled ? "Disable" : "Enable"} ${permit.name} permit`} /><span>{permit.enabled ? "Enabled" : "Disabled"}</span></label><button className="icon-button danger-icon" type="button" aria-label={`Remove ${permit.name} permit category`} disabled={spaces.some((space) => space.permit === permit.name)} onClick={() => onRemovePermit(permit.name)} title="Categories required by a bay cannot be removed"><Trash2 size={15} /></button></div>)}</div><form className="inline-add-form" onSubmit={submit}><Field label="New permit category"><input value={newPermit} onChange={(event) => setNewPermit(event.target.value)} placeholder="e.g. Faculty" /></Field><button className="button button-primary" type="submit"><Plus size={15} /> Add category</button></form>{message && <p className="success-note" role="status"><CheckCircle2 size={15} />{message}</p>}</section><section className="admin-panel rule-card"><div className="panel-section-heading"><div><p className="eyebrow">ARRIVAL POLICY</p><h2>Reservation check-in</h2></div><span className="rule-icon"><Timer size={18} /></span></div><p className="muted-copy">Drivers must check in after their booking starts and before the arrival deadline. Missed reservations are released automatically when the demo clock advances.</p><label className="field rule-input"><span className="field-label">Arrival window <i>*</i></span><span className="number-input"><input type="number" min={1} max={120} value={arrivalWindowMinutes} onChange={(event) => onSetArrivalWindow(Math.max(1, Math.min(120, Number(event.target.value) || 1)))} /><span>minutes</span></span></label><div className="rule-default-note"><CheckCircle2 size={15} /> Default policy: 15 minutes</div></section></div><p className="footnote"><ShieldCheck size={14} /> Changes affect future eligibility and shared booking behavior; existing reservations remain in place.</p></>
}

export function ReportsScreen({ reservations, zones, spaces }: { reservations: Reservation[]; zones: Zone[]; spaces: ParkingSpace[] }) {
  const [date, setDate] = useState(DEMO_DATE)
  const [zoneId, setZoneId] = useState("all")
  const matching = reservations.filter((reservation) => reservation.date === date && (zoneId === "all" || spaces.find((space) => space.id === reservation.spaceId)?.zoneId === zoneId))
  const counts = { reservations: matching.length, checkIns: matching.filter((item) => item.checkedInAt !== null).length, expiries: matching.filter((item) => item.status === "Expired").length, cancellations: matching.filter((item) => item.status === "Cancelled").length }
  return <><PageHeading kicker="ADMINISTRATION" title="Parking reports" description="Counts are calculated from the shared reservations that power the driver and officer views." aside={<span className="simulated-label"><span className="live-dot" /> Simulated campus data</span>} /><div className="report-filters"><Field label="Report date"><input type="date" min={DEMO_DATE} value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label="Zone"><select value={zoneId} onChange={(event) => setZoneId(event.target.value)}><option value="all">All zones</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></Field><span className="report-period"><CalendarDays size={16} /> {formatDate(date)}</span></div><div className="report-metrics"><Metric label="Reservations" value={counts.reservations} tone="green" /><Metric label="Check-ins" value={counts.checkIns} tone="blue" /><Metric label="Expired" value={counts.expiries} tone="amber" /><Metric label="Cancelled" value={counts.cancellations} tone="red" /></div><section className="admin-panel report-table-panel"><div className="panel-section-heading"><div><p className="eyebrow">MATCHING ACTIVITY</p><h2>{matching.length} reservations</h2></div><span className="simulated-label compact-label">{zoneId === "all" ? "All zones" : zones.find((zone) => zone.id === zoneId)?.name}</span></div>{matching.length ? <div className="spaces-table-wrap"><table className="spaces-table"><thead><tr><th>Reference</th><th>Bay</th><th>Driver</th><th>Booking period</th><th>Status</th></tr></thead><tbody>{matching.map((reservation) => <tr key={reservation.id}><td><strong>{reservation.reference}</strong></td><td>{reservation.spaceId}</td><td>{reservation.ownerId === "visitor" ? "Visitor" : "Student"}</td><td>{formatTimeRange(reservation.startTime, reservation.endTime)}</td><td><StatusBadge status={reservation.status} /></td></tr>)}</tbody></table></div> : <EmptyState icon={<CalendarDays size={22} />} title="No reservations for this filter" description="Try another date or zone. New and cancelled bookings appear here automatically." />}</section></>
}

export function PageHeading({ kicker, title, description, aside }: { kicker: string; title: string; description: string; aside?: ReactNode }) {
  return <div className="page-heading"><div><div className="page-kicker"><span className="kicker-dot" /> {kicker}</div><h1>{title}</h1><p>{description}</p></div>{aside && <div className="heading-aside">{aside}</div>}</div>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}<i>*</i></span><span className="field-control">{children}</span></label>
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{description}</p>{action && <div className="empty-action">{action}</div>}</div>
}

function DetailRow({ icon, label, value, subvalue }: { icon: ReactNode; label: string; value: string; subvalue: string }) {
  return <div className="detail-row"><span className="detail-icon">{icon}</span><span className="detail-copy"><small>{label}</small><strong>{value}</strong><span>{subvalue}</span></span></div>
}

function ReservationDetail({ icon, label, value, subvalue }: { icon: ReactNode; label: string; value: string; subvalue: string }) {
  return <div className="reservation-detail"><span>{icon} {label}</span><strong>{value}</strong><small>{subvalue}</small></div>
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: "green" | "amber" | "blue" | "red" }) {
  return <div className={`metric-card metric-${tone}`}><span className="metric-label">{label}</span><strong>{value}</strong><span className="metric-indicator"><i /> Shared demo data</span></div>
}

function StatusBadge({ status }: { status: string }) {
  const tone = status.toLowerCase().replaceAll(" ", "-")
  return <span className={`status-badge status-${tone}`}><span className="status-mark" aria-hidden="true" />{status}</span>
}

function mapStateToStatus(state: BayVisualState) {
  if (state === "selected") return "Available"
  if (state === "booked") return "Reserved"
  return state.charAt(0).toUpperCase() + state.slice(1)
}


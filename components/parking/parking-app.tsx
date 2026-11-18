"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  MapPin,
  ParkingCircle,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  X,
} from "lucide-react"
import { ParkingMap, type BayVisualState } from "./parking-map"
import {
  ARRIVAL_WINDOW_MINUTES,
  createInitialStore,
  DEMO_DATE,
  formatDate,
  formatTime,
  formatTimeRange,
  getArrivalDeadline,
  hasTimeOverlap,
  parkingSpaces,
  STORAGE_KEY,
  toLocalDateTime,
  vehicles,
  zones,
  type DemoStore,
  type ParkingSpace,
  type Reservation,
  type Vehicle,
} from "./parking-data"

type Screen = "search" | "confirm" | "reservations"
type MapListMode = "map" | "list"

const timePresets = ["09:55", "10:05", "10:15", "10:16"]

export function ParkingApp() {
  const [store, setStore] = useState<DemoStore>(() => createInitialStore())
  const [hydrated, setHydrated] = useState(false)
  const [screen, setScreen] = useState<Screen>("search")
  const [vehicleId, setVehicleId] = useState(vehicles[0].id)
  const [zoneId, setZoneId] = useState(zones[0].id)
  const [date, setDate] = useState(DEMO_DATE)
  const [startTime, setStartTime] = useState("10:00")
  const [endTime, setEndTime] = useState("11:00")
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [searchAttempted, setSearchAttempted] = useState(false)
  const [viewMode, setViewMode] = useState<MapListMode>("map")
  const [controlsOpen, setControlsOpen] = useState(false)
  const [confirmError, setConfirmError] = useState("")
  const [checkInFeedback, setCheckInFeedback] = useState<Record<string, { tone: "error" | "success"; text: string }>>({})

  const vehicle = vehicles.find((item) => item.id === vehicleId) ?? vehicles[0]
  const selectedSpace = parkingSpaces.find((space) => space.id === selectedSpaceId)
  const selectedZone = zones.find((zone) => zone.id === zoneId) ?? zones[0]
  const simulatedAt = toLocalDateTime(DEMO_DATE, store.simulatedTime)
  const currentReservations = store.reservations

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as DemoStore
        if (Array.isArray(parsed.reservations) && Array.isArray(parsed.externalBookings) && typeof parsed.simulatedTime === "string") {
          setStore(parsed)
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [hydrated, store])

  useEffect(() => {
    if (!hydrated) return
    setStore((current) => {
      let changed = false
      const reservations = current.reservations.map((reservation) => {
        if (reservation.status !== "Reserved") return reservation
        const deadline = getArrivalDeadline(reservation.date, reservation.startTime)
        const now = toLocalDateTime(DEMO_DATE, current.simulatedTime)
        if (now > deadline) {
          changed = true
          return { ...reservation, status: "Expired" as const }
        }
        return reservation
      })
      return changed ? { ...current, reservations } : current
    })
  }, [hydrated, store.simulatedTime])

  const validationError = useMemo(() => validateSearch(date, startTime, endTime, store.simulatedTime), [date, endTime, startTime, store.simulatedTime])
  const searchSpaces = useMemo(() => {
    if (validationError) return []
    return parkingSpaces.filter((space) => {
      if (space.zoneId !== zoneId || !vehicle.permits.includes(space.permit) || space.baseState !== "available") return false
      return !hasConflict(space.id, date, startTime, endTime, currentReservations, store.externalBookings)
    })
  }, [currentReservations, date, endTime, startTime, store.externalBookings, validationError, vehicle.permits, zoneId])

  const mapSpaces = parkingSpaces.filter((space) => space.zoneId === zoneId)
  const getMapState = (space: ParkingSpace): BayVisualState => {
    if (space.id === selectedSpaceId && searchSpaces.some((candidate) => candidate.id === space.id)) return "selected"
    if (space.baseState === "restricted" || !vehicle.permits.includes(space.permit)) return "restricted"
    if (space.baseState === "occupied" || hasConflict(space.id, date, startTime, endTime, currentReservations, store.externalBookings)) return "booked"
    return "available"
  }

  function setDemoTime(time: string) {
    setStore((current) => ({ ...current, simulatedTime: time }))
    setCheckInFeedback({})
  }

  function resetDemo() {
    setStore(createInitialStore())
    setVehicleId(vehicles[0].id)
    setZoneId(zones[0].id)
    setDate(DEMO_DATE)
    setStartTime("10:00")
    setEndTime("11:00")
    setSelectedSpaceId(null)
    setSearchAttempted(false)
    setConfirmError("")
    setCheckInFeedback({})
    setViewMode("map")
    setScreen("search")
  }

  function runSearch() {
    setSearchAttempted(true)
    if (!validationError && selectedSpaceId && !searchSpaces.some((space) => space.id === selectedSpaceId)) {
      setSelectedSpaceId(null)
    }
  }

  function continueToConfirmation() {
    if (!selectedSpace || !searchSpaces.some((space) => space.id === selectedSpace.id) || validationError) return
    setConfirmError("")
    setScreen("confirm")
  }

  function simulateOtherDriver() {
    if (!selectedSpace) return
    const startAt = `${date}T${startTime}`
    const endAt = `${date}T${endTime}`
    const alreadySimulated = store.externalBookings.some((booking) => booking.spaceId === selectedSpace.id && booking.startAt === startAt && booking.endAt === endAt)
    if (alreadySimulated) {
      setConfirmError("Another driver has already reserved this bay for the selected time. Confirm to see the availability check block this reservation.")
      return
    }
    setStore((current) => ({
      ...current,
      externalBookings: [...current.externalBookings, { id: `guest-${Date.now()}`, spaceId: selectedSpace.id, startAt, endAt }],
    }))
    setConfirmError("A second driver has just reserved this bay. Confirm now to see the final availability check catch the conflict.")
  }

  function confirmReservation() {
    if (!selectedSpace) return
    const currentVehicle = vehicles.find((item) => item.id === vehicleId)
    if (!currentVehicle?.permits.includes(selectedSpace.permit)) {
      setConfirmError(`This vehicle does not have a ${selectedSpace.permit} permit. Choose an eligible vehicle or return to search.`)
      return
    }
    if (selectedSpace.baseState !== "available" || hasConflict(selectedSpace.id, date, startTime, endTime, currentReservations, store.externalBookings)) {
      setConfirmError(`${selectedSpace.id} is no longer available for this time. No reservation was saved. Return to updated results to choose another bay.`)
      return
    }
    const nextNumber = String(38 + store.reservations.length).padStart(3, "0")
    const reservation: Reservation = {
      id: `reservation-${Date.now()}`,
      reference: `UD-2026-${nextNumber}`,
      spaceId: selectedSpace.id,
      vehicleId,
      date,
      startTime,
      endTime,
      status: "Reserved",
      checkedInAt: null,
      createdAt: new Date().toISOString(),
    }
    setStore((current) => ({ ...current, reservations: [reservation, ...current.reservations] }))
    setConfirmError("")
    setScreen("reservations")
  }

  function recordArrival(reservation: Reservation) {
    if (reservation.status === "Expired") {
      setCheckInFeedback((current) => ({ ...current, [reservation.id]: { tone: "error", text: "This reservation has expired. The bay has been released and is available for eligible drivers." } }))
      return
    }
    if (reservation.status === "Checked In") {
      setCheckInFeedback((current) => ({ ...current, [reservation.id]: { tone: "success", text: `Arrival was recorded at ${formatTime(reservation.checkedInAt?.slice(11, 16) ?? store.simulatedTime)}.` } }))
      return
    }
    const startAt = toLocalDateTime(reservation.date, reservation.startTime)
    const deadline = getArrivalDeadline(reservation.date, reservation.startTime)
    const now = toLocalDateTime(DEMO_DATE, store.simulatedTime)
    if (now < startAt) {
      setCheckInFeedback((current) => ({ ...current, [reservation.id]: { tone: "error", text: `Too early to check in. Check-in opens at ${formatTime(reservation.startTime)}.` } }))
      return
    }
    if (now > deadline) {
      setStore((current) => ({ ...current, reservations: current.reservations.map((item) => item.id === reservation.id ? { ...item, status: "Expired" } : item) }))
      setCheckInFeedback((current) => ({ ...current, [reservation.id]: { tone: "error", text: `Arrival deadline passed at ${formatTime(deadline.toTimeString().slice(0, 5))}. The reservation expired and the bay was released.` } }))
      return
    }
    const arrivalTime = `${DEMO_DATE}T${store.simulatedTime}:00`
    setStore((current) => ({ ...current, reservations: current.reservations.map((item) => item.id === reservation.id ? { ...item, status: "Checked In", checkedInAt: arrivalTime } : item) }))
    setCheckInFeedback((current) => ({ ...current, [reservation.id]: { tone: "success", text: `Arrival recorded at ${formatTime(store.simulatedTime)}. ${reservation.spaceId} is now marked occupied.` } }))
  }

  const reservationVehicle = (reservation: Reservation) => vehicles.find((item) => item.id === reservation.vehicleId) ?? vehicles[0]
  const reservationSpace = (reservation: Reservation) => parkingSpaces.find((space) => space.id === reservation.spaceId)

  return (
    <div className="parking-app">
      <aside className="app-sidebar">
        <a className="brand-lockup" href="#find" onClick={(event) => { event.preventDefault(); setScreen("search") }} aria-label="Smart Campus Parking home">
          <span className="brand-mark"><ParkingCircle size={23} strokeWidth={1.8} /></span>
          <span className="brand-copy"><strong>park<span>smart</span></strong><small>UNIVERSITY OF DUBAI</small></span>
        </a>
        <div className="sidebar-section-label">STUDENT SERVICES</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <NavButton active={screen === "search"} onClick={() => setScreen("search")} icon={<MapPin size={18} />} label="Find parking" detail="UC05 · Search" />
          <NavButton active={screen === "confirm"} onClick={() => setScreen("confirm")} icon={<ShieldCheck size={18} />} label="Confirm reservation" detail="UC06 · Reserve" />
          <NavButton active={screen === "reservations"} onClick={() => setScreen("reservations")} icon={<CarFront size={18} />} label="My reservations" detail="UC08 · Arrival" count={currentReservations.length} />
        </nav>
        <div className="sidebar-bottom">
          <div className="campus-status"><span className="live-dot" /><span><strong>Campus systems online</strong><small>Parking data synced just now</small></span></div>
          <div className="profile-mini"><span className="avatar">SA</span><span><strong>Sarah Ahmed</strong><small>Student · 20241058</small></span><ChevronDown size={15} /></div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><ParkingCircle size={21} /></span><strong>park<span>smart</span></strong></div>
          <div className="breadcrumb"><span>Campus mobility</span><span className="breadcrumb-slash">/</span><strong>{screen === "search" ? "Find parking" : screen === "confirm" ? "Confirm reservation" : "My reservations"}</strong></div>
          <div className="topbar-actions">
            <div className="clock-chip" aria-label={`Simulated time ${formatTime(store.simulatedTime)}`}><span className="clock-chip-dot" /><Clock3 size={15} /><span>DEMO CLOCK <strong>{formatTime(store.simulatedTime)}</strong></span></div>
            <button className={`controls-trigger ${controlsOpen ? "is-open" : ""}`} type="button" aria-expanded={controlsOpen} aria-controls="demo-controls" onClick={() => setControlsOpen((open) => !open)}>
              <SlidersHorizontal size={16} /><span>Demo controls</span><ChevronDown size={14} />
            </button>
          </div>
        </header>

        {controlsOpen && <DemoControls time={store.simulatedTime} onSelectTime={setDemoTime} onReset={resetDemo} />}

        <div className="mobile-nav" aria-label="Parking pages">
          <NavButton compact active={screen === "search"} onClick={() => setScreen("search")} icon={<MapPin size={16} />} label="Find" />
          <NavButton compact active={screen === "confirm"} onClick={() => setScreen("confirm")} icon={<ShieldCheck size={16} />} label="Reserve" />
          <NavButton compact active={screen === "reservations"} onClick={() => setScreen("reservations")} icon={<CarFront size={16} />} label="My bookings" />
        </div>

        <main className="page-content">
          {screen === "search" && (
            <SearchScreen
              vehicle={vehicle}
              vehicleId={vehicleId}
              zoneId={zoneId}
              date={date}
              startTime={startTime}
              endTime={endTime}
              selectedSpaceId={selectedSpaceId}
              searchSpaces={searchSpaces}
              mapSpaces={mapSpaces}
              getMapState={getMapState}
              viewMode={viewMode}
              setViewMode={setViewMode}
              validationError={searchAttempted ? validationError : ""}
              selectedZoneName={selectedZone.name}
              onVehicleChange={(value) => { setVehicleId(value); setSelectedSpaceId(null) }}
              onZoneChange={(value) => { setZoneId(value); setSelectedSpaceId(null) }}
              onDateChange={(value) => { setDate(value); setSelectedSpaceId(null) }}
              onStartChange={(value) => { setStartTime(value); setSelectedSpaceId(null) }}
              onEndChange={(value) => { setEndTime(value); setSelectedSpaceId(null) }}
              onSearch={runSearch}
              onSelectSpace={(space) => setSelectedSpaceId(space.id)}
              onContinue={continueToConfirmation}
              canContinue={!!selectedSpace && searchSpaces.some((space) => space.id === selectedSpace.id)}
            />
          )}
          {screen === "confirm" && (
            <ConfirmScreen
              vehicle={vehicle}
              space={selectedSpace}
              date={date}
              startTime={startTime}
              endTime={endTime}
              arrivalDeadline={selectedSpace ? getArrivalDeadline(date, startTime) : null}
              error={confirmError}
              onBack={() => { setScreen("search"); setConfirmError("") }}
              onConfirm={confirmReservation}
              onSimulateOther={simulateOtherDriver}
              onUpdatedResults={() => { setScreen("search"); setConfirmError(""); setSearchAttempted(true) }}
            />
          )}
          {screen === "reservations" && (
            <ReservationsScreen
              reservations={currentReservations}
              vehicleFor={reservationVehicle}
              spaceFor={reservationSpace}
              simulatedTime={store.simulatedTime}
              feedback={checkInFeedback}
              onRecordArrival={recordArrival}
              onFindParking={() => setScreen("search")}
            />
          )}
        </main>
        <footer className="app-footer"><span>Smart Campus Parking</span><span>SOFTWARE ENGINEERING PROJECT <i>·</i> UNIVERSITY OF DUBAI</span></footer>
      </div>
    </div>
  )
}

function SearchScreen(props: {
  vehicle: Vehicle
  vehicleId: string
  zoneId: string
  date: string
  startTime: string
  endTime: string
  selectedSpaceId: string | null
  searchSpaces: ParkingSpace[]
  mapSpaces: ParkingSpace[]
  getMapState: (space: ParkingSpace) => BayVisualState
  viewMode: MapListMode
  setViewMode: (mode: MapListMode) => void
  validationError: string
  selectedZoneName: string
  onVehicleChange: (value: string) => void
  onZoneChange: (value: string) => void
  onDateChange: (value: string) => void
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onSearch: () => void
  onSelectSpace: (space: ParkingSpace) => void
  onContinue: () => void
  canContinue: boolean
}) {
  return (
    <>
      <div className="page-heading">
        <div><div className="page-kicker"><span className="kicker-dot" /> UC05 <span>·</span> SEARCH ELIGIBLE SPACE</div><h1>Find a parking space</h1><p>Choose your vehicle and time. We&apos;ll show spaces covered by your permit.</p></div>
        <div className="heading-side-note"><ShieldCheck size={17} /><span>Permit verified<br /><strong>for every result</strong></span></div>
      </div>

      <section className="search-panel" aria-labelledby="search-form-title">
        <div className="panel-topline"><div><span className="step-number">01</span><h2 id="search-form-title">Your parking details</h2></div><span className="required-note"><span>*</span> Required fields</span></div>
        <div className="search-fields">
          <Field label="Registered vehicle" icon={<CarFront size={15} />}>
            <select id="vehicle" value={props.vehicleId} onChange={(event) => props.onVehicleChange(event.target.value)}>
              {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name} · {vehicle.plate}</option>)}
            </select>
          </Field>
          <Field label="Parking zone" icon={<MapPin size={15} />}>
            <select id="zone" value={props.zoneId} onChange={(event) => props.onZoneChange(event.target.value)}>
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </select>
          </Field>
          <Field label="Date" icon={<CalendarDays size={15} />}>
            <input id="booking-date" type="date" min={DEMO_DATE} value={props.date} onChange={(event) => props.onDateChange(event.target.value)} />
          </Field>
          <Field label="Start time" icon={<Clock3 size={15} />}>
            <input id="start-time" type="time" value={props.startTime} onChange={(event) => props.onStartChange(event.target.value)} />
          </Field>
          <Field label="End time" icon={<Clock3 size={15} />}>
            <input id="end-time" type="time" value={props.endTime} onChange={(event) => props.onEndChange(event.target.value)} />
          </Field>
          <button className="button button-primary search-submit" type="button" onClick={props.onSearch}><ArrowRight size={17} /> Find spaces</button>
        </div>
        <div className="vehicle-permit-line"><span className="permit-icon"><ShieldCheck size={14} /></span><span><strong>{props.vehicle.name}</strong> · plate {props.vehicle.plate}</span><div className="permit-pills">{props.vehicle.permits.map((permit) => <span key={permit} className={`permit-pill permit-${permit.toLowerCase()}`}>{permit} permit</span>)}</div></div>
        {props.validationError && <div className="inline-alert alert-error" role="alert"><CircleAlert size={17} /><span>{props.validationError}</span></div>}
      </section>

      <div className="results-heading">
        <div><div className="results-title-line"><h2>Available spaces</h2><span className="result-count">{props.searchSpaces.length}</span></div><p>{props.searchSpaces.length ? `${props.searchSpaces.length} spaces match your permit and selected time` : "Spaces for your selected vehicle and time"}</p></div>
        <div className="map-list-toggle" role="group" aria-label="Map or list view">
          <button className={props.viewMode === "map" ? "active" : ""} type="button" onClick={() => props.setViewMode("map")} aria-pressed={props.viewMode === "map"}><MapPin size={15} /> Map</button>
          <button className={props.viewMode === "list" ? "active" : ""} type="button" onClick={() => props.setViewMode("list")} aria-pressed={props.viewMode === "list"}>List <ArrowDownUp size={14} /></button>
        </div>
      </div>

      <div className={`parking-layout view-${props.viewMode}`}>
        <div className="map-panel-wrap"><ParkingMap title={props.selectedZoneName} spaces={props.mapSpaces} selectedSpaceId={props.selectedSpaceId} getState={props.getMapState} onSelect={props.onSelectSpace} /><p className="mobile-map-note">Swipe or scroll the lot map to see all bays.</p></div>
        <section className="results-panel" aria-label="Eligible parking spaces">
          {props.searchSpaces.length ? (
            <div className="space-results">
              {props.searchSpaces.map((space, index) => (
                <SpaceResult key={space.id} space={space} selected={props.selectedSpaceId === space.id} onClick={() => props.onSelectSpace(space)} index={index + 1} period={formatTimeRange(props.startTime, props.endTime)} />
              ))}
            </div>
          ) : (
            <div className="empty-results"><div className="empty-icon"><ParkingCircle size={22} /></div><h3>No eligible spaces found</h3><p>Try another zone or time, or choose a vehicle with a matching parking permit.</p><div className="empty-help"><ShieldCheck size={15} /> Only available spaces covered by your permit are shown.</div></div>
          )}
          <div className="selection-footer">
            <div className="selection-summary">{props.selectedSpaceId && props.searchSpaces.some((space) => space.id === props.selectedSpaceId) ? <><span className="selection-check"><Check size={13} /></span><span><strong>{props.selectedSpaceId}</strong> selected<span className="summary-muted"> · {props.selectedZoneName}</span></span></> : <><span className="selection-empty-dot" /><span>Select a space to continue</span></>}</div>
            <button className="button button-primary continue-button" type="button" disabled={!props.canContinue} onClick={props.onContinue}>Continue <ArrowRight size={16} /></button>
          </div>
        </section>
      </div>
    </>
  )
}

function ConfirmScreen(props: {
  vehicle: Vehicle
  space?: ParkingSpace
  date: string
  startTime: string
  endTime: string
  arrivalDeadline: Date | null
  error: string
  onBack: () => void
  onConfirm: () => void
  onSimulateOther: () => void
  onUpdatedResults: () => void
}) {
  const [showDemoActions, setShowDemoActions] = useState(false)
  return (
    <>
      <div className="page-heading">
        <div><div className="page-kicker"><span className="kicker-dot" /> UC06 <span>·</span> RESERVE PARKING SPACE</div><h1>Review your reservation</h1><p>Double-check the details before reserving your campus bay.</p></div>
        <button className="back-link" type="button" onClick={props.onBack}><ArrowLeft size={15} /> Back to search</button>
      </div>

      {!props.space ? (
        <div className="empty-confirm"><div className="empty-icon"><ParkingCircle size={23} /></div><h2>No space selected</h2><p>Choose an eligible bay from the parking map before continuing.</p><button className="button button-primary" type="button" onClick={props.onBack}>Return to search <ArrowRight size={16} /></button></div>
      ) : (
        <div className="confirm-grid">
          <section className="confirm-card">
            <div className="confirm-card-heading"><div><span className="eyebrow">RESERVATION SUMMARY</span><h2>Ready to reserve?</h2></div><div className="confirmed-mark"><Check size={17} /></div></div>
            <div className="reservation-bay-banner"><div className="bay-glyph"><ParkingCircle size={21} /></div><div><span>YOUR PARKING BAY</span><strong>{props.space.id}</strong></div><span className="available-tag"><span className="live-dot" /> Available</span></div>
            <div className="confirm-detail-list">
              <DetailRow icon={<CarFront size={17} />} label="Vehicle" value={props.vehicle.name} subvalue={`Plate ${props.vehicle.plate}`} />
              <DetailRow icon={<MapPin size={17} />} label="Parking zone" value={props.space.zoneName} subvalue={`${props.space.permit} permit space`} />
              <DetailRow icon={<CalendarDays size={17} />} label="Date" value={formatDate(props.date)} subvalue="Campus local time" />
              <DetailRow icon={<Clock3 size={17} />} label="Reserved period" value={formatTimeRange(props.startTime, props.endTime)} subvalue={`${(new Date(`2000-01-01T${props.endTime}:00`).getTime() - new Date(`2000-01-01T${props.startTime}:00`).getTime()) / 3600000} hour session`} />
            </div>
            <div className="arrival-window-note"><span className="arrival-clock"><Timer size={18} /></span><span><strong>Arrive by {props.arrivalDeadline ? formatTime(props.arrivalDeadline.toTimeString().slice(0, 5)) : "—"}</strong><small>Check-in opens at {formatTime(props.startTime)} · {ARRIVAL_WINDOW_MINUTES}-minute arrival window</small></span></div>
            {props.error && <div className="inline-alert alert-error confirm-error" role="alert"><CircleAlert size={17} /><span>{props.error}</span></div>}
            {props.error.includes("No reservation was saved") && <button className="text-action update-results-action" type="button" onClick={props.onUpdatedResults}>See updated results <ArrowRight size={15} /></button>}
            <div className="confirm-actions"><button className="button button-secondary" type="button" onClick={props.onBack}><ArrowLeft size={15} /> Edit search</button><button className="button button-primary confirm-button" type="button" onClick={props.onConfirm}>Confirm reservation <Check size={16} /></button></div>
            <div className="secure-note"><ShieldCheck size={14} /> Your permit and bay availability will be checked again when you confirm.</div>
          </section>
          <aside className="confirm-side-panel">
            <div className="side-panel-icon"><ShieldCheck size={21} /></div><h3>What happens next?</h3><p>Your reservation is held for you until the arrival deadline. Record your arrival in My Reservations once you reach campus.</p>
            <div className="arrival-timeline"><div className="timeline-line" /><div className="timeline-item"><span className="timeline-point active" /><span><strong>Reservation starts</strong><small>{formatTime(props.startTime)}</small></span></div><div className="timeline-item"><span className="timeline-point deadline" /><span><strong>Arrival deadline</strong><small>{props.arrivalDeadline ? formatTime(props.arrivalDeadline.toTimeString().slice(0, 5)) : "—"}</small></span></div></div>
            <button className="demo-challenge-trigger" type="button" aria-expanded={showDemoActions} onClick={() => setShowDemoActions((value) => !value)}><span>Demo: availability race</span><ChevronDown size={15} /></button>
            {showDemoActions && <div className="demo-challenge"><p>Simulate another driver taking this bay after your search. Your next confirmation should be blocked.</p><button type="button" className="button button-race" onClick={props.onSimulateOther}><CarFront size={15} /> Simulate another driver</button></div>}
          </aside>
        </div>
      )}
    </>
  )
}

function ReservationsScreen(props: {
  reservations: Reservation[]
  vehicleFor: (reservation: Reservation) => Vehicle
  spaceFor: (reservation: Reservation) => ParkingSpace | undefined
  simulatedTime: string
  feedback: Record<string, { tone: "error" | "success"; text: string }>
  onRecordArrival: (reservation: Reservation) => void
  onFindParking: () => void
}) {
  const sorted = [...props.reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <>
      <div className="page-heading">
        <div><div className="page-kicker"><span className="kicker-dot" /> UC08 <span>·</span> RECORD ARRIVAL</div><h1>My reservations</h1><p>Your parking bookings, arrival window, and check-in status.</p></div>
        <button className="button button-secondary new-booking-button" type="button" onClick={props.onFindParking}><MapPin size={15} /> Find parking</button>
      </div>
      <div className="reservations-overview"><span className="overview-icon"><CalendarDays size={17} /></span><span><strong>{sorted.length} {sorted.length === 1 ? "reservation" : "reservations"}</strong><small>Simulated campus time: {formatTime(props.simulatedTime)} <span>·</span> arrival window {ARRIVAL_WINDOW_MINUTES} min</small></span><span className="overview-time"><Clock3 size={15} /> {formatTime(props.simulatedTime)}</span></div>
      {sorted.length ? <div className="reservation-list">{sorted.map((reservation) => {
        const vehicle = props.vehicleFor(reservation)
        const space = props.spaceFor(reservation)
        const feedback = props.feedback[reservation.id]
        const deadline = getArrivalDeadline(reservation.date, reservation.startTime)
        const canRecord = reservation.status !== "Expired"
        return (
          <article className={`reservation-card reservation-${reservation.status.toLowerCase().replace(" ", "-")}`} key={reservation.id}>
            <div className="reservation-card-top"><div className="reference-block"><span className="eyebrow">RESERVATION REFERENCE</span><strong>{reservation.reference}</strong></div><StatusBadge status={reservation.status} /></div>
            <div className="reservation-card-body">
              <div className="reservation-space"><span className="reservation-space-icon"><ParkingCircle size={21} /></span><span><small>PARKING BAY</small><strong>{reservation.spaceId}</strong><span className="reservation-zone">{space?.zoneName ?? "Campus parking"}</span></span></div>
              <div className="reservation-detail"><span><CarFront size={15} /> Vehicle</span><strong>{vehicle.name}</strong><small>{vehicle.plate}</small></div>
              <div className="reservation-detail"><span><CalendarDays size={15} /> Booking period</span><strong>{formatTimeRange(reservation.startTime, reservation.endTime)}</strong><small>{formatDate(reservation.date)}</small></div>
              <div className="reservation-detail"><span><Timer size={15} /> Arrival deadline</span><strong>{formatTime(deadline.toTimeString().slice(0, 5))}</strong><small>{reservation.status === "Checked In" && reservation.checkedInAt ? `Arrived ${formatTime(reservation.checkedInAt.slice(11, 16))}` : "15 min after start"}</small></div>
            </div>
            {reservation.status === "Reserved" && <div className="reservation-arrival-note"><Clock3 size={15} /><span>Check-in is available from <strong>{formatTime(reservation.startTime)}</strong> until <strong>{formatTime(deadline.toTimeString().slice(0, 5))}</strong>.</span></div>}
            {reservation.status === "Checked In" && <div className="reservation-checked-note"><CheckCircle2 size={15} /><span>Arrival recorded at {reservation.checkedInAt ? formatTime(reservation.checkedInAt.slice(11, 16)) : "—"}. Bay is occupied.</span></div>}
            {reservation.status === "Expired" && <div className="reservation-expired-note"><CircleAlert size={15} /><span>Arrival window missed. This bay is released and available to eligible drivers.</span></div>}
            {feedback && <div className={`inline-alert checkin-feedback ${feedback.tone === "error" ? "alert-error" : "alert-success"}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.tone === "error" ? <CircleAlert size={16} /> : <CheckCircle2 size={16} />}<span>{feedback.text}</span></div>}
            <div className="reservation-card-footer"><span className={`status-label status-text-${reservation.status.toLowerCase().replace(" ", "-")}`}><span />{reservation.status}</span><button className={`button ${reservation.status === "Checked In" ? "button-secondary" : "button-primary"} record-arrival-button`} type="button" onClick={() => props.onRecordArrival(reservation)} disabled={reservation.status === "Expired" || reservation.status === "Checked In"}>{reservation.status === "Checked In" ? <><CheckCircle2 size={15} /> Arrival recorded</> : reservation.status === "Expired" ? <><X size={15} /> Arrival window closed</> : <>Record arrival <ArrowRight size={15} /></>}</button></div>
          </article>
        )
      })}</div> : <div className="empty-reservations"><div className="empty-icon"><CalendarDays size={22} /></div><h2>No reservations yet</h2><p>Find a parking space and reserve a bay to see it here.</p><button className="button button-primary" type="button" onClick={props.onFindParking}>Find parking <ArrowRight size={16} /></button></div>}
    </>
  )
}

function DemoControls({ time, onSelectTime, onReset }: { time: string; onSelectTime: (time: string) => void; onReset: () => void }) {
  return (
    <section className="demo-controls" id="demo-controls" aria-label="Demo controls">
      <div className="demo-controls-heading"><div className="demo-controls-icon"><Timer size={17} /></div><div><strong>Presenter controls</strong><span>Adjust the shared campus clock to test arrival scenarios.</span></div><span className="demo-date">{formatDate(DEMO_DATE)}</span></div>
      <div className="demo-controls-bottom"><div className="preset-group" role="group" aria-label="Simulated time presets">{timePresets.map((preset) => <button key={preset} className={`preset-button ${time === preset ? "active" : ""}`} type="button" onClick={() => onSelectTime(preset)} aria-pressed={time === preset}>{formatTime(preset)}</button>)}</div><button className="reset-demo" type="button" onClick={onReset}><RotateCcw size={14} /> Reset demo</button></div>
      <p className="demo-hint">10:15 is the inclusive arrival deadline · 10:16 expires the reservation.</p>
    </section>
  )
}

function NavButton({ active, onClick, icon, label, detail, count, compact }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; detail?: string; count?: number; compact?: boolean }) {
  return <button type="button" className={`nav-item ${active ? "active" : ""} ${compact ? "nav-item-compact" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}><span className="nav-icon">{icon}</span><span className="nav-label">{label}{detail && <small>{detail}</small>}</span>{typeof count === "number" && !compact && <span className="nav-count">{count}</span>}</button>
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="field"><span className="field-label">{label}<i>*</i></span><span className="field-control"><span className="field-icon" aria-hidden="true">{icon}</span>{children}</span></label>
}

function SpaceResult({ space, selected, onClick, index, period }: { space: ParkingSpace; selected: boolean; onClick: () => void; index: number; period: string }) {
  return (
    <button type="button" className={`space-result ${selected ? "selected" : ""}`} aria-pressed={selected} onClick={onClick}>
      <span className={`result-index ${selected ? "selected" : ""}`}>{selected ? <Check size={15} /> : String(index).padStart(2, "0")}</span>
      <span className="result-main"><strong>{space.id}</strong><span>{space.zoneName} <i>·</i> {space.permit} permit</span></span>
      <span className="result-availability"><span className="availability-dot" /> Available<span className="result-time">{period}</span></span>
      <ArrowRight className="result-chevron" size={16} />
    </button>
  )
}

function DetailRow({ icon, label, value, subvalue }: { icon: React.ReactNode; label: string; value: string; subvalue: string }) {
  return <div className="detail-row"><span className="detail-icon">{icon}</span><span className="detail-copy"><small>{label}</small><strong>{value}</strong><span>{subvalue}</span></span></div>
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  const icon = status === "Reserved" ? <Clock3 size={13} /> : status === "Checked In" ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />
  return <span className={`status-badge status-${status.toLowerCase().replace(" ", "-")}`}>{icon}{status}</span>
}

function validateSearch(date: string, startTime: string, endTime: string, simulatedTime: string) {
  if (!date || !startTime || !endTime) return "Complete the date, start time, and end time to search."
  const start = toLocalDateTime(date, startTime)
  const end = toLocalDateTime(date, endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Enter a valid date and time."
  if (date < DEMO_DATE) return "Choose today or a future date for your reservation."
  if (end <= start) return "End time must be later than the start time."
  if (date === DEMO_DATE && start < toLocalDateTime(DEMO_DATE, simulatedTime)) return "Start time has passed on the demo clock. Choose a later time or adjust the demo clock."
  return ""
}

function hasConflict(spaceId: string, date: string, startTime: string, endTime: string, reservations: Reservation[], externalBookings: DemoStore["externalBookings"]) {
  const start = toLocalDateTime(date, startTime)
  const end = toLocalDateTime(date, endTime)
  const activeReservationConflict = reservations.some((reservation) => {
    if (reservation.spaceId !== spaceId || (reservation.status !== "Reserved" && reservation.status !== "Checked In")) return false
    return hasTimeOverlap(start, end, toLocalDateTime(reservation.date, reservation.startTime), toLocalDateTime(reservation.date, reservation.endTime))
  })
  const externalConflict = externalBookings.some((booking) => {
    if (booking.spaceId !== spaceId) return false
    return hasTimeOverlap(start, end, new Date(booking.startAt), new Date(booking.endAt))
  })
  return activeReservationConflict || externalConflict
}

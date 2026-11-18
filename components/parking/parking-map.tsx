"use client"

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CircleAlert, Clock3, ParkingSquare, Signpost, X } from "lucide-react"
import type { ParkingSpace } from "./parking-data"

export type BayVisualState = "available" | "selected" | "reserved" | "occupied" | "closed" | "booked" | "restricted"

const stateLabels: Record<BayVisualState, string> = {
  available: "Available",
  selected: "Selected",
  reserved: "Reserved",
  occupied: "Occupied",
  closed: "Closed",
  booked: "Unavailable for this time",
  restricted: "Permit restricted",
}

export function ParkingMap({ title, spaces, states, selectedSpaceId, onSelect, interactive = true, availableOnly = false, caption = "Select an available bay or result to view its details." }: {
  title: string
  spaces: ParkingSpace[]
  states: Record<string, BayVisualState>
  selectedSpaceId?: string | null
  onSelect?: (space: ParkingSpace) => void
  interactive?: boolean
  availableOnly?: boolean
  caption?: string
}) {
  const displayedSpaces = spaces
  return (
    <section className="map-card" aria-label={`${title} parking map`}>
      <div className="map-card-heading">
        <div><p className="eyebrow">CAMPUS PARKING MAP</p><h2>{title}</h2></div>
        <span className="map-live"><span className="live-dot" /> Simulated campus data</span>
      </div>
      <div className="parking-map" role="group" aria-label={`${title} top-down bay map`}>
        <div className="map-landscape-label">UNIVERSITY OF DUBAI <span>·</span> CAMPUS PARKING</div>
        <div className="map-entry"><Signpost size={16} /><span>ENTRY</span><ArrowRight size={15} /></div>
        <div className="map-building map-building-top">CAMPUS GREEN <span>Pedestrian zone</span></div>
        <div className="map-bay-grid">
          {displayedSpaces.map((space) => (
            <Bay key={space.id} space={space} state={states[space.id] ?? "available"} selected={selectedSpaceId === space.id} interactive={interactive} availableOnly={availableOnly} onSelect={onSelect} />
          ))}
        </div>
        <div className="map-drive-lane" aria-label="Campus one-way access road">
          <span className="lane-arrow"><ArrowRight size={17} /><ArrowRight size={17} /></span>
          <span className="lane-name">ONE WAY · 10 KM/H</span>
          <div className="crosswalk" aria-label="Pedestrian crossing"><i /><i /><i /><i /><i /><i /><i /></div>
          <span className="lane-arrow lane-arrow-reverse"><ArrowLeft size={17} /><ArrowLeft size={17} /></span>
        </div>
        <div className="map-building map-building-bottom"><ParkingSquare size={15} /> VISITOR CENTRE <span>North campus</span></div>
        <div className="map-north"><ArrowUp size={13} /><span>N</span><ArrowDown size={10} /></div>
        <div className="map-scale" aria-hidden="true"><span /> 10 m</div>
        <div className="map-entrance-secondary"><ArrowRight size={13} /> SOUTH GATE</div>
      </div>
      <div className="map-legend" aria-label="Map legend">
        <Legend state="available" label="Available" />
        <Legend state="selected" label="Selected" />
        <Legend state="reserved" label="Reserved" />
        <Legend state="occupied" label="Occupied" />
        <Legend state="closed" label="Closed" />
        <Legend state="restricted" label="Restricted" />
      </div>
      <p className="map-caption">{caption}</p>
    </section>
  )
}

function Bay({ space, state, selected, interactive, availableOnly, onSelect }: {
  space: ParkingSpace
  state: BayVisualState
  selected: boolean
  interactive: boolean
  availableOnly: boolean
  onSelect?: (space: ParkingSpace) => void
}) {
  const status = stateLabels[state]
  const Mark = state === "available" || state === "selected" ? Check : state === "reserved" ? Clock3 : state === "closed" || state === "booked" ? X : state === "occupied" ? ParkingSquare : CircleAlert
  const disabled = !interactive || onSelect === undefined || (availableOnly && state !== "available" && state !== "selected")
  return (
    <button
      type="button"
      className={`map-bay bay-${state}`}
      aria-label={`${space.id}, ${status}, ${space.permit} permit`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect?.(space)}
      title={`${space.id} · ${status} · ${space.permit} permit`}
    >
      <span className="bay-number">{space.label}</span>
      <Mark className="bay-status-mark" aria-hidden="true" />
      <span className="bay-permit-mark">{space.permit}</span>
    </button>
  )
}

function Legend({ state, label }: { state: BayVisualState; label: string }) {
  return <span className="legend-item"><span className={`legend-swatch legend-${state}`} aria-hidden="true" />{label}</span>
}

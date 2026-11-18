"use client"

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ParkingSquare, Signpost } from "lucide-react"
import type { ParkingSpace } from "./parking-data"

export type BayVisualState = "available" | "selected" | "booked" | "restricted"

type ParkingMapProps = {
  title: string
  spaces: ParkingSpace[]
  selectedSpaceId: string | null
  getState: (space: ParkingSpace) => BayVisualState
  onSelect: (space: ParkingSpace) => void
  disabled?: boolean
}

export function ParkingMap({ title, spaces, selectedSpaceId, getState, onSelect, disabled }: ParkingMapProps) {
  const rows = [spaces.slice(0, 5), spaces.slice(5, 10)]

  return (
    <section className="map-card" aria-label="Parking space map">
      <div className="map-card-heading">
        <div>
          <p className="eyebrow">LIVE PARKING MAP</p>
          <h2>{title}</h2>
        </div>
        <span className="map-live"><span className="live-dot" /> Live demo</span>
      </div>
      <div className="parking-map">
        <div className="map-landscape-label">UNIVERSITY OF DUBAI <span>·</span> CAMPUS PARKING</div>
        <div className="map-entry"><Signpost size={14} /><span>ENTRY</span><ArrowRight size={15} /></div>
        <div className="map-building map-building-top">CAMPUS GREEN <span>Pedestrian zone</span></div>
        <div className="map-bay-row map-bay-row-top">
          {rows[0].map((space) => (
            <Bay key={space.id} space={space} state={getState(space)} selected={selectedSpaceId === space.id} onSelect={onSelect} disabled={disabled} />
          ))}
        </div>
        <div className="map-drive-lane" aria-label="Two-way driving lane">
          <span className="lane-arrow"><ArrowRight size={18} /><ArrowRight size={18} /></span>
          <span className="lane-name">ONE WAY · 10 KM/H</span>
          <div className="crosswalk" aria-label="Pedestrian crossing"><i /><i /><i /><i /><i /><i /></div>
          <span className="lane-arrow lane-arrow-reverse"><ArrowLeft size={18} /><ArrowLeft size={18} /></span>
        </div>
        <div className="map-bay-row map-bay-row-bottom">
          {rows[1].map((space) => (
            <Bay key={space.id} space={space} state={getState(space)} selected={selectedSpaceId === space.id} onSelect={onSelect} disabled={disabled} />
          ))}
        </div>
        <div className="map-building map-building-bottom"><ParkingSquare size={15} /> VISITOR CENTRE <span>North campus</span></div>
        <div className="map-north"><ArrowUp size={13} /><span>N</span></div>
        <div className="map-scale" aria-hidden="true"><span /> 10 m</div>
      </div>
      <div className="map-legend" aria-label="Map legend">
        <Legend color="green" label="Available" />
        <Legend color="selected" label="Selected" />
        <Legend color="red" label="Booked / occupied" />
        <Legend color="gray" label="Permit restricted" />
      </div>
      <p className="map-caption">Select any green bay or result to choose your parking space.</p>
    </section>
  )
}

function Bay({ space, state, selected, onSelect, disabled }: {
  space: ParkingSpace
  state: BayVisualState
  selected: boolean
  onSelect: (space: ParkingSpace) => void
  disabled?: boolean
}) {
  const stateLabel = state === "booked" ? "Booked or occupied" : state === "restricted" ? `Restricted, ${space.permit} permit` : state === "selected" ? "Selected" : "Available"
  return (
    <button
      type="button"
      className={`map-bay bay-${state}`}
      aria-label={`${space.id}, ${stateLabel}, ${space.permit} permit`}
      aria-pressed={selected}
      disabled={disabled || (state !== "available" && state !== "selected")}
      onClick={() => onSelect(space)}
    >
      <span className="bay-number">{space.number}</span>
      <span className="bay-status-mark" aria-hidden="true">{state === "available" ? "✓" : state === "selected" ? "✓" : state === "booked" ? "×" : "—"}</span>
    </button>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="legend-item"><span className={`legend-swatch legend-${color}`} />{label}</span>
}

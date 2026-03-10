export interface AircraftState {
  icao24: string
  callsign: string | null
  originCountry: string
  timePosition: number | null
  lastContact: number
  longitude: number | null
  latitude: number | null
  baroAltitude: number | null
  onGround: boolean
  velocity: number | null
  trueHeading: number | null
  verticalRate: number | null
  geoAltitude: number | null
  squawk: string | null
  positionSource: number
}

export function parseAircraftState(state: unknown[]): AircraftState {
  return {
    icao24: state[0] as string,
    callsign: (state[1] as string)?.trim() || null,
    originCountry: state[2] as string,
    timePosition: state[3] as number | null,
    lastContact: state[4] as number,
    longitude: state[5] as number | null,
    latitude: state[6] as number | null,
    baroAltitude: state[7] as number | null,
    onGround: state[8] as boolean,
    velocity: state[9] as number | null,
    trueHeading: state[10] as number | null,
    verticalRate: state[11] as number | null,
    geoAltitude: state[13] as number | null,
    squawk: state[14] as string | null,
    positionSource: state[16] as number,
  }
}

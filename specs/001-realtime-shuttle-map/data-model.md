# Data Model: Real-time Campus Shuttle Map (Phase 1)

## Entities

### Vehicle

- **Fields**: id, label, latitude, longitude, heading, direction
  (outbound|inbound), last_updated, status
- **Validation**: latitude/longitude required and within valid ranges; direction
  required; last_updated must be ISO 8601; status is derived from last_updated
  age.
- **Notes**: Vehicles with status Hidden are not returned or are filtered from
  the UI.

### Stop

- **Fields**: id, name_th, name_en (optional), latitude, longitude, sequence,
  direction (outbound|inbound)
- **Validation**: unique id; sequence is positive integer per direction; names
  must exist in Thai.

### Route

- **Fields**: id, name, directions, geometry
- **Validation**: geometry is a LineString per direction; directions list
  includes outbound and inbound.

### ETA

- **Fields**: stop_id, vehicle_id (optional), eta_minutes, arrival_time,
  last_updated, status
- **Validation**: eta_minutes >= 0; arrival_time must be ISO 8601; last_updated
  required; status derived from last_updated age.

## Relationships

- Route has many Stops (per direction) and one geometry per direction.
- Vehicle belongs to a Route and Direction.
- ETA belongs to a Stop and optionally references a Vehicle.

## State Transitions (Reliability)

Status is derived from last_updated age:

- Fresh: <= 15 seconds
- Delayed: > 15 seconds and <= 60 seconds
- Offline: > 60 seconds and <= 120 seconds
- Hidden: > 120 seconds (must be removed from passenger view)

## Derived Values

- last_updated_age = server_time - last_updated
- status derived from last_updated_age
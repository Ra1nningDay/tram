import { z } from "zod";

export const vehicleSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  heading: z.number().optional(),
  direction: z.enum(["outbound", "inbound"]),
  last_updated: z.string(),
});

export const stopSchema = z.object({
  id: z.string(),
  name_th: z.string(),
  name_en: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  sequence: z.number(),
  direction: z.enum(["outbound", "inbound"]),
});

export const routeSchema = z.object({
  id: z.string(),
  name: z.string(),
  directions: z.array(
    z.object({
      direction: z.enum(["outbound", "inbound"]),
      geometry: z.object({
        type: z.literal("LineString"),
        coordinates: z.array(z.tuple([z.number(), z.number()])),
      }),
      stops: z.array(
        z.object({
          id: z.string(),
          sequence: z.number(),
        }),
      ),
    }),
  ),
});

export const etaSchema = z.object({
  stop_id: z.string(),
  vehicle_id: z.string().optional(),
  eta_minutes: z.number().int().nonnegative(),
  arrival_time: z.string().optional(),
  last_updated: z.string(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type StopInput = z.infer<typeof stopSchema>;
export type RouteInput = z.infer<typeof routeSchema>;
export type EtaInput = z.infer<typeof etaSchema>;
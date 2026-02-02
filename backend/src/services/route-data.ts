export const routeData = {
  id: "campus-loop",
  name: "Campus Loop",
  directions: [
    {
      direction: "outbound",
      geometry: {
        type: "LineString",
        coordinates: [
          [100.5231, 13.7367],
          [100.5245, 13.7375],
        ],
      },
      stops: [
        { id: "stop-1", sequence: 1 },
        { id: "stop-2", sequence: 2 },
      ],
    },
    {
      direction: "inbound",
      geometry: {
        type: "LineString",
        coordinates: [
          [100.5245, 13.7375],
          [100.5231, 13.7367],
        ],
      },
      stops: [
        { id: "stop-2", sequence: 1 },
        { id: "stop-1", sequence: 2 },
      ],
    },
  ],
};

export const stopsData = [
  {
    id: "stop-1",
    name_th: "???? 1",
    name_en: "Stop 1",
    latitude: 13.7367,
    longitude: 100.5231,
    sequence: 1,
    direction: "outbound" as const,
  },
  {
    id: "stop-2",
    name_th: "???? 2",
    name_en: "Stop 2",
    latitude: 13.7375,
    longitude: 100.5245,
    sequence: 2,
    direction: "outbound" as const,
  },
];
// Physical and orbital data for the bodies in the simulation.
// Planet orbital elements: JPL "Keplerian Elements for Approximate Positions of the Major Planets",
// Table 1 (valid 1800 AD – 2050 AD). Units: AU, degrees, per Julian century from J2000.
// Physical constants from NASA planetary fact sheets.

export const AU_KM = 149597870.7;

// [a, e, I, L, longPeri, longNode] and their rates per century
export const PLANETS = [
  {
    id: 'mercury', name: 'Mercury', type: 'Terrestrial planet',
    color: 0xb5b0a8, texture: '2k_mercury.jpg',
    el:   [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
    rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    radiusKm: 2439.7, rotationHours: 1407.6, tiltDeg: 0.034, massKg: 3.301e23,
    tempC: 167, periodDays: 87.969, moons: 0, gravity: 3.7,
    blurb: 'The smallest planet and closest to the Sun. Its day is longer than its year: it rotates three times for every two orbits.'
  },
  {
    id: 'venus', name: 'Venus', type: 'Terrestrial planet',
    color: 0xe8c58a, texture: '2k_venus_surface.jpg',
    el:   [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
    rate: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    radiusKm: 6051.8, rotationHours: -5832.5, tiltDeg: 177.4, massKg: 4.867e24,
    tempC: 464, periodDays: 224.701, moons: 0, gravity: 8.9,
    blurb: 'Wrapped in dense clouds of sulfuric acid, Venus is the hottest planet and spins backwards, slower than it orbits.'
  },
  {
    id: 'earth', name: 'Earth', type: 'Terrestrial planet',
    color: 0x5aa3e8, texture: '2k_earth_daymap.jpg', night: '2k_earth_nightmap.jpg', clouds: '2k_earth_clouds.jpg',
    el:   [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    radiusKm: 6371.0, rotationHours: 23.9345, tiltDeg: 23.44, massKg: 5.972e24,
    tempC: 15, periodDays: 365.256, moons: 1, gravity: 9.8,
    blurb: 'Home. The only known world with liquid surface water and life, orbited by an unusually large moon.'
  },
  {
    id: 'mars', name: 'Mars', type: 'Terrestrial planet',
    color: 0xd6764a, texture: '2k_mars.jpg',
    el:   [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    radiusKm: 3389.5, rotationHours: 24.6229, tiltDeg: 25.19, massKg: 6.417e23,
    tempC: -65, periodDays: 686.980, moons: 2, gravity: 3.7,
    blurb: 'The red planet, rusted by iron oxide dust. Home to Olympus Mons, the tallest volcano in the solar system.'
  },
  {
    id: 'jupiter', name: 'Jupiter', type: 'Gas giant',
    color: 0xd9b48a, texture: '2k_jupiter.jpg',
    el:   [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    radiusKm: 69911, rotationHours: 9.925, tiltDeg: 3.13, massKg: 1.898e27,
    tempC: -110, periodDays: 4332.59, moons: 95, gravity: 23.1,
    blurb: 'More than twice as massive as all other planets combined. The Great Red Spot is a storm larger than Earth.'
  },
  {
    id: 'saturn', name: 'Saturn', type: 'Gas giant',
    color: 0xe3d3a0, texture: '2k_saturn.jpg', ring: '2k_saturn_ring_alpha.png',
    ringInner: 1.24, ringOuter: 2.27,
    el:   [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    rate: [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    radiusKm: 58232, rotationHours: 10.656, tiltDeg: 26.73, massKg: 5.683e26,
    tempC: -140, periodDays: 10759.22, moons: 146, gravity: 9.0,
    blurb: 'Its rings are mostly water ice, hundreds of thousands of kilometres across yet only tens of metres thick.'
  },
  {
    id: 'uranus', name: 'Uranus', type: 'Ice giant',
    color: 0x9fd6e0, texture: '2k_uranus.jpg',
    ringInner: 1.6, ringOuter: 2.0, ringOpacity: 0.25,
    el:   [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
    rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
    radiusKm: 25362, rotationHours: -17.24, tiltDeg: 97.77, massKg: 8.681e25,
    tempC: -195, periodDays: 30688.5, moons: 28, gravity: 8.7,
    blurb: 'Tipped on its side, Uranus rolls around the Sun. Each pole gets 42 years of daylight followed by 42 years of night.'
  },
  {
    id: 'neptune', name: 'Neptune', type: 'Ice giant',
    color: 0x4f6fe0, texture: '2k_neptune.jpg',
    el:   [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
    radiusKm: 24622, rotationHours: 16.11, tiltDeg: 28.32, massKg: 1.024e26,
    tempC: -200, periodDays: 60182, moons: 16, gravity: 11.0,
    blurb: 'The windiest world, with supersonic gusts above 2,000 km/h. It was found by mathematics before it was seen.'
  }
];

export const SUN = {
  id: 'sun', name: 'Sun', type: 'G-type main-sequence star',
  color: 0xffc44d, texture: '2k_sun.jpg',
  radiusKm: 695700, rotationHours: 609.12, tiltDeg: 7.25, massKg: 1.989e30,
  tempC: 5500, periodDays: null, moons: 8, gravity: 274,
  blurb: 'A 4.6-billion-year-old star holding 99.8% of the solar system’s mass. Light from its surface reaches Earth in 8 minutes.'
};

// Moons: circular orbits, distance in km from the parent centre, sidereal period in days.
// inclDeg is inclination to the ecliptic (approximation: parent equatorial plane for regular moons).
export const MOONS = [
  { id: 'moon', name: 'Moon', parent: 'earth', color: 0xc9c9c9, texture: '2k_moon.jpg',
    radiusKm: 1737.4, distKm: 384400, periodDays: 27.3217, inclDeg: 5.145, node: 125.08, rotationHours: 655.72,
    massKg: 7.346e22, tempC: -20, gravity: 1.6, type: 'Natural satellite of Earth',
    blurb: 'Tidally locked, always showing the same face to Earth. Its pull drives the ocean tides.' },
  { id: 'io', name: 'Io', parent: 'jupiter', color: 0xe6d27a,
    radiusKm: 1821.6, distKm: 421700, periodDays: 1.769, inclDeg: 3.13, node: 100.5, rotationHours: 42.46,
    massKg: 8.93e22, tempC: -143, gravity: 1.8, type: 'Galilean moon of Jupiter',
    blurb: 'The most volcanically active body in the solar system, kneaded by Jupiter’s tides.' },
  { id: 'europa', name: 'Europa', parent: 'jupiter', color: 0xd8cfc2,
    radiusKm: 1560.8, distKm: 671034, periodDays: 3.551, inclDeg: 3.13, node: 100.5, rotationHours: 85.23,
    massKg: 4.80e22, tempC: -160, gravity: 1.3, type: 'Galilean moon of Jupiter',
    blurb: 'An ice shell over a global salt-water ocean, one of the most promising places to look for life.' },
  { id: 'ganymede', name: 'Ganymede', parent: 'jupiter', color: 0xa39a8d,
    radiusKm: 2634.1, distKm: 1070412, periodDays: 7.155, inclDeg: 3.13, node: 100.5, rotationHours: 171.7,
    massKg: 1.48e23, tempC: -163, gravity: 1.4, type: 'Galilean moon of Jupiter',
    blurb: 'The largest moon in the solar system, bigger than Mercury, and the only one with its own magnetic field.' },
  { id: 'callisto', name: 'Callisto', parent: 'jupiter', color: 0x6f665c,
    radiusKm: 2410.3, distKm: 1882709, periodDays: 16.689, inclDeg: 3.13, node: 100.5, rotationHours: 400.5,
    massKg: 1.08e23, tempC: -139, gravity: 1.2, type: 'Galilean moon of Jupiter',
    blurb: 'One of the most heavily cratered surfaces known, essentially unchanged for four billion years.' },
  { id: 'titan', name: 'Titan', parent: 'saturn', color: 0xd9a24a,
    radiusKm: 2574.7, distKm: 1221870, periodDays: 15.945, inclDeg: 26.73, node: 113.7, rotationHours: 382.7,
    massKg: 1.345e23, tempC: -179, gravity: 1.4, type: 'Moon of Saturn',
    blurb: 'A thick orange atmosphere and lakes of liquid methane. The only moon with weather and rain.' },
  { id: 'triton', name: 'Triton', parent: 'neptune', color: 0xc4b8c8,
    radiusKm: 1353.4, distKm: 354759, periodDays: -5.877, inclDeg: 23, node: 131.8, rotationHours: -141.0,
    massKg: 2.14e22, tempC: -235, gravity: 0.8, type: 'Moon of Neptune',
    blurb: 'Orbits backwards, a captured Kuiper Belt object. Nitrogen geysers erupt from its frozen surface.' }
];

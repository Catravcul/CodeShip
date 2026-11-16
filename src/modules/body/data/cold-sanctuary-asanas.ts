// GENERADO por scripts/asanas-from-cold-sanctuary.mjs desde Cold Sanctuary (commit af0bca9). No editar a mano:
// vuelve a ejecutar el script. Convención de Unity tal cual (X derecha, Y arriba, Z adelante; grados, Euler ZXY);
// el cambio de ejes a Three.js está en ../domain/unity-axes.ts.
import type { AsanaData, AsanaSequenceData } from "../domain/asana";

export const COLD_SANCTUARY_COMMIT = "af0bca9";

export const COLD_SANCTUARY_ASANAS: readonly AsanaData[] = [
  {
    "id": "pranamasana-oracion",
    "name": "Pranamasana (oración)",
    "source": "YogaSpells.cs · SunSalutation",
    "joints": {
      "ShoulderLeft": [-25, 0, 12],
      "ShoulderRight": [-25, 0, -12],
      "ForearmLeft": [-105, 0, -45],
      "ForearmRight": [-105, 0, 45],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20]
    },
    "rootHeight": null,
    "stanceWidth": 0,
    "reaches": [
      { "end": "HandLeft", "target": [-0.035, 1.34, 0.27] },
      { "end": "HandRight", "target": [0.035, 1.34, 0.27] }
    ]
  },
  {
    "id": "hasta-uttanasana-brazos-arriba",
    "name": "Hasta Uttanasana (brazos arriba)",
    "source": "YogaSpells.cs · SunSalutation",
    "joints": { "ShoulderLeft": [-175, 0, 0], "ShoulderRight": [-175, 0, 0], "Back": [-16.5, 0, 0], "Chest": [-13.5, 0, 0], "Head": [-15, 0, 0] },
    "rootHeight": null,
    "stanceWidth": 0,
    "reaches": []
  },
  {
    "id": "uttanasana-flexion-adelante",
    "name": "Uttanasana (flexión adelante)",
    "source": "YogaSpells.cs · SunSalutation",
    "joints": {
      "Hips": [112, 0, 0],
      "ThighLeft": [-112, 0, 0],
      "ThighRight": [-112, 0, 0],
      "Back": [17.6, 0, 0],
      "Chest": [14.4, 0, 0],
      "Head": [15, 0, 0],
      "ShoulderLeft": [-140, 0, 0],
      "ShoulderRight": [-140, 0, 0]
    },
    "rootHeight": null,
    "stanceWidth": 0,
    "reaches": [
      { "end": "HandLeft", "target": [-0.17, 0.03, 0.22] },
      { "end": "HandRight", "target": [0.17, 0.03, 0.22] }
    ]
  },
  {
    "id": "ashwa-sanchalanasana-zancada",
    "name": "Ashwa Sanchalanasana (zancada)",
    "source": "YogaSpells.cs · SunSalutation",
    "joints": {
      "Hips": [48, 0, 0],
      "Back": [22, 0, 0],
      "Chest": [18, 0, 0],
      "Head": [-45, 0, 0],
      "ThighLeft": [-140, 0, 0],
      "ShinLeft": [94, 0, 0],
      "ThighRight": [28, 0, 0],
      "ShinRight": [30, 0, 0],
      "FootRight": [55, 0, 0],
      "ShoulderLeft": [-88, 0, 0],
      "ShoulderRight": [-88, 0, 0]
    },
    "rootHeight": 0.5,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.24, 0.03, 0.55] },
      { "end": "HandRight", "target": [0.24, 0.03, 0.55] }
    ]
  },
  {
    "id": "dandasana-plancha",
    "name": "Dandasana (plancha)",
    "source": "YogaSpells.cs · SunSalutation",
    "joints": {
      "Hips": [72, 0, 0],
      "FootLeft": [25, 0, 0],
      "FootRight": [25, 0, 0],
      "Head": [-20, 0, 0],
      "ShoulderLeft": [-72, 0, 0],
      "ShoulderRight": [-72, 0, 0]
    },
    "rootHeight": 0.5,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "ashtanga-namaskara-ocho-miembros",
    "name": "Ashtanga Namaskara (ocho miembros)",
    "source": "YogaSpells.cs · SunSalutation",
    "joints": {
      "Hips": [48, 0, 0],
      "ThighLeft": [-20, 0, 0],
      "ThighRight": [-20, 0, 0],
      "ShinLeft": [70, 0, 0],
      "ShinRight": [70, 0, 0],
      "Head": [10, 0, 0],
      "ShoulderLeft": [-25, 0, 0],
      "ShoulderRight": [-25, 0, 0],
      "ForearmLeft": [-110, 0, 0],
      "ForearmRight": [-110, 0, 0],
      "Back": [30.25, 0, 0],
      "Chest": [24.75, 0, 0]
    },
    "rootHeight": 0.3,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "bhujangasana-cobra",
    "name": "Bhujangasana (cobra)",
    "source": "YogaSpells.cs · SunSalutation",
    "joints": {
      "Hips": [90, 0, 0],
      "FootLeft": [80, 0, 0],
      "FootRight": [80, 0, 0],
      "Head": [-25, 0, 0],
      "Back": [-33, 0, 0],
      "Chest": [-27, 0, 0],
      "ShoulderLeft": [-30, 0, 0],
      "ShoulderRight": [-30, 0, 0]
    },
    "rootHeight": 0.5,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "adho-mukha-svanasana-perro-boca-abajo",
    "name": "Adho Mukha Svanasana (perro boca abajo)",
    "source": "YogaSpells.cs · SunSalutation",
    "joints": {
      "Hips": [124, 0, 0],
      "ThighLeft": [-88, 0, 0],
      "ThighRight": [-88, 0, 0],
      "Head": [20, 0, 0],
      "ShoulderLeft": [-172, 0, 0],
      "ShoulderRight": [-172, 0, 0],
      "FootLeft": [-25, 0, 0],
      "FootRight": [-25, 0, 0]
    },
    "rootHeight": null,
    "stanceWidth": 0,
    "reaches": [
      { "end": "HandLeft", "target": [-0.2, 0.03, 1] },
      { "end": "HandRight", "target": [0.2, 0.03, 1] }
    ]
  },
  {
    "id": "ashwa-sanchalanasana-zancada-2",
    "name": "Ashwa Sanchalanasana (zancada)",
    "source": "YogaSpells.cs · SunSalutation",
    "joints": {
      "Hips": [48, 0, 0],
      "Back": [22, 0, 0],
      "Chest": [18, 0, 0],
      "Head": [-45, 0, 0],
      "ThighRight": [-140, 0, 0],
      "ShinRight": [94, 0, 0],
      "ThighLeft": [28, 0, 0],
      "ShinLeft": [30, 0, 0],
      "FootLeft": [55, 0, 0],
      "ShoulderLeft": [-88, 0, 0],
      "ShoulderRight": [-88, 0, 0]
    },
    "rootHeight": 0.5,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.24, 0.03, 0.55] },
      { "end": "HandRight", "target": [0.24, 0.03, 0.55] }
    ]
  },
  {
    "id": "samasthitih-de-pie",
    "name": "Samasthitih (de pie)",
    "source": "YogaSpells.cs · SunSalutation.AshtangaA",
    "joints": {},
    "rootHeight": null,
    "stanceWidth": 0,
    "reaches": []
  },
  {
    "id": "urdhva-vrksasana-brazos-arriba",
    "name": "Urdhva Vrksasana (brazos arriba)",
    "source": "YogaSpells.cs · SunSalutation.AshtangaA",
    "joints": { "ShoulderLeft": [-175, 0, 0], "ShoulderRight": [-175, 0, 0], "Back": [-6.6, 0, 0], "Chest": [-5.4, 0, 0], "Head": [-25, 0, 0] },
    "rootHeight": null,
    "stanceWidth": 0,
    "reaches": []
  },
  {
    "id": "ardha-uttanasana-media-flexion",
    "name": "Ardha Uttanasana (media flexión)",
    "source": "YogaSpells.cs · SunSalutation.AshtangaA",
    "joints": {
      "Hips": [88, 0, 0],
      "ThighLeft": [-88, 0, 0],
      "ThighRight": [-88, 0, 0],
      "Back": [-3.3, 0, 0],
      "Chest": [-2.7, 0, 0],
      "Head": [-30, 0, 0],
      "ShoulderLeft": [-88, 0, 0],
      "ShoulderRight": [-88, 0, 0]
    },
    "rootHeight": null,
    "stanceWidth": 0,
    "reaches": []
  },
  {
    "id": "chaturanga-dandasana",
    "name": "Chaturanga Dandasana",
    "source": "YogaSpells.cs · SunSalutation.AshtangaA",
    "joints": {
      "Hips": [80, 0, 0],
      "Head": [-12, 0, 0],
      "FootLeft": [0, 0, 0],
      "FootRight": [0, 0, 0],
      "ShoulderLeft": [20, 0, 0],
      "ShoulderRight": [20, 0, 0],
      "ForearmLeft": [-100, 0, 0],
      "ForearmRight": [-100, 0, 0]
    },
    "rootHeight": 0.3,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.2, 0.03, 0.42] },
      { "end": "HandRight", "target": [0.2, 0.03, 0.42] }
    ]
  },
  {
    "id": "urdhva-mukha-svanasana-perro-boca-arriba",
    "name": "Urdhva Mukha Svanasana (perro boca arriba)",
    "source": "YogaSpells.cs · SunSalutation.AshtangaA",
    "joints": {
      "Hips": [88, 0, 0],
      "Back": [-30, 0, 0],
      "Chest": [-28, 0, 0],
      "Neck": [-10, 0, 0],
      "Head": [-25, 0, 0],
      "FootLeft": [75, 0, 0],
      "FootRight": [75, 0, 0],
      "ShoulderLeft": [-28, 0, 0],
      "ShoulderRight": [-28, 0, 0]
    },
    "rootHeight": 0.2,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.2, 0.03, 0.38] },
      { "end": "HandRight", "target": [0.2, 0.03, 0.38] }
    ]
  },
  {
    "id": "padangusthasana-dedos-de-pie",
    "name": "Padangusthasana (dedos de pie)",
    "source": "AshtangaPrimary.cs",
    "joints": {
      "Hips": [112, 0, 0],
      "ThighLeft": [-112, 0, 0],
      "ThighRight": [-112, 0, 0],
      "Back": [17.6, 0, 0],
      "Chest": [14.4, 0, 0],
      "Head": [15, 0, 0],
      "ShoulderLeft": [-140, 0, 0],
      "ShoulderRight": [-140, 0, 0]
    },
    "rootHeight": null,
    "stanceWidth": 0.25,
    "reaches": [
      { "end": "HandLeft", "target": [-0.1, 0.03, 0.2] },
      { "end": "HandRight", "target": [0.1, 0.03, 0.2] }
    ]
  },
  {
    "id": "utkatasana-silla",
    "name": "Utkatasana (silla)",
    "source": "AshtangaPrimary.cs",
    "joints": {
      "ShoulderLeft": [-175, 0, 0],
      "ShoulderRight": [-175, 0, 0],
      "ThighLeft": [-30, 0, 0],
      "ThighRight": [-30, 0, 0],
      "ShinLeft": [45, 0, 0],
      "ShinRight": [45, 0, 0],
      "Back": [11, 0, 0],
      "Chest": [9, 0, 0]
    },
    "rootHeight": 0.75,
    "stanceWidth": 0,
    "reaches": []
  },
  {
    "id": "virabhadrasana-i-guerrero-i",
    "name": "Virabhadrasana I (guerrero I)",
    "source": "AshtangaPrimary.cs",
    "joints": {
      "ThighLeft": [-100, 0, 0],
      "ShinLeft": [95, 0, 0],
      "ThighRight": [55, 0, 0],
      "ShinRight": [10, 0, 0],
      "ShoulderLeft": [-175, 0, 0],
      "ShoulderRight": [-175, 0, 0],
      "Back": [-5.5, 0, 0],
      "Chest": [-4.5, 0, 0],
      "Head": [-10, 0, 0]
    },
    "rootHeight": 0.6,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "prasarita-padottanasana-piernas-abiertas",
    "name": "Prasarita Padottanasana (piernas abiertas)",
    "source": "AshtangaPrimary.cs",
    "joints": {
      "Hips": [105, 0, 0],
      "ThighLeft": [-105, 0, 0],
      "ThighRight": [-105, 0, 0],
      "Back": [22, 0, 0],
      "Chest": [18, 0, 0],
      "ShoulderLeft": [-140, 0, 0],
      "ShoulderRight": [-140, 0, 0],
      "Head": [15, 0, 0]
    },
    "rootHeight": null,
    "stanceWidth": 0.9,
    "reaches": [
      { "end": "HandLeft", "target": [-0.16, 0.03, 0.05] },
      { "end": "HandRight", "target": [0.16, 0.03, 0.05] }
    ]
  },
  {
    "id": "dandasana-baston",
    "name": "Dandasana (bastón)",
    "source": "AshtangaPrimary.cs",
    "joints": { "ThighLeft": [-90, 0, 0], "ThighRight": [-90, 0, 0] },
    "rootHeight": 0.5,
    "stanceWidth": 0.12,
    "reaches": []
  },
  {
    "id": "paschimottanasana-pinza-sentada",
    "name": "Paschimottanasana (pinza sentada)",
    "source": "AshtangaPrimary.cs",
    "joints": {
      "ThighLeft": [-90, 0, 0],
      "ThighRight": [-90, 0, 0],
      "Back": [44, 0, 0],
      "Chest": [36, 0, 0],
      "ShoulderLeft": [-80, 0, 0],
      "ShoulderRight": [-80, 0, 0]
    },
    "rootHeight": 0.5,
    "stanceWidth": 0.12,
    "reaches": []
  },
  {
    "id": "navasana-barca",
    "name": "Navasana (barca)",
    "source": "AshtangaPrimary.cs",
    "joints": { "Hips": [-40, 0, 0], "ThighLeft": [-55, 0, 0], "ThighRight": [-55, 0, 0], "ShoulderLeft": [-90, 0, 0], "ShoulderRight": [-90, 0, 0] },
    "rootHeight": 0.5,
    "stanceWidth": 0.12,
    "reaches": []
  },
  {
    "id": "baddha-konasana-angulo-atado",
    "name": "Baddha Konasana (ángulo atado)",
    "source": "AshtangaPrimary.cs",
    "joints": { "ThighLeft": [-50, 0, 35], "ThighRight": [-50, 0, -35], "ShinLeft": [120, 0, 0], "ShinRight": [120, 0, 0], "Back": [10, 0, 0] },
    "rootHeight": 0.5,
    "stanceWidth": 0.12,
    "reaches": []
  },
  {
    "id": "setu-bandhasana-puente",
    "name": "Setu Bandhasana (puente)",
    "source": "AshtangaPrimary.cs",
    "joints": { "Hips": [-40, 0, 0], "ThighLeft": [-30, 0, 0], "ThighRight": [-30, 0, 0], "ShinLeft": [70, 0, 0], "ShinRight": [70, 0, 0] },
    "rootHeight": 0.35,
    "stanceWidth": 0.12,
    "reaches": []
  },
  {
    "id": "savasana-relajacion-final",
    "name": "Savasana (relajación final)",
    "source": "AshtangaPrimary.cs",
    "joints": { "Hips": [-90, 0, 0] },
    "rootHeight": 0.12,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "yoga-namaskar-de-pie-rezo-al-pecho",
    "name": "Yoga Namaskar: de pie, rezo al pecho",
    "source": "YogaNamaskar.cs",
    "joints": {
      "ShoulderLeft": [-25, 0, 12],
      "ShoulderRight": [-25, 0, -12],
      "ForearmLeft": [-105, 0, -45],
      "ForearmRight": [-105, 0, 45],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20]
    },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.035, 1.34, 0.27] },
      { "end": "HandRight", "target": [0.035, 1.34, 0.27] }
    ]
  },
  {
    "id": "yoga-namaskar-rezo-sobre-la-cabeza",
    "name": "Yoga Namaskar: rezo sobre la cabeza",
    "source": "YogaNamaskar.cs",
    "joints": {
      "ShoulderLeft": [-172, 0, 6],
      "ShoulderRight": [-172, 0, -6],
      "ForearmLeft": [0, 0, -8],
      "ForearmRight": [0, 0, 8],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20]
    },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.035, 2.07, 0.1] },
      { "end": "HandRight", "target": [0.035, 2.07, 0.1] }
    ]
  },
  {
    "id": "yoga-namaskar-manos-a-la-nuca",
    "name": "Yoga Namaskar: manos a la nuca",
    "source": "YogaNamaskar.cs",
    "joints": {
      "ShoulderLeft": [-120, 0, 8],
      "ShoulderRight": [-120, 0, -8],
      "ForearmLeft": [-140, 0, -20],
      "ForearmRight": [-140, 0, 20],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20]
    },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "yoga-namaskar-rezo-al-pecho",
    "name": "Yoga Namaskar: rezo al pecho",
    "source": "YogaNamaskar.cs",
    "joints": {
      "ShoulderLeft": [-25, 0, 12],
      "ShoulderRight": [-25, 0, -12],
      "ForearmLeft": [-105, 0, -45],
      "ForearmRight": [-105, 0, 45],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20]
    },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.035, 1.34, 0.27] },
      { "end": "HandRight", "target": [0.035, 1.34, 0.27] }
    ]
  },
  {
    "id": "yoga-namaskar-rezo-al-pecho-cuclillas",
    "name": "Yoga Namaskar: rezo al pecho (cuclillas)",
    "source": "YogaNamaskar.cs",
    "joints": {
      "ShoulderLeft": [-25, 0, 12],
      "ShoulderRight": [-25, 0, -12],
      "ForearmLeft": [-105, 0, -45],
      "ForearmRight": [-105, 0, 45],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20],
      "ThighLeft": [-112, 0, -22],
      "ThighRight": [-112, 0, 22],
      "ShinLeft": [145, 0, 0],
      "ShinRight": [145, 0, 0],
      "FootLeft": [-33, 0, 0],
      "FootRight": [-33, 0, 0],
      "Back": [12, 0, 0]
    },
    "rootHeight": 0.42,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.035, 1.34, 0.27] },
      { "end": "HandRight", "target": [0.035, 1.34, 0.27] }
    ]
  },
  {
    "id": "yoga-namaskar-rezo-sobre-la-cabeza-cuclillas",
    "name": "Yoga Namaskar: rezo sobre la cabeza (cuclillas)",
    "source": "YogaNamaskar.cs",
    "joints": {
      "ShoulderLeft": [-172, 0, 6],
      "ShoulderRight": [-172, 0, -6],
      "ForearmLeft": [0, 0, -8],
      "ForearmRight": [0, 0, 8],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20],
      "ThighLeft": [-112, 0, -22],
      "ThighRight": [-112, 0, 22],
      "ShinLeft": [145, 0, 0],
      "ShinRight": [145, 0, 0],
      "FootLeft": [-33, 0, 0],
      "FootRight": [-33, 0, 0],
      "Back": [12, 0, 0]
    },
    "rootHeight": 0.42,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.035, 2.07, 0.1] },
      { "end": "HandRight", "target": [0.035, 2.07, 0.1] }
    ]
  },
  {
    "id": "yoga-namaskar-manos-a-la-nuca-cuclillas",
    "name": "Yoga Namaskar: manos a la nuca (cuclillas)",
    "source": "YogaNamaskar.cs",
    "joints": {
      "ShoulderLeft": [-120, 0, 8],
      "ShoulderRight": [-120, 0, -8],
      "ForearmLeft": [-140, 0, -20],
      "ForearmRight": [-140, 0, 20],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20],
      "ThighLeft": [-112, 0, -22],
      "ThighRight": [-112, 0, 22],
      "ShinLeft": [145, 0, 0],
      "ShinRight": [145, 0, 0],
      "FootLeft": [-33, 0, 0],
      "FootRight": [-33, 0, 0],
      "Back": [12, 0, 0]
    },
    "rootHeight": 0.42,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "yoga-namaskar-brazos-al-frente-cuclillas",
    "name": "Yoga Namaskar: brazos al frente (cuclillas)",
    "source": "YogaNamaskar.cs",
    "joints": {
      "ShoulderLeft": [-90, 0, 6],
      "ShoulderRight": [-90, 0, -6],
      "ForearmLeft": [0, 0, -8],
      "ForearmRight": [0, 0, 8],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20],
      "ThighLeft": [-112, 0, -22],
      "ThighRight": [-112, 0, 22],
      "ShinLeft": [145, 0, 0],
      "ShinRight": [145, 0, 0],
      "FootLeft": [-33, 0, 0],
      "FootRight": [-33, 0, 0],
      "Back": [12, 0, 0]
    },
    "rootHeight": 0.42,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "yoga-namaskar-recoge-rezo-arriba-cuclillas",
    "name": "Yoga Namaskar: recoge, rezo arriba (cuclillas)",
    "source": "YogaNamaskar.cs",
    "joints": {
      "ShoulderLeft": [-172, 0, 6],
      "ShoulderRight": [-172, 0, -6],
      "ForearmLeft": [0, 0, -8],
      "ForearmRight": [0, 0, 8],
      "HandLeft": [0, 0, -20],
      "HandRight": [0, 0, 20],
      "ThighLeft": [-112, 0, -22],
      "ThighRight": [-112, 0, 22],
      "ShinLeft": [145, 0, 0],
      "ShinRight": [145, 0, 0],
      "FootLeft": [-33, 0, 0],
      "FootRight": [-33, 0, 0],
      "Back": [12, 0, 0]
    },
    "rootHeight": 0.42,
    "stanceWidth": null,
    "reaches": [
      { "end": "HandLeft", "target": [-0.035, 2.07, 0.1] },
      { "end": "HandRight", "target": [0.035, 2.07, 0.1] }
    ]
  },
  {
    "id": "balasana-postura-del-nino",
    "name": "Balasana (postura del niño)",
    "source": "YogaNamaskar.cs",
    "joints": {
      "Back": [55, 0, 0],
      "Chest": [45, 0, 0],
      "Head": [15, 0, 0],
      "ThighLeft": [-118, 0, 0],
      "ThighRight": [-118, 0, 0],
      "ShinLeft": [150, 0, 0],
      "ShinRight": [150, 0, 0],
      "ShoulderLeft": [-150, 0, 6],
      "ShoulderRight": [-150, 0, -6]
    },
    "rootHeight": 0.3,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-barbilla-al-pecho",
    "name": "Upa-yoga: barbilla al pecho",
    "source": "UpaYoga.cs",
    "joints": { "Head": [45, 0, 0] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-cabeza-atras",
    "name": "Upa-yoga: cabeza atrás",
    "source": "UpaYoga.cs",
    "joints": { "Head": [-35, 0, 0] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-neutro",
    "name": "Upa-yoga: neutro",
    "source": "UpaYoga.cs",
    "joints": {},
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-cara-a-la-derecha",
    "name": "Upa-yoga: cara a la derecha",
    "source": "UpaYoga.cs",
    "joints": { "Head": [-20, 70, 0] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-cara-a-la-izquierda",
    "name": "Upa-yoga: cara a la izquierda",
    "source": "UpaYoga.cs",
    "joints": { "Head": [-20, -70, 0] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-oreja-al-hombro-derecho",
    "name": "Upa-yoga: oreja al hombro derecho",
    "source": "UpaYoga.cs",
    "joints": { "Head": [0, 0, -40] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-oreja-al-hombro-izquierdo",
    "name": "Upa-yoga: oreja al hombro izquierdo",
    "source": "UpaYoga.cs",
    "joints": { "Head": [0, 0, 40] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-rueda-a-la-oreja-derecha",
    "name": "Upa-yoga: rueda a la oreja derecha",
    "source": "UpaYoga.cs",
    "joints": { "Head": [0, 0, -40] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-rueda-hacia-atras",
    "name": "Upa-yoga: rueda hacia atrás",
    "source": "UpaYoga.cs",
    "joints": { "Head": [-35, 0, 0] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-rueda-a-la-oreja-izquierda",
    "name": "Upa-yoga: rueda a la oreja izquierda",
    "source": "UpaYoga.cs",
    "joints": { "Head": [0, 0, 40] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-hombros-arriba-y-atras",
    "name": "Upa-yoga: hombros arriba y atrás",
    "source": "UpaYoga.cs",
    "joints": { "ScapulaLeft": [-15, 0, 20], "ScapulaRight": [-15, 0, -20] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-hombros-abajo-y-delante",
    "name": "Upa-yoga: hombros abajo y delante",
    "source": "UpaYoga.cs",
    "joints": { "ScapulaLeft": [15, 0, -10], "ScapulaRight": [15, 0, 10] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-hombros-arriba-y-delante",
    "name": "Upa-yoga: hombros arriba y delante",
    "source": "UpaYoga.cs",
    "joints": { "ScapulaLeft": [15, 0, 20], "ScapulaRight": [15, 0, -20] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  },
  {
    "id": "upa-yoga-hombros-abajo-y-atras",
    "name": "Upa-yoga: hombros abajo y atrás",
    "source": "UpaYoga.cs",
    "joints": { "ScapulaLeft": [-15, 0, -10], "ScapulaRight": [-15, 0, 10] },
    "rootHeight": null,
    "stanceWidth": null,
    "reaches": []
  }
];

export const COLD_SANCTUARY_SEQUENCES: readonly AsanaSequenceData[] = [
  {
    "id": "saludo-al-sol",
    "name": "Saludo al Sol (Surya Namaskar)",
    "source": "YogaSpells.cs · SunSalutation.Sequence",
    "steps": [
      { "asana": "pranamasana-oracion", "label": "Pranamasana (oración)", "phases": 3 },
      { "asana": "hasta-uttanasana-brazos-arriba", "label": "Hasta Uttanasana (brazos arriba)", "phases": 3 },
      { "asana": "uttanasana-flexion-adelante", "label": "Uttanasana (flexión adelante)", "phases": 3 },
      { "asana": "ashwa-sanchalanasana-zancada", "label": "Ashwa Sanchalanasana (zancada)", "phases": 3 },
      { "asana": "dandasana-plancha", "label": "Dandasana (plancha)", "phases": 3 },
      { "asana": "ashtanga-namaskara-ocho-miembros", "label": "Ashtanga Namaskara (ocho miembros)", "phases": 3 },
      { "asana": "bhujangasana-cobra", "label": "Bhujangasana (cobra)", "phases": 3 },
      { "asana": "adho-mukha-svanasana-perro-boca-abajo", "label": "Adho Mukha Svanasana (perro boca abajo)", "phases": 3 },
      { "asana": "ashwa-sanchalanasana-zancada-2", "label": "Ashwa Sanchalanasana (zancada)", "phases": 3 },
      { "asana": "uttanasana-flexion-adelante", "label": "Uttanasana (flexión adelante)", "phases": 3 },
      { "asana": "hasta-uttanasana-brazos-arriba", "label": "Hasta Uttanasana (brazos arriba)", "phases": 3 },
      { "asana": "pranamasana-oracion", "label": "Pranamasana (oración)", "phases": 3 }
    ]
  },
  {
    "id": "surya-namaskara-a",
    "name": "Surya Namaskara A (Ashtanga)",
    "source": "YogaSpells.cs · SunSalutation.AshtangaA",
    "steps": [
      { "asana": "samasthitih-de-pie", "label": "Samasthitih (de pie)", "phases": 2 },
      { "asana": "urdhva-vrksasana-brazos-arriba", "label": "Urdhva Vrksasana (brazos arriba)", "phases": 2 },
      { "asana": "uttanasana-flexion-adelante", "label": "Uttanasana (flexión adelante)", "phases": 2 },
      { "asana": "ardha-uttanasana-media-flexion", "label": "Ardha Uttanasana (media flexión)", "phases": 2 },
      { "asana": "chaturanga-dandasana", "label": "Chaturanga Dandasana", "phases": 2 },
      { "asana": "urdhva-mukha-svanasana-perro-boca-arriba", "label": "Urdhva Mukha Svanasana (perro boca arriba)", "phases": 2 },
      { "asana": "adho-mukha-svanasana-perro-boca-abajo", "label": "Adho Mukha Svanasana (perro boca abajo)", "phases": 10 },
      { "asana": "ardha-uttanasana-media-flexion", "label": "Ardha Uttanasana (media flexión)", "phases": 2 },
      { "asana": "uttanasana-flexion-adelante", "label": "Uttanasana (flexión adelante)", "phases": 2 },
      { "asana": "urdhva-vrksasana-brazos-arriba", "label": "Urdhva Vrksasana (brazos arriba)", "phases": 2 },
      { "asana": "samasthitih-de-pie", "label": "Samasthitih (de pie)", "phases": 2 }
    ]
  },
  {
    "id": "ashtanga-primaria",
    "name": "Ashtanga, Serie Primaria (núcleo)",
    "source": "AshtangaPrimary.cs",
    "steps": [
      { "asana": "padangusthasana-dedos-de-pie", "label": "Padangusthasana (dedos de pie)", "phases": 11 },
      { "asana": "utkatasana-silla", "label": "Utkatasana (silla)", "phases": 11 },
      { "asana": "virabhadrasana-i-guerrero-i", "label": "Virabhadrasana I (guerrero I)", "phases": 11 },
      { "asana": "prasarita-padottanasana-piernas-abiertas", "label": "Prasarita Padottanasana (piernas abiertas)", "phases": 11 },
      { "asana": "dandasana-baston", "label": "Dandasana (bastón)", "phases": 11 },
      { "asana": "paschimottanasana-pinza-sentada", "label": "Paschimottanasana (pinza sentada)", "phases": 11 },
      { "asana": "navasana-barca", "label": "Navasana (barca)", "phases": 11 },
      { "asana": "baddha-konasana-angulo-atado", "label": "Baddha Konasana (ángulo atado)", "phases": 11 },
      { "asana": "setu-bandhasana-puente", "label": "Setu Bandhasana (puente)", "phases": 11 },
      { "asana": "savasana-relajacion-final", "label": "Savasana (relajación final)", "phases": 15 }
    ]
  },
  {
    "id": "yoga-namaskar",
    "name": "Yoga Namaskar",
    "source": "YogaNamaskar.cs",
    "steps": [
      { "asana": "yoga-namaskar-de-pie-rezo-al-pecho", "label": "prepara: de pie, rezo al pecho", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza", "label": "inhala: rezo sobre la cabeza", "phases": 1 },
      { "asana": "yoga-namaskar-manos-a-la-nuca", "label": "exhala (ujjayi): manos a la nuca", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza", "label": "inhala: rezo sobre la cabeza", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-al-pecho", "label": "exhala (ujjayi): rezo al pecho", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza", "label": "inhala: rezo sobre la cabeza", "phases": 1 },
      { "asana": "yoga-namaskar-manos-a-la-nuca", "label": "exhala (ujjayi): manos a la nuca", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza", "label": "inhala: rezo sobre la cabeza", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-al-pecho", "label": "exhala (ujjayi): rezo al pecho", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza", "label": "inhala: rezo sobre la cabeza", "phases": 1 },
      { "asana": "yoga-namaskar-manos-a-la-nuca", "label": "exhala (ujjayi): manos a la nuca", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza", "label": "inhala: rezo sobre la cabeza", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-al-pecho-cuclillas", "label": "exhala (ujjayi): rezo al pecho, baja a cuclillas", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza-cuclillas", "label": "inhala: rezo sobre la cabeza (cuclillas)", "phases": 1 },
      { "asana": "yoga-namaskar-manos-a-la-nuca-cuclillas", "label": "exhala (ujjayi): manos a la nuca", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza-cuclillas", "label": "inhala: rezo sobre la cabeza", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-al-pecho-cuclillas", "label": "exhala (ujjayi): rezo al pecho", "phases": 1 },
      { "asana": "yoga-namaskar-brazos-al-frente-cuclillas", "label": "inhala: brazos al frente", "phases": 1 },
      { "asana": "yoga-namaskar-recoge-rezo-arriba-cuclillas", "label": "exhala (ujjayi): recoge, rezo arriba", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza-cuclillas", "label": "inhala: rezo sobre la cabeza (cuclillas)", "phases": 1 },
      { "asana": "yoga-namaskar-manos-a-la-nuca-cuclillas", "label": "exhala (ujjayi): manos a la nuca", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-sobre-la-cabeza-cuclillas", "label": "inhala: rezo sobre la cabeza", "phases": 1 },
      { "asana": "yoga-namaskar-rezo-al-pecho-cuclillas", "label": "exhala (ujjayi): rezo al pecho", "phases": 1 },
      { "asana": "yoga-namaskar-brazos-al-frente-cuclillas", "label": "inhala: brazos al frente", "phases": 1 },
      { "asana": "yoga-namaskar-recoge-rezo-arriba-cuclillas", "label": "exhala (ujjayi): recoge, rezo arriba", "phases": 1 },
      { "asana": "balasana-postura-del-nino", "label": "Balasana (postura del niño)", "phases": 15 }
    ]
  },
  {
    "id": "upa-yoga-cuello",
    "name": "Upa-yoga de cuello y hombros",
    "source": "UpaYoga.cs",
    "steps": [
      { "asana": "upa-yoga-barbilla-al-pecho", "label": "exhala: barbilla al pecho", "phases": 1 },
      { "asana": "upa-yoga-cabeza-atras", "label": "inhala: cabeza atrás", "phases": 1 },
      { "asana": "upa-yoga-barbilla-al-pecho", "label": "exhala: barbilla al pecho", "phases": 1 },
      { "asana": "upa-yoga-cabeza-atras", "label": "inhala: cabeza atrás", "phases": 1 },
      { "asana": "upa-yoga-barbilla-al-pecho", "label": "exhala: barbilla al pecho", "phases": 1 },
      { "asana": "upa-yoga-cabeza-atras", "label": "inhala: cabeza atrás", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: cuello recto", "phases": 1 },
      { "asana": "upa-yoga-cara-a-la-derecha", "label": "inhala: cara a la derecha", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: al frente", "phases": 1 },
      { "asana": "upa-yoga-cara-a-la-izquierda", "label": "inhala: cara a la izquierda", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: al frente", "phases": 1 },
      { "asana": "upa-yoga-cara-a-la-derecha", "label": "inhala: cara a la derecha", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: al frente", "phases": 1 },
      { "asana": "upa-yoga-cara-a-la-izquierda", "label": "inhala: cara a la izquierda", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: al frente", "phases": 1 },
      { "asana": "upa-yoga-cara-a-la-derecha", "label": "inhala: cara a la derecha", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: al frente", "phases": 1 },
      { "asana": "upa-yoga-cara-a-la-izquierda", "label": "inhala: cara a la izquierda", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: al frente", "phases": 1 },
      { "asana": "upa-yoga-oreja-al-hombro-derecho", "label": "exhala: oreja al hombro derecho", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "inhala: cabeza arriba", "phases": 1 },
      { "asana": "upa-yoga-oreja-al-hombro-izquierdo", "label": "exhala: oreja al hombro izquierdo", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "inhala: cabeza arriba", "phases": 1 },
      { "asana": "upa-yoga-oreja-al-hombro-derecho", "label": "exhala: oreja al hombro derecho", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "inhala: cabeza arriba", "phases": 1 },
      { "asana": "upa-yoga-oreja-al-hombro-izquierdo", "label": "exhala: oreja al hombro izquierdo", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "inhala: cabeza arriba", "phases": 1 },
      { "asana": "upa-yoga-oreja-al-hombro-derecho", "label": "exhala: oreja al hombro derecho", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "inhala: cabeza arriba", "phases": 1 },
      { "asana": "upa-yoga-oreja-al-hombro-izquierdo", "label": "exhala: oreja al hombro izquierdo", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "inhala: cabeza arriba", "phases": 1 },
      { "asana": "upa-yoga-barbilla-al-pecho", "label": "exhala: barbilla al pecho", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-derecha", "label": "inhala: rueda a la oreja derecha", "phases": 1 },
      { "asana": "upa-yoga-rueda-hacia-atras", "label": "inhala: rueda hacia atrás", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-izquierda", "label": "exhala: rueda a la oreja izquierda", "phases": 1 },
      { "asana": "upa-yoga-barbilla-al-pecho", "label": "exhala: barbilla al pecho", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-derecha", "label": "inhala: rueda a la oreja derecha", "phases": 1 },
      { "asana": "upa-yoga-rueda-hacia-atras", "label": "inhala: rueda hacia atrás", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-izquierda", "label": "exhala: rueda a la oreja izquierda", "phases": 1 },
      { "asana": "upa-yoga-barbilla-al-pecho", "label": "exhala: barbilla al pecho", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-derecha", "label": "inhala: rueda a la oreja derecha", "phases": 1 },
      { "asana": "upa-yoga-rueda-hacia-atras", "label": "inhala: rueda hacia atrás", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-izquierda", "label": "exhala: rueda a la oreja izquierda", "phases": 1 },
      { "asana": "upa-yoga-barbilla-al-pecho", "label": "exhala: barbilla al pecho", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-izquierda", "label": "inhala: rueda a la oreja izquierda", "phases": 1 },
      { "asana": "upa-yoga-rueda-hacia-atras", "label": "inhala: rueda hacia atrás", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-derecha", "label": "exhala: rueda a la oreja derecha", "phases": 1 },
      { "asana": "upa-yoga-barbilla-al-pecho", "label": "exhala: barbilla al pecho", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-izquierda", "label": "inhala: rueda a la oreja izquierda", "phases": 1 },
      { "asana": "upa-yoga-rueda-hacia-atras", "label": "inhala: rueda hacia atrás", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-derecha", "label": "exhala: rueda a la oreja derecha", "phases": 1 },
      { "asana": "upa-yoga-barbilla-al-pecho", "label": "exhala: barbilla al pecho", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-izquierda", "label": "inhala: rueda a la oreja izquierda", "phases": 1 },
      { "asana": "upa-yoga-rueda-hacia-atras", "label": "inhala: rueda hacia atrás", "phases": 1 },
      { "asana": "upa-yoga-rueda-a-la-oreja-derecha", "label": "exhala: rueda a la oreja derecha", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: cuello recto", "phases": 1 },
      { "asana": "upa-yoga-hombros-arriba-y-atras", "label": "inhala: hombros arriba y atrás", "phases": 1 },
      { "asana": "upa-yoga-hombros-abajo-y-delante", "label": "exhala: hombros abajo y delante", "phases": 1 },
      { "asana": "upa-yoga-hombros-arriba-y-atras", "label": "inhala: hombros arriba y atrás", "phases": 1 },
      { "asana": "upa-yoga-hombros-abajo-y-delante", "label": "exhala: hombros abajo y delante", "phases": 1 },
      { "asana": "upa-yoga-hombros-arriba-y-atras", "label": "inhala: hombros arriba y atrás", "phases": 1 },
      { "asana": "upa-yoga-hombros-abajo-y-delante", "label": "exhala: hombros abajo y delante", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: hombros neutros", "phases": 1 },
      { "asana": "upa-yoga-hombros-arriba-y-delante", "label": "inhala: hombros arriba y delante", "phases": 1 },
      { "asana": "upa-yoga-hombros-abajo-y-atras", "label": "exhala: hombros abajo y atrás", "phases": 1 },
      { "asana": "upa-yoga-hombros-arriba-y-delante", "label": "inhala: hombros arriba y delante", "phases": 1 },
      { "asana": "upa-yoga-hombros-abajo-y-atras", "label": "exhala: hombros abajo y atrás", "phases": 1 },
      { "asana": "upa-yoga-hombros-arriba-y-delante", "label": "inhala: hombros arriba y delante", "phases": 1 },
      { "asana": "upa-yoga-hombros-abajo-y-atras", "label": "exhala: hombros abajo y atrás", "phases": 1 },
      { "asana": "upa-yoga-neutro", "label": "exhala: hombros neutros", "phases": 1 }
    ]
  }
];

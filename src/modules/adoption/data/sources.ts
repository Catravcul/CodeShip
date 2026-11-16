/** Sources for the species catalogue that are not already in the sanctuary's (SANCTUARY_SRC). Checked 2026-11-16. */
export const ADOPTION_SRC = {
  /** JAXA, Aquatic Habitat (AQH) on Kibo: two aquariums of 150 × 70 × 70 mm (0.7 L each), 3.2 L in the closed loop, 25–30 °C, LEDs with a light/dark cycle within 24 h, up to 90 days; for medaka or zebrafish. */
  aqh: "https://iss.jaxa.jp/en/kiboexp/pm/aqh",
  /** ScienceDaily 2012 (NASA): the AQH flew to the ISS in 2012 with medaka for its first experiments; bacteria filter for ammonia. */
  aqhMedaka: "https://www.sciencedaily.com/releases/2012/07/120725183634.htm",
  /** Spaceflight101, Rodent Habitat (NASA Rodent Research): up to ten mice in two sides, food bars and water loaded for the whole study, lights on a timer, no active thermal control (ISS ambient), studies of one to three months. */
  rodentHabitat: "https://spaceflight101.com/iss/?p=600",
  /** Félicette: a cat flown on a French Véronique sounding rocket (18 Oct. 1963), ~15 min with ~5 min of weightlessness; recovered alive. */
  felicette: "https://en.wikipedia.org/wiki/F%C3%A9licette",
  /** Belka and Strelka: dogs that spent a day in orbit on Korabl-Sputnik 2 (Aug. 1960) and came back alive; the Soviet space dogs were small strays. */
  belkaStrelka: "https://en.wikipedia.org/wiki/Belka_and_Strelka",
  /** Soviet space dogs: chosen among strays of 6–7 kg, used to hardship; Laika (Sputnik 2, 1957) did not come back. */
  sovietDogs: "https://en.wikipedia.org/wiki/Soviet_space_dogs",
  /** Animals in space: chicken embryos (STS-29, 1989), Japanese quail hatched on Mir (1990), mice and others. */
  animalsInSpace: "https://en.wikipedia.org/wiki/Animals_in_space",
  /** STS-29 (1989): a student experiment flew fertilised chicken eggs to study embryo development in orbit. */
  sts29: "https://en.wikipedia.org/wiki/STS-29",
  /** Ronca et al. 2019, Scientific Reports 9:4717: mice on the ISS stayed active and young ones began «race-tracking» laps of their habitat. */
  miceIss: "https://www.nature.com/articles/s41598-019-40789-y",
  /** Domestic cat: obligate carnivore, ~4 kg; breeds differ in size and coat. */
  cat: "https://en.wikipedia.org/wiki/Cat",
  /** Siamese: slender short-haired breed, vocal and social. */
  siamese: "https://en.wikipedia.org/wiki/Siamese_cat",
  /** Maine Coon: one of the largest domestic breeds (males 6–8 kg), dense water-resistant coat. */
  maineCoon: "https://en.wikipedia.org/wiki/Maine_Coon",
  /** Chihuahua: the smallest dog breed (1,5–3 kg), sensitive to cold. */
  chihuahua: "https://en.wikipedia.org/wiki/Chihuahua_(dog_breed)",
  /** Chicken: a domestic hen lays up to ~300 eggs a year with ≥ 14 h of light. */
  chicken: "https://en.wikipedia.org/wiki/Chicken",
  /** Leghorn: light white laying breed, rarely broody. */
  leghorn: "https://en.wikipedia.org/wiki/Leghorn_chicken",
  /** Silkie: small fluffy breed known for going broody and fostering other birds' chicks. */
  silkie: "https://en.wikipedia.org/wiki/Silkie",
  /** Japanese quail: small, lays from ~6 weeks; a laboratory bird. */
  quail: "https://en.wikipedia.org/wiki/Japanese_quail",
  /** House mouse (Mus musculus): laboratory strains, housed at 20–26 °C. */
  mouse: "https://en.wikipedia.org/wiki/House_mouse",
  /** Japanese rice fish: wild type grey-brown; orange «himedaka»; inbred Hd-rR line sequenced in 2007. */
  medaka: "https://en.wikipedia.org/wiki/Japanese_rice_fish",
  /** Mummichog (Fundulus heteroclitus): a euryhaline killifish of salt marshes. */
  mummichog: "https://en.wikipedia.org/wiki/Mummichog",
  /** Oyster toadfish (Opsanus tau): a hardy bottom fish used to study the inner ear; flown on the Space Shuttle. */
  toadfish: "https://en.wikipedia.org/wiki/Oyster_toadfish",
  /** Amano shrimp (Caridina multidentata): an algae eater whose larvae need brackish water (they do not breed in fresh water). */
  amano: "https://en.wikipedia.org/wiki/Caridina_multidentata",
  /** ʻŌpaeʻula (Halocaridina rubra): the red shrimp of anchialine pools, the one sealed in EcoSpheres. */
  halocaridina: "https://en.wikipedia.org/wiki/Halocaridina_rubra",
  /** Common pill woodlouse (Armadillidium vulgare): rolls into a ball; a detritivore. */
  pillbug: "https://en.wikipedia.org/wiki/Armadillidium_vulgare",
  /** ISO 11267: the standard soil-toxicity test counts the offspring of Folsomia candida in 28 days. */
  iso11267: "https://www.iso.org/standard/57458.html",
  /** Two-spotted cricket (Gryllus bimaculatus): a laboratory and feeder cricket. */
  gryllus: "https://en.wikipedia.org/wiki/Gryllus_bimaculatus",
  /** Superworm (Zophobas morio): larvae can eat polystyrene (Sun et al. 2022, Microbial Genomics). */
  superworm: "https://en.wikipedia.org/wiki/Zophobas_morio",
  /** Common earthworm (Lumbricus terrestris): deep burrows; prefers cool soil. */
  nightcrawler: "https://en.wikipedia.org/wiki/Lumbricus_terrestris",
  /** Biomphalaria glabrata: parasite-free laboratory lines (and albino ones) are kept for research. */
  biomphalaria: "https://en.wikipedia.org/wiki/Biomphalaria_glabrata",
} as const;

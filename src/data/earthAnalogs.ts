import type { EarthAnalogSite } from '../types/analog';

export const EARTH_ANALOG_SITES: EarthAnalogSite[] = [
  // WELL-KNOWN ANALOGS (6)
  {
    id: 'haughton-crater',
    name: 'Haughton Impact Structure',
    region: 'Devon Island, Nunavut',
    country: 'Canada',
    lat: 75.383,
    lon: -89.683,
    tier: 'well-known',
    summary:
      '23 km Miocene impact crater in polar desert carbonate/gneiss bedrock with perennial permafrost, gullies, and multi-year NASA HMP rover operations.',
    discoveryRationale:
      'Premier Arctic Mars polar & impact-breccia testbed used by NASA Haughton-Mars Project for EVA, drilling, and pressurized rover trials.',
    primaryTargets: ['mars', 'moon'],
    useCases: ['Rover Mobility', 'Drilling & ISRU', 'Astrobiology'],
    geology: {
      rockTypes: ['impact melt breccia', 'dolomite carbonate', 'impact-shocked gneiss'],
      minerals: ['carbonate', 'sulfate', 'impact breccia', 'gypsum', 'quartz'],
      craterOrigin: true,
      weatheringState: 'Minimal chemical weathering due to polar freeze-thaw regime',
      description: 'Polylithic impact breccia sheet overlying Paleozoic carbonates with hydrothermal vent pipes.',
      provenance: 'archived',
      source: 'Osinski et al. (2005), Meteoritics & Planetary Science; NASA HMP'
    },
    topography: {
      elevationM: 210,
      meanSlopeDeg: 5.2,
      roughnessIndex: 0.44,
      craterDensityAnalog: 82,
      terrainNotes: 'Concentric crater ring ridges, melt-sheet mounds, and periglacial polygon troughs.',
      provenance: 'archived',
      source: 'Copernicus DEM / NASA HMP Field Survey'
    },
    temperature: {
      archivedAnnualMeanC: -16.2,
      archivedMinC: -44.0,
      archivedMaxC: 11.5,
      archivedDiurnalSwingC: 9.8,
      solarIrradianceNotes: 'Extreme seasonal polar day/night cycle mirrors high-latitude Mars & lunar polar obliquity logistics.',
      provenance: 'archived',
      source: 'Environment Canada Resolute/Devon Arctic Climatology (1991–2020)'
    },
    waterIce: {
      aridityIndex: 0.19,
      annualPrecipMm: 135,
      subsurfaceIceScore: 91,
      iceMechanism: 'Continuous permafrost starting 0.3–0.7 m below active freeze-thaw regolith layer.',
      provenance: 'archived',
      source: 'NSIDC Circumpolar Active Layer Monitoring / Pollard et al.'
    },
    dust: {
      regolithDustHazardScore: 52,
      particleComposition: 'Fine pulverized carbonate & breccia silt whipped during dry summer winds.',
      proxyExplanation:
        'Atmospheric PM10/dust aerosol measurements serve only as a terrestrial transport proxy; Haughton silt lacks lunar electrostatic glass or Martian perchlorates.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + HMP Field Reports'
    },
    cavesTubes: {
      tubePresenceScore: 8,
      systemName: 'None (open crater & shallow ice wedges)',
      documentedLengthM: null,
      structuralNotes: 'Surface impact crater analog; lacks intact volcanic lava tubes.',
      provenance: 'archived',
      source: 'Geological Survey of Canada'
    },
    biology: {
      extremophileScore: 85,
      organisms: ['Chroococcidiopsis', 'Psychrobacter', 'Cryptoendolithic cyanobacteria'],
      metabolicStrategy: 'Endolithic colonization inside impact-shocked translucent gypsum & gneiss.',
      ncbiQuery: '"Haughton" AND ("Devon Island" OR "impact") AND ("extremophile" OR "Mars")',
      provenance: 'archived',
      source: 'Cockell et al. (2002), Astrobiology'
    },
    exploration: {
      roverMobilityScore: 86,
      landingFlatnessScore: 76,
      drillingIsruScore: 90,
      habitatConstructionScore: 78,
      engineeringNotes: 'Proven multi-week pressurized rover traverses, rotary-percussive permafrost drilling, and EVA dust suits.',
      provenance: 'archived',
      source: 'Lee et al. (2007), NASA Haughton-Mars Project'
    },
    limitations: [
      'Dominated by sedimentary dolomite/limestone rather than lunar anorthosite or Martian flood basalts.',
      '1 bar terrestrial atmosphere permits convective cooling and water-vapor frost absent on the Moon.',
      'Earth 1g gravity alters regolith traction and borehole cuttings clearing relative to 0.165g / 0.38g.'
    ],
    citations: [
      { title: 'Haughton Impact Structure: Mars Analog Operations & Permafrost', source: 'NASA HMP / Lee et al.', year: 2007 },
      { title: 'Endolithic habitats in impact-shocked rocks at Haughton', source: 'Cockell et al., Astrobiology', year: 2002 }
    ]
  },
  {
    id: 'atacama-yungay',
    name: 'Yungay Core, Atacama Desert',
    region: 'Antofagasta Region',
    country: 'Chile',
    lat: -24.083,
    lon: -69.917,
    tier: 'well-known',
    summary:
      'Hyper-arid core of the Atacama with virtually zero rainfall, natural nitrate/perchlorate salts, UV radiation extremes, and Mars-like regolith pavement.',
    discoveryRationale:
      'Gold-standard geochemical and astrobiological analog for Mars surface oxidation, perchlorate toxicity, and autonomous rover testing.',
    primaryTargets: ['mars'],
    useCases: ['Rover Mobility', 'Astrobiology', 'Dust Mitigation'],
    geology: {
      rockTypes: ['alluvial evaporite crust', 'andesitic/basaltic cobbles', 'nitrate caliche'],
      minerals: ['perchlorate', 'sulfate', 'gypsum', 'halite', 'hematite', 'smectite clay'],
      craterOrigin: false,
      weatheringState: 'Hyper-arid salt-cemented duricrust preserved for >2 Myr',
      description: 'Nitrate-, sulfate-, and perchlorate-enriched desert pavement mirroring Martian regolith salts.',
      provenance: 'archived',
      source: 'Navarro-González et al. (2003), Science 302'
    },
    topography: {
      elevationM: 980,
      meanSlopeDeg: 2.3,
      roughnessIndex: 0.24,
      craterDensityAnalog: 15,
      terrainNotes: 'Broad deflation plains, desert pavement, and dry alluvial fans ideal for long-range rover autonomy.',
      provenance: 'archived',
      source: 'SRTM / Copernicus DEM'
    },
    temperature: {
      archivedAnnualMeanC: 16.5,
      archivedMinC: 0.5,
      archivedMaxC: 34.0,
      archivedDiurnalSwingC: 23.5,
      solarIrradianceNotes: 'High solar insolation and thin coastal-blocked humidity produce strong diurnal surface heating.',
      provenance: 'archived',
      source: 'McKay et al. (2003), Astrobiology'
    },
    waterIce: {
      aridityIndex: 0.01,
      annualPrecipMm: 2,
      subsurfaceIceScore: 18,
      iceMechanism: 'Essentially anhydrous; trace moisture bound only as deliquescent halite/gypsum hydration.',
      provenance: 'archived',
      source: 'McKay et al. (2003), Astrobiology'
    },
    dust: {
      regolithDustHazardScore: 81,
      particleComposition: 'Fine sulfate-chlorate evaporite dust and iron-oxide silt.',
      proxyExplanation:
        'Live PM10/mineral dust values represent wind-suspended aerosols as a field-logistics proxy; Earth wind shear differs from Mars 6 mbar dust storms.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + NASA ARADS'
    },
    cavesTubes: {
      tubePresenceScore: 5,
      systemName: 'None (alluvial plain)',
      documentedLengthM: null,
      structuralNotes: 'Surface regolith testbed without volcanic cave architecture.',
      provenance: 'archived',
      source: 'SERNAGEOMIN Chile'
    },
    biology: {
      extremophileScore: 95,
      organisms: ['Deinococcus radiodurans', 'Chroococcidiopsis', 'Actinobacteria', 'Halophilic archaea'],
      metabolicStrategy: 'Extreme desiccation/UV survival via salt deliquescence and DNA-repair pathways.',
      ncbiQuery: '"Yungay" AND "Atacama" AND ("Mars" OR "perchlorate" OR "extremophile")',
      provenance: 'archived',
      source: 'Navarro-González et al. (2003); Warren-Rhodes et al.'
    },
    exploration: {
      roverMobilityScore: 94,
      landingFlatnessScore: 93,
      drillingIsruScore: 72,
      habitatConstructionScore: 68,
      engineeringNotes: 'Site of NASA Zoë, KREX, and ARADS drilling rovers testing life-detection drills and salt-crust mobility.',
      provenance: 'archived',
      source: 'Glass et al. (2018), NASA ARADS'
    },
    limitations: [
      'Mean temperature (+16.5 °C) is ~80 °C warmer than Martian equator/mid-latitudes (−63 °C).',
      'Lacks cryogenic permafrost and impact crater topography.',
      'Higher atmospheric pressure (900+ mbar) alters dust settling velocity and aerodynamic cooling.'
    ],
    citations: [
      { title: 'Mars-Like Soils in the Atacama Desert, Chile, and the Dry Limit of Microbial Life', source: 'Navarro-González et al., Science', year: 2003 },
      { title: 'Atacama Rover Astrobiology Drilling Studies (ARADS)', source: 'NASA Ames Research Center', year: 2019 }
    ]
  },
  {
    id: 'mauna-loa-hiseas',
    name: 'Mauna Loa Basalt Saddle (HI-SEAS)',
    region: 'Hawaiʻi Island, Hawaiʻi',
    country: 'United States',
    lat: 19.536,
    lon: -155.576,
    tier: 'well-known',
    summary:
      'High-altitude (2,500 m) barren tholeiitic basaltic lava fields with volcanic tephra, cinder cones, and documented lava tube networks.',
    discoveryRationale:
      'Iconic NASA HI-SEAS habitat site and basaltic regolith/lava-tube analog for both lunar mare and Martian shield volcanism.',
    primaryTargets: ['moon', 'mars'],
    useCases: ['Habitat & Tubes', 'Rover Mobility', 'Drilling & ISRU', 'Dust Mitigation'],
    geology: {
      rockTypes: ['tholeiitic basalt', 'aa & pahoehoe flows', 'volcanic tephra', 'scoria'],
      minerals: ['basalt', 'olivine', 'plagioclase', 'pyroxene', 'ilmenite', 'volcanic glass'],
      craterOrigin: false,
      weatheringState: 'Young Holocene basalt flows with minimal vegetation above 2,400 m',
      description: 'Mafic olivine-plagioclase basalt closely matching JSC-1A lunar mare and Mars Pathfinder basalt chemistry.',
      provenance: 'archived',
      source: 'USGS Hawaiian Volcano Observatory; Seiferlin et al.'
    },
    topography: {
      elevationM: 2520,
      meanSlopeDeg: 6.4,
      roughnessIndex: 0.68,
      craterDensityAnalog: 35,
      terrainNotes: 'Blocky aa clinker fields, smooth pahoehoe slabs, spatter cones, and collapsed tube skylights.',
      provenance: 'archived',
      source: 'USGS 10m DEM / HI-SEAS Mapping'
    },
    temperature: {
      archivedAnnualMeanC: 9.8,
      archivedMinC: -2.5,
      archivedMaxC: 24.0,
      archivedDiurnalSwingC: 15.2,
      solarIrradianceNotes: 'High-altitude clear-sky UV and thin dry trade-inversion air.',
      provenance: 'archived',
      source: 'NOAA Mauna Loa Observatory Climatology'
    },
    waterIce: {
      aridityIndex: 0.25,
      annualPrecipMm: 450,
      subsurfaceIceScore: 12,
      iceMechanism: 'Permeable basalt drains rainfall rapidly; no permafrost at 2,500 m saddle.',
      provenance: 'archived',
      source: 'NOAA / USGS Hawaiʻi Hydrogeology'
    },
    dust: {
      regolithDustHazardScore: 79,
      particleComposition: 'Sharp, abrasive basaltic glass ash & tephra fines.',
      proxyExplanation:
        'Tephra fines mimic mechanical abrasion of lunar mare regolith; atmospheric PM10 measures background trade dust/vog as a live operational proxy.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + PISCES / NASA Regolith Simulant Studies'
    },
    cavesTubes: {
      tubePresenceScore: 88,
      systemName: 'Mauna Loa / Saddle Lava Tube Complex',
      documentedLengthM: 4200,
      structuralNotes: 'Intact basaltic lava tubes and collapse skylights ideal for EVA cave-mapping and pressurized habitat concepts.',
      provenance: 'archived',
      source: 'USGS / HI-SEAS Cave Survey'
    },
    biology: {
      extremophileScore: 68,
      organisms: ['Acidobacteria', 'Chemolithoautotrophic Fe-oxidizers', 'Nitrifying biofilms'],
      metabolicStrategy: 'Oligotrophic microbial colonization on fresh basaltic glass surfaces.',
      ncbiQuery: '"Mauna Loa" AND ("basalt" OR "lava tube") AND ("microbial" OR "Mars")',
      provenance: 'archived',
      source: 'Cockell et al.; Gomez et al.'
    },
    exploration: {
      roverMobilityScore: 82,
      landingFlatnessScore: 55,
      drillingIsruScore: 87,
      habitatConstructionScore: 92,
      engineeringNotes: 'Tested for regolith sintering, landing-pad paver construction (PISCES), and long-duration crewed habitat confinement.',
      provenance: 'archived',
      source: 'NASA HI-SEAS / PISCES Hawaiʻi'
    },
    limitations: [
      'Tropical oceanic moisture & periodic rainfall weather basalt faster than dry lunar/Martian environments.',
      'Lacks hypervelocity impact shock features (brecciation, agglutinates).',
      'Earth gravity & 750 mbar air pressure simplify thermal rejection compared to vacuum.'
    ],
    citations: [
      { title: 'HI-SEAS Long-Duration Mars & Moon Simulation Analog', source: 'NASA HRP / Univ. of Hawaiʻi', year: 2020 },
      { title: 'Basaltic Regolith Simulants & Sintering Pad Construction', source: 'PISCES / NASA Kennedy Space Center', year: 2018 }
    ]
  },
  {
    id: 'craters-of-the-moon',
    name: 'Craters of the Moon Basalt Rift',
    region: 'Snake River Plain, Idaho',
    country: 'United States',
    lat: 43.416,
    lon: -113.562,
    tier: 'well-known',
    summary:
      'Expansive Holocene basaltic rift zone with cinder cones, volcanic craters, pahoehoe plains, and accessible lava tubes trained on since the Apollo era.',
    discoveryRationale:
      'Historic Apollo 14 astronaut geology training site and NASA BASALT field testbed for human-robotic volcanology.',
    primaryTargets: ['moon', 'mars'],
    useCases: ['Habitat & Tubes', 'Rover Mobility', 'Drilling & ISRU'],
    geology: {
      rockTypes: ['alkali basalt', 'pahoehoe & block lava', 'pyroclastic cinder'],
      minerals: ['basalt', 'plagioclase', 'olivine', 'ilmenite', 'pyroxene', 'volcanic glass'],
      craterOrigin: false,
      weatheringState: 'Unweathered Holocene lava flows (2,000–15,000 yr)',
      description: 'Fe-rich Snake River basaltic flows with volcanic glass rind and pyroclastic cones.',
      provenance: 'archived',
      source: 'Kuntz et al. (1992), USGS; NASA BASALT'
    },
    topography: {
      elevationM: 1790,
      meanSlopeDeg: 4.9,
      roughnessIndex: 0.56,
      craterDensityAnalog: 45,
      terrainNotes: 'Rift craters, pressure ridges, and ropey basalt surfaces matching mare plains.',
      provenance: 'archived',
      source: 'USGS 3DEP 10m DEM'
    },
    temperature: {
      archivedAnnualMeanC: 5.8,
      archivedMinC: -18.5,
      archivedMaxC: 31.0,
      archivedDiurnalSwingC: 17.4,
      solarIrradianceNotes: 'High-desert continental climate with sub-freezing winters.',
      provenance: 'archived',
      source: 'NOAA Western Regional Climate Center'
    },
    waterIce: {
      aridityIndex: 0.22,
      annualPrecipMm: 380,
      subsurfaceIceScore: 48,
      iceMechanism: 'Seasonal-to-perennial cold-trap ice persists inside deep lava caves (e.g., Boy Scout Cave).',
      provenance: 'archived',
      source: 'NPS Craters of the Moon Hydrology'
    },
    dust: {
      regolithDustHazardScore: 61,
      particleComposition: 'Crushed scoria and basaltic cinders with moderate windborne loess.',
      proxyExplanation:
        'Live airborne dust/PM10 reflects regional Snake River dust episodes; volcanic cinder abrasion serves as an engineering proxy.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + USGS'
    },
    cavesTubes: {
      tubePresenceScore: 86,
      systemName: 'Indian Tunnel & Arco Rift Tubes',
      documentedLengthM: 2500,
      structuralNotes: 'Large-diameter collapse skylights and multi-hundred-meter basaltic tunnels with ice pockets.',
      provenance: 'archived',
      source: 'NPS / NASA FINESSE & BASALT'
    },
    biology: {
      extremophileScore: 71,
      organisms: ['Endolithic fungi', 'Actinobacteria', 'Basalt-weathering chemotrophs'],
      metabolicStrategy: 'Dark-cave biofilm and dry vesicular basalt colonization.',
      ncbiQuery: '"Craters of the Moon" AND ("basalt" OR "lava") AND ("microbial" OR "analog")',
      provenance: 'archived',
      source: 'Lim et al. (2019), NASA BASALT, Astrobiology'
    },
    exploration: {
      roverMobilityScore: 80,
      landingFlatnessScore: 68,
      drillingIsruScore: 84,
      habitatConstructionScore: 86,
      engineeringNotes: 'Active NASA FINESSE/BASALT field lab testing time-delayed EVA science ops and tube LiDAR mapping.',
      provenance: 'archived',
      source: 'Lim et al. (2019), Astrobiology'
    },
    limitations: [
      'Craters are volcanic pit/cinder vents rather than hypervelocity impact craters.',
      'Winter snowfall and sparse desert sagebrush introduce terrestrial organics.',
      'Higher gravity and atmosphere modify pyroclastic ejecta sorting.'
    ],
    citations: [
      { title: 'NASA BASALT Research Program: Human-Robotic Exploration at Craters of the Moon', source: 'Lim et al., Astrobiology', year: 2019 }
    ]
  },
  {
    id: 'rio-tinto',
    name: 'Río Tinto Acidic Basin',
    region: 'Andalusia, Huelva',
    country: 'Spain',
    lat: 37.705,
    lon: -6.551,
    tier: 'well-known',
    summary:
      'Iron- and sulfur-rich acidic fluvial basin depositing jarosite, hematite, and goethite—the exact mineral assemblage discovered by Mars Opportunity at Meridiani.',
    discoveryRationale:
      'World benchmark for Martian acid-sulfate aqueous mineralogy, subsurface chemolithoautotrophic biosignatures, and life-detection drilling.',
    primaryTargets: ['mars'],
    useCases: ['Astrobiology', 'Drilling & ISRU'],
    geology: {
      rockTypes: ['massive sulfide gossan', 'ferricrete terraces', 'volcanic-hosted sulfide'],
      minerals: ['jarosite', 'hematite', 'sulfate', 'pyrite', 'phyllosilicate', 'goethite'],
      craterOrigin: false,
      weatheringState: 'Active acid rock drainage producing Mars-analog ferric sulfates',
      description: 'Natural Fe-S hydrothermal system yielding jarosite and hematite concretions.',
      provenance: 'archived',
      source: 'Fernández-Remolar et al. (2005), EPSL 240'
    },
    topography: {
      elevationM: 315,
      meanSlopeDeg: 7.1,
      roughnessIndex: 0.49,
      craterDensityAnalog: 10,
      terrainNotes: 'Incised terraced valleys and mined benches exposing stratified gossan profiles.',
      provenance: 'archived',
      source: 'Copernicus DEM'
    },
    temperature: {
      archivedAnnualMeanC: 17.8,
      archivedMinC: 4.0,
      archivedMaxC: 37.0,
      archivedDiurnalSwingC: 14.5,
      solarIrradianceNotes: 'Mediterranean semi-arid summers; mild wet winters.',
      provenance: 'archived',
      source: 'AEMET Huelva Station Climatology'
    },
    waterIce: {
      aridityIndex: 0.42,
      annualPrecipMm: 610,
      subsurfaceIceScore: 5,
      iceMechanism: 'Perennial acidic surface & groundwater (pH 1.5–2.5); analog for ancient Noachian wet Mars, not modern ice.',
      provenance: 'archived',
      source: 'Amils et al. (2007), Planetary & Space Science'
    },
    dust: {
      regolithDustHazardScore: 58,
      particleComposition: 'Oxidized ferric sulfate and iron-oxide fines.',
      proxyExplanation:
        'Surface ferric dust composition resembles Mars oxidized dust, while live air-quality PM10 reflects ambient Mediterranean dust only.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + CAB Spain'
    },
    cavesTubes: {
      tubePresenceScore: 15,
      systemName: 'Subsurface Gossan & Drilling Boreholes (MARTE)',
      documentedLengthM: null,
      structuralNotes: 'No natural lava tubes; extensive deep borehole subsurface observatory (IPBSL).',
      provenance: 'archived',
      source: 'NASA MARTE Project'
    },
    biology: {
      extremophileScore: 98,
      organisms: ['Acidithiobacillus ferrooxidans', 'Leptospirillum ferrooxidans', 'Acidiphilium'],
      metabolicStrategy: 'Subsurface iron- and sulfur-oxidizing chemolithoautotrophy independent of sunlight.',
      ncbiQuery: '"Rio Tinto" AND ("jarosite" OR "Acidithiobacillus") AND ("Mars" OR "astrobiology")',
      provenance: 'archived',
      source: 'Amils et al. (2007); Stoker et al. (2008), NASA MARTE'
    },
    exploration: {
      roverMobilityScore: 70,
      landingFlatnessScore: 45,
      drillingIsruScore: 92,
      habitatConstructionScore: 42,
      engineeringNotes: 'Site of NASA/CAB MARTE autonomous subsurface rotary core drilling campaigns down to 160 m.',
      provenance: 'archived',
      source: 'Stoker et al. (2008), Astrobiology'
    },
    limitations: [
      'Liquid acidic water and warm Mediterranean climate do not match modern frozen Martian conditions.',
      'Modified by 5,000 years of human mining activity.',
      'Not an impact crater or volcanic lava tube site.'
    ],
    citations: [
      { title: 'Extreme environments as Mars terrestrial analogs: The Rio Tinto case', source: 'Amils et al., Planetary & Space Science', year: 2007 },
      { title: 'The 2005 MARTE Robotic Drilling Experiment in Río Tinto', source: 'Stoker et al., Astrobiology', year: 2008 }
    ]
  },
  {
    id: 'mcmurdo-dry-valleys',
    name: 'University Valley, McMurdo Dry Valleys',
    region: 'Quartermain Mountains, Victoria Land',
    country: 'Antarctica',
    lat: -77.862,
    lon: 160.703,
    tier: 'well-known',
    summary:
      'Coldest, driest Antarctic ice-free valley featuring dry permafrost overlying massive ground ice within 20–50 cm—directly matching Phoenix & Arcadia Mars ice tables.',
    discoveryRationale:
      'Closest terrestrial thermal and sublimation-lag ground-ice analog for Martian northern plains (Arcadia Planitia) and lunar polar regolith.',
    primaryTargets: ['mars', 'moon'],
    useCases: ['Drilling & ISRU', 'Astrobiology', 'Dust Mitigation'],
    geology: {
      rockTypes: ['Beacon sandstone', 'Ferrar dolerite (diabase)', 'granitic moraine'],
      minerals: ['pyroxene', 'plagioclase', 'quartz', 'perchlorate', 'sulfate', 'subsurface water ice'],
      craterOrigin: false,
      weatheringState: 'Hyper-arid cryogenic salt weathering; zero liquid water runoff in upper valley',
      description: 'Dolerite-sandstone regolith with polygonal patterned ground and trace perchlorates.',
      provenance: 'archived',
      source: 'Tamppari et al. (2012), Antarctic Science; McKay et al.'
    },
    topography: {
      elevationM: 1680,
      meanSlopeDeg: 4.5,
      roughnessIndex: 0.34,
      craterDensityAnalog: 18,
      terrainNotes: 'Polygonal thermal contraction frost-crack plains and talus aprons.',
      provenance: 'archived',
      source: 'PGC REMA 2m Antarctic DEM'
    },
    temperature: {
      archivedAnnualMeanC: -23.4,
      archivedMinC: -49.0,
      archivedMaxC: -1.5,
      archivedDiurnalSwingC: 11.2,
      solarIrradianceNotes: 'Permanent summer sun / winter polar darkness; sublimation dominates over melting.',
      provenance: 'archived',
      source: 'McKay et al. (2009), Polar Meteorology / NASA Icebreaker'
    },
    waterIce: {
      aridityIndex: 0.03,
      annualPrecipMm: 10,
      subsurfaceIceScore: 98,
      iceMechanism: 'Ice-cemented permafrost directly beneath 15–45 cm of dry overburden matching Mars Phoenix/SHARAD ice table.',
      provenance: 'archived',
      source: 'NSIDC / Marinova et al. (2013), Permafrost & Periglacial Processes'
    },
    dust: {
      regolithDustHazardScore: 68,
      particleComposition: 'Wind-abraded dolerite/quartz silt and cryogenic salt dust.',
      proxyExplanation:
        'Katabatic windblown grit mimics cryogenic abrasion; atmospheric air quality sensors here measure near-zero pristine background aerosol.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + LTER McMurdo'
    },
    cavesTubes: {
      tubePresenceScore: 5,
      systemName: 'None (glacial valley)',
      documentedLengthM: null,
      structuralNotes: 'Open valley floor; no volcanic lava tubes.',
      provenance: 'archived',
      source: 'Antarctic Geological Map'
    },
    biology: {
      extremophileScore: 93,
      organisms: ['Cryptoendolithic lichens', 'Oligotrophic bacteria', 'Viable dormant spore-formers'],
      metabolicStrategy: 'Near-zero metabolic activity limit in dry ice-cemented permafrost.',
      ncbiQuery: '"University Valley" AND "Antarctica" AND ("permafrost" OR "Mars")',
      provenance: 'archived',
      source: 'Goordial et al. (2016), ISME Journal'
    },
    exploration: {
      roverMobilityScore: 81,
      landingFlatnessScore: 79,
      drillingIsruScore: 97,
      habitatConstructionScore: 65,
      engineeringNotes: 'Site of NASA Icebreaker rotary-percussive drill testing for shallow ice-table extraction without melting.',
      provenance: 'archived',
      source: 'Glass et al. (2014), NASA Icebreaker'
    },
    limitations: [
      'Bedrock includes continental sandstone/dolerite rather than planetary flood basalts.',
      '1 bar Antarctic katabatic air transfers far more convective heat than 6 mbar Mars or lunar vacuum.',
      'Logistics & Antarctic Treaty environmental restrictions limit destructive ISRU excavation.'
    ],
    citations: [
      { title: 'University Valley: A Mars-like cold desert with dry permafrost', source: 'Tamppari et al., Antarctic Science', year: 2012 },
      { title: 'Low microbial activity in hyperarid cold permafrost of University Valley', source: 'Goordial et al., ISME Journal', year: 2016 }
    ]
  },

  // HIDDEN-GEM CANDIDATES (6)
  {
    id: 'lonar-crater',
    name: 'Lonar Impact Crater',
    region: 'Buldhana, Maharashtra',
    country: 'India',
    lat: 19.976,
    lon: 76.508,
    tier: 'hidden-gem',
    summary:
      'One of only four verified hypervelocity impact craters on Earth excavated entirely into flood basalt (Deccan Traps), offering unmatched shock-basalt analog fidelity.',
    discoveryRationale:
      'Underutilized in Western rover campaigns compared to Meteor Crater (which is limestone/sandstone!). Lonar uniquely reproduces lunar mare and Martian Hesperian basaltic crater ejecta, shock glass, and secondary clay alteration.',
    primaryTargets: ['moon', 'mars'],
    useCases: ['Drilling & ISRU', 'Rover Mobility', 'Astrobiology'],
    geology: {
      rockTypes: ['Deccan flood basalt', 'impact melt breccia', 'maskelynite shock glass', 'vesicular basalt'],
      minerals: ['basalt', 'plagioclase', 'pyroxene', 'ilmenite', 'smectite clay', 'carbonate', 'impact breccia'],
      craterOrigin: true,
      weatheringState: 'Fresh 570 ka crater rim preserving shocked basaltic glass & ejecta blanket',
      description: 'Nearly circular 1.88 km crater in Deccan tholeiitic basalts containing maskelynite and Fe-smectites.',
      provenance: 'archived',
      source: 'Fredriksson et al. (1973), Science; Maloof et al. (2010), GSA Bulletin'
    },
    topography: {
      elevationM: 590,
      meanSlopeDeg: 7.8,
      roughnessIndex: 0.54,
      craterDensityAnalog: 94,
      terrainNotes: 'Classic simple-crater bowl morphology (depth/diameter ~0.08), upturned basalt rim, and continuous ejecta blanket.',
      provenance: 'archived',
      source: 'Maloof et al. (2010) / Copernicus DEM'
    },
    temperature: {
      archivedAnnualMeanC: 26.8,
      archivedMinC: 11.5,
      archivedMaxC: 42.0,
      archivedDiurnalSwingC: 14.1,
      solarIrradianceNotes: 'Tropical monsoon plateau—warm thermal baseline limits cryogenic testing.',
      provenance: 'archived',
      source: 'IMD Maharashtra Regional Climatology'
    },
    waterIce: {
      aridityIndex: 0.48,
      annualPrecipMm: 780,
      subsurfaceIceScore: 10,
      iceMechanism: 'Hosts a perennial hypersaline-alkaline crater lake (pH ~10.5); relevant to wet early-Mars impact lakes, not polar ice.',
      provenance: 'archived',
      source: 'Antony et al. (2013), Extremophiles'
    },
    dust: {
      regolithDustHazardScore: 69,
      particleComposition: 'Weathered Deccan basaltic regolith silt and seasonal agricultural/mineral dust.',
      proxyExplanation:
        'Live Open-Meteo mineral dust/PM10 reflects regional Deccan Plateau dust flux; crater-rim basaltic soils provide mechanical basalt fines proxy.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + GSI India'
    },
    cavesTubes: {
      tubePresenceScore: 12,
      systemName: 'Fractured Rim Basalt Crevices',
      documentedLengthM: null,
      structuralNotes: 'Impact-fractured basalt walls without primary lava tubes.',
      provenance: 'archived',
      source: 'Geological Survey of India'
    },
    biology: {
      extremophileScore: 84,
      organisms: ['Haloalkaliphilic archaea', 'Methylomicrobium', 'Sulfate-reducing bacteria'],
      metabolicStrategy: 'Alkaline-saline impact crater lake microbiology analogous to post-impact Martian hydrothermal lakes.',
      ncbiQuery: '"Lonar" AND ("crater" OR "basalt") AND ("extremophile" OR "archaea" OR "Mars")',
      provenance: 'archived',
      source: 'Paul et al. (2016), Frontiers in Microbiology'
    },
    exploration: {
      roverMobilityScore: 76,
      landingFlatnessScore: 62,
      drillingIsruScore: 91,
      habitatConstructionScore: 79,
      engineeringNotes: 'Ideal for testing impact-shocked basaltic core drilling, crater-rim slope ascent, and lunar mare regolith compaction.',
      provenance: 'archived',
      source: 'Maloof et al. (2010); ISRO Analog Working Group'
    },
    limitations: [
      'Tropical climate (+26.8 °C mean, seasonal monsoon) causes clay weathering and dense vegetation on inner walls.',
      'Presence of alkaline crater lake precludes dry regolith or ice-table testing.',
      '1g gravity & humid atmosphere alter electrostatic basaltic dust behavior.'
    ],
    citations: [
      { title: 'Geology of Lonar Crater, India: A Terrestrial Analog for Basaltic Impact Craters', source: 'Maloof et al., GSA Bulletin', year: 2010 },
      { title: 'Alkaline-saline microbial diversity of Lonar Lake', source: 'Paul et al., Frontiers in Microbiology', year: 2016 }
    ]
  },
  {
    id: 'askja-dyngjufjoll',
    name: 'Askja & Dyngjufjöll Tephra Caldera',
    region: 'Central Highlands',
    country: 'Iceland',
    lat: 65.033,
    lon: -16.75,
    tier: 'hidden-gem',
    summary:
      'Sub-arctic basaltic pumice desert and palagonite caldera where volcano-ice interactions create Martian-grade hydrated volcanic glass and cold-climate rover terrain.',
    discoveryRationale:
      'Far less visited by automated Mars-scoring pipelines than Mojave/Atacama despite uniquely combining sub-freezing temperatures, unweathered basaltic glass, and ice-volcano palagonite alteration.',
    primaryTargets: ['mars', 'moon'],
    useCases: ['Rover Mobility', 'Drilling & ISRU', 'Dust Mitigation', 'Astrobiology'],
    geology: {
      rockTypes: ['basaltic tephra', 'hyaloclastite palagonite', 'pillowed basalt', 'rhyolitic pumice'],
      minerals: ['basalt', 'pyroclastic glass', 'palagonite', 'olivine', 'plagioclase', 'smectite clay', 'ilmenite'],
      craterOrigin: false,
      weatheringState: 'Unaltered glacial/sub-arctic basaltic tephra & hydrothermally altered palagonite',
      description: 'Subglacial eruption products directly mirroring Martian low-albedo palagonitic dust and lunar pyroclastic glass.',
      provenance: 'archived',
      source: 'Cousins et al. (2013), Icarus; NASA SAND-E Iceland'
    },
    topography: {
      elevationM: 1095,
      meanSlopeDeg: 4.8,
      roughnessIndex: 0.45,
      craterDensityAnalog: 58,
      terrainNotes: 'Sweeping tephra outwash plains, nested collapse calderas, and sharp basaltic ridges.',
      provenance: 'archived',
      source: 'ArcticDEM 2m / National Land Survey of Iceland'
    },
    temperature: {
      archivedAnnualMeanC: -1.8,
      archivedMinC: -24.5,
      archivedMaxC: 16.0,
      archivedDiurnalSwingC: 8.6,
      solarIrradianceNotes: 'High-latitude sub-arctic illumination and persistent sub-zero seasonal frost.',
      provenance: 'archived',
      source: 'Icelandic Meteorological Office Highland Stations'
    },
    waterIce: {
      aridityIndex: 0.36,
      annualPrecipMm: 420,
      subsurfaceIceScore: 76,
      iceMechanism: 'Discontinuous permafrost and buried tephra-insulated glacial ice lenses.',
      provenance: 'archived',
      source: 'Etzelmüller et al., Permafrost & Periglacial Processes'
    },
    dust: {
      regolithDustHazardScore: 86,
      particleComposition: 'Angular volcanic basalt glass shards and electrostatically active tephra dust.',
      proxyExplanation:
        'Highland sandstorms mobilize razor-sharp basaltic ash/glass shards—an exceptional mechanical abrasion proxy for lunar pyroclastic & Martian dust.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + NASA SAND-E'
    },
    cavesTubes: {
      tubePresenceScore: 54,
      systemName: 'Holuhraun / Ódáðahraun Tubes',
      documentedLengthM: 1200,
      structuralNotes: 'Adjacent lava fields contain intact sub-freezing basaltic tubes.',
      provenance: 'archived',
      source: 'Icelandic Speleological Society'
    },
    biology: {
      extremophileScore: 81,
      organisms: ['Psychrotrophic Acidobacteria', 'Fe-oxidizing Zetaproteobacteria', 'Basalt chemotrophs'],
      metabolicStrategy: 'Cold-adapted chemolithotrophy in volcanic-hydrothermal ice-contact settings.',
      ncbiQuery: '"Askja" OR "Iceland" AND "basaltic" AND ("Mars" OR "palagonite" OR "extremophile")',
      provenance: 'archived',
      source: 'Cousins et al. (2018), Astrobiology'
    },
    exploration: {
      roverMobilityScore: 91,
      landingFlatnessScore: 82,
      drillingIsruScore: 88,
      habitatConstructionScore: 80,
      engineeringNotes: 'Tested by NASA SAND-E & RAVEN for autonomous rover sand-mobility, volcanic-glass ISRU oxygen, and EVA dust seals.',
      provenance: 'archived',
      source: 'NASA SAND-E / Ewing et al. (2022)'
    },
    limitations: [
      'Volcanic caldera rather than true impact cratering.',
      'Seasonal snowmelt and Atlantic storms create higher water flux than modern Mars.',
      '1 bar maritime-subarctic atmosphere prevents vacuum dust electrostatic simulation.'
    ],
    citations: [
      { title: 'Glaciovolcanic terrains in Iceland as Martian analogs', source: 'Cousins et al., Icarus', year: 2013 },
      { title: 'NASA SAND-E: Semi-Autonomous Navigation for Detrital Environments', source: 'Ewing et al., LPSC', year: 2022 }
    ]
  },
  {
    id: 'salar-de-pajonales',
    name: 'Salar de Pajonales',
    region: 'Antofagasta Altiplano',
    country: 'Chile',
    lat: -25.141,
    lon: -68.822,
    tier: 'hidden-gem',
    summary:
      'High-altitude (3,540 m) hyper-arid evaporite basin with patterned gypsum stromatolite-like ridges, intense UV flux, and cold nocturnal freezes.',
    discoveryRationale:
      'While Yungay gets most press, Pajonales at 3,540 m adds extreme UV radiation, freezing nightly plunges, and meter-scale gypsum ridge biosignatures directly comparable to Mars Jezero/Gale sulfates.',
    primaryTargets: ['mars'],
    useCases: ['Astrobiology', 'Rover Mobility', 'Drilling & ISRU'],
    geology: {
      rockTypes: ['gypsum evaporite ridges', 'andesitic-basaltic volcanic tuff', 'halite crust'],
      minerals: ['gypsum', 'sulfate', 'halite', 'carbonate', 'volcanic glass', 'perchlorate'],
      craterOrigin: false,
      weatheringState: 'Cryo-arid evaporitic crust preserved at high Altiplano elevation',
      description: 'Polygonal crystalline gypsum domes formed over volcanic basement rocks.',
      provenance: 'archived',
      source: 'Warren-Rhodes et al. (2023), Nature Astronomy'
    },
    topography: {
      elevationM: 3540,
      meanSlopeDeg: 1.6,
      roughnessIndex: 0.37,
      craterDensityAnalog: 12,
      terrainNotes: 'Ultra-flat playa core fractured into polygonal pressure ridges and volcanic margins.',
      provenance: 'archived',
      source: 'Copernicus DEM'
    },
    temperature: {
      archivedAnnualMeanC: 4.2,
      archivedMinC: -18.0,
      archivedMaxC: 23.0,
      archivedDiurnalSwingC: 24.8,
      solarIrradianceNotes: 'Extreme high-altitude UV-A/UV-B flux (>1,150 W/m² peak) due to thin 660 mbar air.',
      provenance: 'archived',
      source: 'SETI Institute / NASA NAI Field Stations'
    },
    waterIce: {
      aridityIndex: 0.04,
      annualPrecipMm: 45,
      subsurfaceIceScore: 44,
      iceMechanism: 'Hydrated gypsum crystal water (CaSO₄·2H₂O, ~21 wt% water) + seasonal briny frost.',
      provenance: 'archived',
      source: 'Warren-Rhodes et al. (2023), Nature Astronomy'
    },
    dust: {
      regolithDustHazardScore: 77,
      particleComposition: 'Fine sulfate-gypsum evaporite powder and volcanic ash.',
      proxyExplanation:
        'Live dust/PM10 captures wind-scoured salt/ash aerosols at 660 mbar—closer to low-density wind regimes than sea-level sites.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + SETI NAI'
    },
    cavesTubes: {
      tubePresenceScore: 10,
      systemName: 'Gypsum Dome Micro-Cavities',
      documentedLengthM: null,
      structuralNotes: 'Shallow centimeter-to-meter evaporite cavities; no large lava tubes.',
      provenance: 'archived',
      source: 'Warren-Rhodes et al. (2023)'
    },
    biology: {
      extremophileScore: 96,
      organisms: ['Chroococcidiopsis', 'Rubrobacter', 'Halobacteria', 'Pigmented Cyanobacteria'],
      metabolicStrategy: 'Endolithic ultraviolet shielding inside translucent gypsum crystal lattices.',
      ncbiQuery: '"Salar de Pajonales" AND ("gypsum" OR "Mars" OR "microbial")',
      provenance: 'archived',
      source: 'Warren-Rhodes et al. (2023), Nature Astronomy'
    },
    exploration: {
      roverMobilityScore: 88,
      landingFlatnessScore: 94,
      drillingIsruScore: 83,
      habitatConstructionScore: 58,
      engineeringNotes: 'Used to train Mars orbital-to-rover AI biosignature targeting and test gypsum water-extraction ovens.',
      provenance: 'archived',
      source: 'SETI / NASA NAI Biosignature Mapping'
    },
    limitations: [
      'High-altitude 660 mbar O₂/N₂ air is still ~100× denser than Mars 6 mbar CO₂.',
      'Evaporite salt basin lacks true basaltic impact craters or lava tubes.',
      'High daytime insolation avoids Martian −63 °C annual mean.'
    ],
    citations: [
      { title: 'Orbit-to-ground biosignature mapping in Salar de Pajonales', source: 'Warren-Rhodes et al., Nature Astronomy', year: 2023 }
    ]
  },
  {
    id: 'qaidam-basin',
    name: 'Qaidam Basin (Mang’ai Yardangs)',
    region: 'Qinghai-Tibetan Plateau',
    country: 'China',
    lat: 38.25,
    lon: 90.85,
    tier: 'hidden-gem',
    summary:
      'High-altitude (2,800 m) hyper-arid plateau combining wind-carved yardangs, magnesium sulfate playas, polygonal cracks, and severe dust storms.',
    discoveryRationale:
      'Rarely featured in Western analog catalogs despite hosting China’s Mars analog camp and uniquely combining cold winters (−25 °C), high UV, sulfate salts, and Mars-scale aeolian yardangs.',
    primaryTargets: ['mars'],
    useCases: ['Rover Mobility', 'Dust Mitigation', 'Astrobiology', 'Drilling & ISRU'],
    geology: {
      rockTypes: ['evaporitic mudstone', 'magnesium sulfate crust', 'aeolian sandstone'],
      minerals: ['sulfate', 'halite', 'gypsum', 'perchlorate', 'smectite clay', 'hematite'],
      craterOrigin: false,
      weatheringState: 'Long-term hyper-arid aeolian deflation & salt-polygon desiccation',
      description: 'Sulfate-chloride evaporite sequence with magnesium sulfates analogous to Gale Crater & Meridiani.',
      provenance: 'archived',
      source: 'Xiao et al. (2017), Earth-Science Reviews 164'
    },
    topography: {
      elevationM: 2840,
      meanSlopeDeg: 2.8,
      roughnessIndex: 0.43,
      craterDensityAnalog: 14,
      terrainNotes: 'Kilometer-scale whaleback yardang ridges, polygonal salt-crust troughs, and sand dunes.',
      provenance: 'archived',
      source: 'Xiao et al. (2017) / Copernicus DEM'
    },
    temperature: {
      archivedAnnualMeanC: 3.1,
      archivedMinC: -26.0,
      archivedMaxC: 29.0,
      archivedDiurnalSwingC: 20.6,
      solarIrradianceNotes: 'Cold desert plateau with intense winter freezes and frequent spring dust storms.',
      provenance: 'archived',
      source: 'CMA Mang’ai Meteorological Climatology'
    },
    waterIce: {
      aridityIndex: 0.02,
      annualPrecipMm: 28,
      subsurfaceIceScore: 52,
      iceMechanism: 'Hydrated Mg-sulfate salts + seasonal subsurface frost pockets in shaded mudstone.',
      provenance: 'archived',
      source: 'Kong et al. (2018), Astrobiology'
    },
    dust: {
      regolithDustHazardScore: 91,
      particleComposition: 'Sulfate-salt silt, clay dust, and quartz-feldspar windblown abrasives.',
      proxyExplanation:
        'Live Open-Meteo mineral dust & PM10 capture intense Tarim/Qaidam basin dust plumes—among Earth’s strongest atmospheric dust-storm analogs.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + Xiao et al. (2017)'
    },
    cavesTubes: {
      tubePresenceScore: 6,
      systemName: 'None (evaporite basin)',
      documentedLengthM: null,
      structuralNotes: 'Open yardang terrain; no volcanic lava tubes.',
      provenance: 'archived',
      source: 'Xiao et al. (2017)'
    },
    biology: {
      extremophileScore: 89,
      organisms: ['Halophilic archaea', 'Planococcus', 'Desiccation-tolerant Actinobacteria'],
      metabolicStrategy: 'Polyextremophile survival across cold, high salinity, UV, and desiccation.',
      ncbiQuery: '"Qaidam" AND ("Mars" OR "sulfate" OR "halophile" OR "extremophile")',
      provenance: 'archived',
      source: 'Shen et al. (2020), Astrobiology'
    },
    exploration: {
      roverMobilityScore: 89,
      landingFlatnessScore: 86,
      drillingIsruScore: 81,
      habitatConstructionScore: 60,
      engineeringNotes: 'Proven field site for solar-array dust accumulation tests, rover wheel slip in sulfate fines, and GPR ice/salt sounding.',
      provenance: 'archived',
      source: 'Xiao et al. (2017), Earth-Science Reviews'
    },
    limitations: [
      'Sedimentary lakebed lacks volcanic basaltic rocks and impact crater rims.',
      'Earth 1g gravity makes yardang erosion and saltation dust trajectories differ from Mars.',
      'Seasonal summer peaks (+29 °C) exceed Martian daytime maximums.'
    ],
    citations: [
      { title: 'The Qaidam Basin as a new Mars terrestrial analog', source: 'Xiao et al., Earth-Science Reviews', year: 2017 }
    ]
  },
  {
    id: 'lava-beds-nm',
    name: 'Lava Beds (Skull & Valentine Tubes)',
    region: 'Modoc Plateau, California',
    country: 'United States',
    lat: 41.714,
    lon: -121.508,
    tier: 'hidden-gem',
    summary:
      'Over 800 documented basaltic lava tubes—including perennial subterranean ice caves—at high desert elevation, uniting subsurface habitat construction and water-ice mining.',
    discoveryRationale:
      'Overshadowed by Hawaiʻi in popular media, yet Lava Beds uniquely pairs multi-level lunar/Martian-scale basaltic lava tubes WITH permanent subterranean ice floors inside cold-trap chambers.',
    primaryTargets: ['moon', 'mars'],
    useCases: ['Habitat & Tubes', 'Drilling & ISRU', 'Astrobiology', 'Rover Mobility'],
    geology: {
      rockTypes: ['calc-alkaline basalt', 'basaltic andesite', 'scoria cinder', 'lava tube lining'],
      minerals: ['basalt', 'plagioclase', 'olivine', 'pyroxene', 'volcanic glass', 'subsurface water ice'],
      craterOrigin: false,
      weatheringState: 'Fresh Quaternary Medicine Lake shield flows (10–30 ka) with intact tube ceilings',
      description: 'Low-viscosity basaltic tube systems preserving smooth lava benches, breakdown domes, and ice traps.',
      provenance: 'archived',
      source: 'USGS Medicine Lake Volcano / NASA BRAILLE'
    },
    topography: {
      elevationM: 1460,
      meanSlopeDeg: 4.1,
      roughnessIndex: 0.51,
      craterDensityAnalog: 38,
      terrainNotes: 'Collapsed trench skylights, broad shield slopes, and multi-tiered subterranean passages.',
      provenance: 'archived',
      source: 'USGS 3DEP / NPS Cave Inventory'
    },
    temperature: {
      archivedAnnualMeanC: 8.9,
      archivedMinC: -14.0,
      archivedMaxC: 33.0,
      archivedDiurnalSwingC: 16.8,
      solarIrradianceNotes: 'High-desert rainshadow; deep caves maintain ~0–4 °C perennial thermal stability.',
      provenance: 'archived',
      source: 'WRCC Lava Beds Station Climatology'
    },
    waterIce: {
      aridityIndex: 0.24,
      annualPrecipMm: 360,
      subsurfaceIceScore: 78,
      iceMechanism: 'Perennial cold-trap ice floors inside Skull Cave and Merrill Ice Cave insulated by basalt overburden.',
      provenance: 'archived',
      source: 'NPS / Furey et al. Cave Ice Monitoring'
    },
    dust: {
      regolithDustHazardScore: 64,
      particleComposition: 'Volcanic basaltic tephra dust and pulverized cave floor breakdown.',
      proxyExplanation:
        'Live PM10/dust reflects Modoc high-desert ambient conditions; volcanic cinder floors provide indoor dust-containment proxy.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality Proxy + NASA BRAILLE'
    },
    cavesTubes: {
      tubePresenceScore: 97,
      systemName: 'Skull Cave / Mammoth Crater Tube Network (>800 caves)',
      documentedLengthM: 18500,
      structuralNotes: 'Unrivaled density of intact multi-level basaltic tubes (up to 25 m wide) tested by NASA BRAILLE.',
      provenance: 'archived',
      source: 'NASA BRAILLE (Biologic and Resource Analog Investigations in Low Light Environments)'
    },
    biology: {
      extremophileScore: 88,
      organisms: ['Actinobacteria', 'Chemolithoautotrophic cave biofilms', 'Secondary mineral coralloid microbes'],
      metabolicStrategy: 'Dark aphotic chemolithotrophy utilizing basalt Fe/Mn oxidation and minimal organics.',
      ncbiQuery: '"Lava Beds" AND ("lava tube" OR "cave") AND ("microbial" OR "Mars" OR "BRAILLE")',
      provenance: 'archived',
      source: 'Blank et al. (2018), NASA BRAILLE'
    },
    exploration: {
      roverMobilityScore: 78,
      landingFlatnessScore: 66,
      drillingIsruScore: 86,
      habitatConstructionScore: 98,
      engineeringNotes: 'Flagship testbed for autonomous LiDAR SLAM cave-mapping robots, skylight rappelling, and inflatable cave-liner habitats.',
      provenance: 'archived',
      source: 'NASA BRAILLE / JPL CoSTAR SubT'
    },
    limitations: [
      'Tube diameters (5–25 m) are smaller than lunar Marius Hills (~50–300 m) due to Earth 1g structural limits.',
      'Meteoritic precipitation supplies cave ice rather than vapor diffusion or ancient cryosphere.',
      'Surface basalt contains sparse desert scrub and sagebrush.'
    ],
    citations: [
      { title: 'NASA BRAILLE: Life Detection and Robotic Mapping in Lava Beds National Monument', source: 'Blank et al., NASA Ames', year: 2020 }
    ]
  },
  {
    id: 'lanzarote-la-corona',
    name: 'Lanzarote (Timanfaya & La Corona Tube)',
    region: 'Canary Islands',
    country: 'Spain',
    lat: 29.131,
    lon: -13.45,
    tier: 'hidden-gem',
    summary:
      'Massive oceanic-island basaltic lava tube (7.6 km La Corona system, >25 m spans) paired with unweathered 1730–1736 Timanfaya pyroclastic basalt fields.',
    discoveryRationale:
      'ESA PANGAEA astronaut training site featuring some of the largest intact terrestrial lava-tube cross-sections on Earth, bridging the scale gap toward Mars & Moon tubes.',
    primaryTargets: ['moon', 'mars'],
    useCases: ['Habitat & Tubes', 'Rover Mobility', 'Dust Mitigation'],
    geology: {
      rockTypes: ['olivine basalt', 'pyroclastic scoria', 'pahoehoe tube flows'],
      minerals: ['basalt', 'olivine', 'pyroxene', 'plagioclase', 'ilmenite', 'volcanic glass'],
      craterOrigin: false,
      weatheringState: 'Unweathered 1730–1736 eruption deposits + intact Miocene-Holocene tubes',
      description: 'Oceanic alkali-tholeiitic basalts and mantle xenoliths ideal for astronaut geological sampling.',
      provenance: 'archived',
      source: 'Sauro et al. (2019), ESA PANGAEA'
    },
    topography: {
      elevationM: 240,
      meanSlopeDeg: 5.1,
      roughnessIndex: 0.58,
      craterDensityAnalog: 32,
      terrainNotes: 'Aligned cinder cones, smooth lava deltas, and huge collapsed skylight entrances ("jameos").',
      provenance: 'archived',
      source: 'IGN Spain 5m LiDAR / ESA PANGAEA'
    },
    temperature: {
      archivedAnnualMeanC: 20.6,
      archivedMinC: 13.0,
      archivedMaxC: 29.5,
      archivedDiurnalSwingC: 7.4,
      solarIrradianceNotes: 'Mild trade-wind climate; geothermal anomalies inside Timanfaya reach >400 °C at 13 m depth.',
      provenance: 'archived',
      source: 'AEMET Lanzarote Climatology'
    },
    waterIce: {
      aridityIndex: 0.14,
      annualPrecipMm: 110,
      subsurfaceIceScore: 4,
      iceMechanism: 'Arid subtropical island with zero ice; value lies strictly in dry basaltic tube engineering.',
      provenance: 'archived',
      source: 'AEMET / Cabildo de Lanzarote'
    },
    dust: {
      regolithDustHazardScore: 82,
      particleComposition: 'Crushed basaltic lapilli mixed with frequent Saharan Calima mineral dust events.',
      proxyExplanation:
        'Live Open-Meteo Saharan mineral dust (µg/m³) & PM10 directly quantify real-time fine mineral dust intrusions over volcanic terrain.',
      provenance: 'proxy',
      source: 'Open-Meteo Air Quality (Copernicus CAMS Dust) + ESA'
    },
    cavesTubes: {
      tubePresenceScore: 95,
      systemName: 'La Corona Lava Tube (Cueva de los Verdes)',
      documentedLengthM: 7600,
      structuralNotes: 'Multi-level dry basaltic galleries up to 28 m wide used for ESA PANGAEA & Moon-base habitat mockups.',
      provenance: 'archived',
      source: 'Sauro et al. (2019), Earth-Science Reviews'
    },
    biology: {
      extremophileScore: 64,
      organisms: ['Basalt-oxidizing Actinobacteria', 'Thermophilic chemotrophs (Timanfaya)', 'Endolithic biofilms'],
      metabolicStrategy: 'Geothermally fueled and dark lava-tube oligotrophic biofilms.',
      ncbiQuery: '"Lanzarote" AND ("lava tube" OR "Timanfaya") AND ("microbial" OR "analog")',
      provenance: 'archived',
      source: 'ESA PANGAEA / Gonzalez-Pimentel et al.'
    },
    exploration: {
      roverMobilityScore: 84,
      landingFlatnessScore: 64,
      drillingIsruScore: 76,
      habitatConstructionScore: 94,
      engineeringNotes: 'Active ESA PANGAEA astronaut geology & autonomous underground mapping campaign site.',
      provenance: 'archived',
      source: 'Sauro et al. (2019), ESA PANGAEA'
    },
    limitations: [
      'Subtropical oceanic climate (+20.6 °C) provides no cryogenic or permafrost testing.',
      'Marine salt spray alters surface chemistry near coastal tube sections.',
      'Gravity limits tube width compared to ~50–300 m lunar Marius Hills tubes.'
    ],
    citations: [
      { title: 'ESA PANGAEA: Planetary Analog Geological & Astrobiological Exercise for Astronauts', source: 'Sauro et al., ESA', year: 2019 }
    ]
  }
];

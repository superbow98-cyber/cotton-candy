// ============================================================
// Cotton Candy — Scientific Term Correction Engine
// Fixes common Web Speech API mangles for technical vocabulary
// ============================================================

type TermSet = Record<string, string[]>

// Format: "correct term": ["common mishear 1", "mishear 2", ...]
// All lowercase for matching. Output uses proper case.
const BIOLOGY: TermSet = {
  'mitochondria':       ['my toe corner', 'my toe corner dia', 'meta corner', 'mite to condria', 'mighty condria', 'my to corner dia'],
  'mitochondrial':      ['my toe corner dial', 'mite to control'],
  'photosynthesis':     ['photo synthesis', 'foto sintesis', 'voto sintesis', 'photo sin thesis'],
  'chlorophyll':        ['kloro fill', 'cloro phil', 'color fill'],
  'chloroplast':        ['kloro plast', 'color plast'],
  'chromosome':         ['kromo some', 'chrome a some', 'chrome some'],
  'chromatid':          ['kroma tid', 'chroma ted'],
  'chromatin':          ['kroma tin', 'chroma tin'],
  'cytoplasm':          ['sito plasm', 'cyto plasm', 'site oplasm'],
  'nucleus':            ['new clear', 'new clear us', 'nukleus'],
  'nucleotide':         ['new cleo tide', 'new clue tied'],
  'ribosome':           ['ribo some', 'ribbon some', 'rhyme a some'],
  'endoplasmic reticulum': ['endo plasmic', 'endo plasm reticulum', 'endo plasma recreation'],
  'golgi apparatus':    ['goji apparatus', 'go gee apparatus', 'gol jee apparatus'],
  'lysosome':           ['lice a some', 'lie so some', 'lizard some'],
  'vacuole':            ['vac you all', 'vacum ole', 'vacuole'],
  'cytoskeleton':       ['sito skeleton', 'cyto skeleton'],
  'plasma membrane':    ['plasma membrain', 'plastic membrane'],
  'cell wall':          ['sell wall', 'cel wall'],
  'phloem':             ['flow em', 'floem', 'phlome'],
  'xylem':              ['zy lem', 'zai lem', 'zylem'],
  'stomata':            ['stormata', 'stoma ta', 'stew mata'],
  'meiosis':            ['my o sis', 'meyo sis', 'miosis'],
  'mitosis':            ['my toe sis', 'meyto sis'],
  'prophase':           ['pro face', 'pro phase'],
  'metaphase':          ['meta face', 'meta phase'],
  'anaphase':           ['ana face', 'anna phase'],
  'telophase':          ['tello face', 'tele phase'],
  'interphase':         ['inter face', 'inter phase'],
  'cytokinesis':        ['sito kinesis', 'site o kinesis'],
  'gamete':             ['gam it', 'ga meet', 'gamit'],
  'zygote':             ['zi goat', 'zigo t', 'cigo te'],
  'embryo':             ['em bryo', 'em brio'],
  'fetus':              ['fit us', 'fee tus'],
  'enzyme':             ['en zime', 'in zyme'],
  'catalyst':           ['catal list', 'catta list'],
  'substrate':          ['sub straight', 'sub strat'],
  'protein':            ['pro teen', 'proteen'],
  'amino acid':         ['a mino acid', 'amino assid'],
  'peptide':            ['pep tide', 'peptid'],
  'carbohydrate':       ['carbo hydrate', 'carbo high drate'],
  'glucose':            ['glue cose', 'glu coss'],
  'fructose':           ['fruc toss', 'fruitose'],
  'sucrose':            ['sue cross', 'sue crose'],
  'lactose':            ['lack toss', 'lack toes'],
  'lipid':              ['lippid', 'lip id'],
  'phospholipid':       ['fosfo lipid', 'phos pho lipid'],
  'triglyceride':       ['tri gliceride', 'try glycer ride'],
  'deoxyribonucleic acid': ['dioxy ribo nucleic', 'dee oxy ribo', 'deoxy ribon nucleic'],
  'ribonucleic acid':   ['ribo nucleic', 'ribb on nucleic'],
  'homeostasis':        ['home o stasis', 'home oh stasis'],
  'osmosis':            ['osmosis', 'os moses', 'oz mosis'],
  'diffusion':          ['defusion', 'dif fusion'],
  'ecosystem':          ['eco system', 'echo system'],
  'biodiversity':       ['bio diversity', 'bio da virsity'],
  'photosynthesis':     ['photo synthesis', 'foto sintesis'],
  'respiration':        ['res poration', 'respirashon'],
  'adenosine triphosphate': ['adeno seen triphosphate', 'ade no sine tri phosphate'],
  'atp':                ['a t p', 'ay tee pee'],
  'dna':                ['d n a', 'de en a', 'dee in ay'],
  'rna':                ['r n a', 'ar en ay'],
  'mrna':               ['m r n a', 'em ar en ay'],
  'trna':               ['t r n a', 'tee ar en ay'],
  'alleles':            ['a leels', 'alee lees'],
  'allele':             ['a leel', 'a lele'],
  'genotype':           ['geno type', 'jeno type'],
  'phenotype':          ['pheno type', 'feno type'],
  'dominant':           ['dominant', 'dom in ant'],
  'recessive':          ['resessive', 'recesive'],
  'heterozygous':       ['hetero zygous', 'hetero zy gous'],
  'homozygous':         ['homo zygous', 'homo zy gous'],
  'punnett square':     ['puh net square', 'punit square'],
  'monohybrid':         ['mono hybrid', 'mono high brid'],
  'dihybrid':           ['die hybrid', 'dee high brid'],
}

const CHEMISTRY: TermSet = {
  'covalent bond':      ['co valent', 'covil ent bond'],
  'ionic bond':         ['eye onic', 'ionik bond'],
  'electron':           ['electron', 'elec tron'],
  'proton':             ['pro ton', 'protone'],
  'neutron':            ['new tron', 'new trone'],
  'isotope':            ['eye so tope', 'i so tope'],
  'molecule':           ['moll a cule', 'moll a kyul'],
  'atomic number':      ['atomik number', 'a tomic number'],
  'periodic table':     ['periodik table', 'pery odic table'],
  'hydrogen':           ['hy dro gen', 'hydrajin'],
  'oxygen':             ['ok sigen', 'oksijen'],
  'carbon dioxide':     ['carbon di oxide', 'carbond ioxide'],
  'sodium':             ['soe dium', 'sodiam'],
  'chloride':           ['cloride', 'klorid'],
  'sodium chloride':    ['sodium clor ide', 'sodiam klorid'],
  'sulphate':           ['sul fate', 'sulfate'],
  'nitrate':            ['night rate', 'ni trait'],
  'ph scale':           ['ph scale', 'pee h scale'],
  'acidic':             ['a sidic', 'ass id ic'],
  'alkaline':           ['alka line', 'alkaleen'],
  'neutralization':     ['neutralization', 'new tral i zation'],
  'titration':          ['tight ration', 'ti tration'],
  'electrolyte':        ['electro light', 'electrolight'],
  'oxidation':          ['ox i dation', 'oxi dation'],
  'reduction':          ['re duction', 'redukshen'],
  'redox':              ['re dox', 'ree docks'],
  'stoichiometry':      ['stoy key ometry', 'stoikiometry'],
  'molarity':           ['mol arity', 'mo larity'],
  'molality':           ['mol ality', 'mo lality'],
  'avogadro':           ['avo gadro', 'avva gadro'],
  'mole':               ['mole', 'moul'],
  'ionization':         ['ion ization', 'ionisation'],
  'exothermic':         ['exo thermic', 'ex o thermic'],
  'endothermic':        ['endo thermic', 'en do thermic'],
  'equilibrium':        ['e quilibrium', 'equil librium'],
  'catalyst':           ['catal list', 'cata list'],
  'hydrocarbon':        ['hydro carbon', 'high dro carbon'],
  'alkane':             ['al kane', 'alk ane'],
  'alkene':             ['al keen', 'alk keen'],
  'alkyne':             ['al kine', 'alk in'],
  'benzene':            ['ben zene', 'benzin'],
  'ester':              ['ester', 'ess ter'],
  'alcohol':            ['al co hol', 'al kohol'],
}

const PHYSICS: TermSet = {
  'velocity':           ['velosity', 'veh loss ity'],
  'acceleration':       ['ak celleration', 'aksel eration'],
  'momentum':           ['mo mentum', 'mow mentum'],
  'kinetic energy':     ['kin etik energy', 'kinetik energi'],
  'potential energy':   ['po tential energy'],
  'gravitational':      ['gravi tational', 'gravi tation al'],
  'electromagnetic':    ['electro magnetic', 'electromag netic'],
  'wavelength':         ['wave length', 'wavelenth'],
  'frequency':          ['fre quency', 'fre kuency'],
  'amplitude':          ['ampli tude', 'ampli tude'],
  'oscillation':        ['oscil lation', 'ossillation'],
  'refraction':         ['re fraction', 'refrakshen'],
  'reflection':         ['re flection', 'refleshen'],
  'diffraction':        ['dif fraction', 'difrakshen'],
  'interference':       ['inter ference', 'interfear ence'],
  'polarization':       ['polar ization', 'polari zation'],
  'capacitor':          ['ca pacitor', 'kapacitor'],
  'resistor':           ['re sistor', 'resistor'],
  'inductor':           ['in ductor', 'inductor'],
  'voltage':            ['vol tage', 'voul tage'],
  'current':            ['karent', 'current'],
  'resistance':         ['re sistance', 'resistance'],
  'ohm':                ['ome', 'ohm'],
  'coulomb':            ['kool ohm', 'koolom'],
  'ampere':             ['am peer', 'amper'],
  'newton':             ['newton', 'new ton'],
  'joule':              ['jool', 'jewl'],
  'watt':               ['what', 'wat'],
  'pascal':             ['pass cal', 'pascal'],
  'thermodynamics':     ['thermo dynamics', 'thermodyn amics'],
  'entropy':            ['en tropy', 'entropee'],
  'enthalpy':           ['en thalpy', 'enthalpi'],
  'quantum mechanics':  ['quantum me chanics', 'quantem mechanics'],
  'photon':             ['photon', 'foton'],
  'semiconductor':      ['semi conductor', 'semi konductor'],
  'superconductor':     ['super conductor'],
  'nuclear fission':    ['nuclear fishon', 'new clear fission'],
  'nuclear fusion':     ['nuclear fusion', 'new clear fusion'],
  'radiation':          ['ray diation', 'radiashen'],
  'schrödinger':        ['shro dinger', 'schro dinger', 'sro dinger'],
  'einstein':           ['ein stein', 'ine shtine'],
  'heisenberg':         ['hi zen berg', 'hayzen berg'],
}

const MATHS: TermSet = {
  'algebra':            ['al jebra', 'alje bra'],
  'geometry':           ['jee ometry', 'geo metry'],
  'trigonometry':       ['trig o nometry', 'trigonometri'],
  'calculus':           ['kalkulus', 'cal cul us'],
  'differentiation':    ['differen tiation', 'dif ferentiation'],
  'integration':        ['in tegration', 'integrashen'],
  'derivative':         ['de rivative', 'derivative'],
  'integral':           ['in tegral', 'integral'],
  'matrix':             ['matrix', 'may trix'],
  'determinant':        ['de terminant'],
  'polynomial':         ['poly nomial', 'poly no mial'],
  'quadratic':          ['quadratik', 'kwo dratic'],
  'exponential':        ['ex ponential', 'expo nential'],
  'logarithm':          ['log arithm', 'loga rithm'],
  'trigonometric':      ['trigo no metric'],
  'pythagorean':        ['pi thag orean', 'pitha gorean'],
  'hypotenuse':         ['hi pot enuse', 'hypoten use'],
  'probability':        ['pro bability'],
  'statistics':         ['statis tics'],
  'distribution':       ['dis tribution'],
  'variance':           ['varians', 'variance'],
  'standard deviation': ['standard de viation'],
  'correlation':        ['corre lation'],
  'regression':         ['re gression'],
  'permutation':        ['permu tation'],
  'combination':        ['com bination'],
  'asymptote':          ['asympto t', 'a symtote'],
  'parabola':           ['pa rabola', 'parabola'],
  'hyperbola':          ['hi perbola', 'hyperbol a'],
  'ellipse':            ['e llipse', 'elipse'],
  'vector':             ['vek tor', 'vector'],
  'scalar':             ['skaylar', 'scalar'],
  'cartesian':          ['car tesian'],
  'euclidean':          ['yu clidean', 'euclid ean'],
}

const MEDICINE: TermSet = {
  'cardiovascular':     ['cardio vascular'],
  'respiratory':        ['respira tory'],
  'neurological':       ['neuro logical'],
  'gastrointestinal':   ['gastro intestinal'],
  'hypertension':       ['hi per tension'],
  'hypotension':        ['hi po tension'],
  'diabetes':           ['dia beties', 'di abetes'],
  'insulin':            ['in sulin', 'insulin'],
  'glucose':            ['glue cose', 'glu cose'],
  'cholesterol':        ['colester ol', 'kolesterol'],
  'haemoglobin':        ['hemo globin', 'hema globin'],
  'platelet':           ['plate let', 'platelit'],
  'erythrocyte':        ['e ry throcyte'],
  'leukocyte':          ['loo ko cyte'],
  'antibody':           ['anti body'],
  'antigen':            ['anti gen'],
  'immune':             ['immune', 'im myoon'],
  'pathogen':           ['pathogen', 'patho jen'],
  'virus':              ['virus', 'vai rus'],
  'bacteria':           ['bac teria', 'bakteria'],
  'fungus':             ['fungus', 'fan gus'],
  'infection':          ['in fection'],
  'inflammation':       ['in flammation'],
  'metabolism':         ['meta bolism', 'metabolism'],
  'enzyme':             ['en zime', 'enzyme'],
  'hormone':            ['hor moan', 'hor mone'],
  'estrogen':           ['estro gen', 'estrogen'],
  'testosterone':       ['testoster on', 'test ostrone'],
  'thyroid':            ['thy roid', 'thyroid'],
  'pancreas':           ['pank re as', 'pancreas'],
  'liver':              ['liver', 'li ver'],
  'kidney':             ['kid ney'],
  'lung':               ['lung'],
  'brain':              ['brain'],
  'neuron':             ['new ron', 'neuron'],
  'synapse':            ['syn apse', 'sinaps'],
  'neurotransmitter':   ['neuro transmitter'],
}

// Combined dictionary (union of all sets)
export const SCIENTIFIC_TERMS: TermSet = {
  ...BIOLOGY,
  ...CHEMISTRY,
  ...PHYSICS,
  ...MATHS,
  ...MEDICINE,
}

// Subject-specific dictionaries
export const SUBJECT_DICTIONARIES: Record<string, TermSet> = {
  biology:   BIOLOGY,
  chemistry: CHEMISTRY,
  physics:   PHYSICS,
  maths:     MATHS,
  math:      MATHS,
  mathematics: MATHS,
  medicine:  MEDICINE,
  medical:   MEDICINE,
  biochem:   { ...BIOLOGY, ...CHEMISTRY },
  biochemistry: { ...BIOLOGY, ...CHEMISTRY },
}

// ---------- Build reverse map for fast correction ----------
let REVERSE_MAP: Map<string, string> | null = null

function buildReverseMap(terms: TermSet): Map<string, string> {
  const map = new Map<string, string>()
  for (const [correct, mishears] of Object.entries(terms)) {
    for (const m of mishears) {
      map.set(m.toLowerCase(), correct)
    }
    // Also map the correct term to itself (so capitalization is preserved)
    map.set(correct.toLowerCase(), correct)
  }
  return map
}

// ---------- Main correction function ----------
export function correctScientificTerms(
  text: string,
  subjectHint?: string
): string {
  if (!text) return text

  // Pick dictionary based on subject hint
  let dict = SCIENTIFIC_TERMS
  if (subjectHint) {
    const key = subjectHint.toLowerCase().trim()
    for (const [k, v] of Object.entries(SUBJECT_DICTIONARIES)) {
      if (key.includes(k)) { dict = v; break }
    }
  }

  if (!REVERSE_MAP || subjectHint) {
    REVERSE_MAP = buildReverseMap(dict)
  }

  let result = text

  // Longest-match-first (to match multi-word terms like "golgi apparatus" before "golgi")
  const keys = [...REVERSE_MAP.keys()].sort((a, b) => b.length - a.length)

  for (const mishear of keys) {
    const correct = REVERSE_MAP.get(mishear)!
    // Case-insensitive, word-boundary match
    const escaped = mishear.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi')
    if (pattern.test(result)) {
      // Preserve sentence case — capitalize if at start or follows ". "
      result = result.replace(pattern, (match, offset) => {
        const before = result.slice(0, offset).trim()
        const needsCap = offset === 0 || /[.!?]\s*$/.test(before)
        return needsCap
          ? correct.charAt(0).toUpperCase() + correct.slice(1)
          : correct
      })
    }
  }

  return result
}

// ---------- Utility: detect subject from title ----------
export function detectSubject(title: string, subject: string): string | null {
  const text = `${title} ${subject || ''}`.toLowerCase()
  for (const key of Object.keys(SUBJECT_DICTIONARIES)) {
    if (text.includes(key)) return key
  }
  // Malay subject names
  const maleyMap: Record<string, string> = {
    'biologi':    'biology',
    'kimia':      'chemistry',
    'fizik':      'physics',
    'matematik':  'maths',
    'perubatan':  'medicine',
  }
  for (const [my, en] of Object.entries(maleyMap)) {
    if (text.includes(my)) return en
  }
  return null
}

// ---------- Count corrections applied (for UI feedback) ----------
export function countCorrections(original: string, corrected: string): number {
  if (original === corrected) return 0
  // Rough estimate: count words that differ
  const origWords = original.toLowerCase().split(/\s+/)
  const corrWords = corrected.toLowerCase().split(/\s+/)
  let diff = 0
  const minLen = Math.min(origWords.length, corrWords.length)
  for (let i = 0; i < minLen; i++) {
    if (origWords[i] !== corrWords[i]) diff++
  }
  return diff
}

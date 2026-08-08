export const EXAM_SUBJECTS = {
  JEE: ["Physics", "Chemistry", "Mathematics"],
  NEET: ["Physics", "Chemistry", "Biology"],
  "School Test": ["Physics", "Chemistry", "Mathematics", "Biology", "English"],
  "Practice Test": ["Physics", "Chemistry", "Mathematics", "Biology", "English"],
} as const;

export const CHAPTERS: Record<string, string[]> = {
  Physics: ["Units & Measurements", "Motion in a Straight Line", "Motion in a Plane", "Laws of Motion", "Work, Energy & Power", "System of Particles & Rotational Motion", "Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids", "Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory", "Oscillations", "Waves"],
  Chemistry: ["Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements & Periodicity", "Chemical Bonding & Molecular Structure", "Thermodynamics", "Equilibrium", "Redox Reactions", "Organic Chemistry: Basic Principles", "Hydrocarbons"],
  Mathematics: ["Sets", "Relations & Functions", "Trigonometric Functions", "Complex Numbers & Quadratic Equations", "Linear Inequalities", "Permutations & Combinations", "Binomial Theorem", "Sequences & Series", "Straight Lines", "Conic Sections", "Introduction to 3D Geometry", "Limits & Derivatives", "Statistics", "Probability"],
  Biology: ["The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom", "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals", "Cell: The Unit of Life", "Biomolecules", "Cell Cycle & Cell Division", "Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth & Development", "Breathing & Exchange of Gases", "Body Fluids & Circulation", "Excretory Products & Elimination", "Locomotion & Movement", "Neural Control & Coordination", "Chemical Coordination & Integration"],
  English: ["Reading Comprehension", "Grammar", "Writing Skills", "Literature"],
};

export const QUESTION_TYPES = ["MCQ", "Multiple Correct", "Integer", "Numerical", "Assertion & Reason", "Paragraph", "Diagram Based", "Case Study"];
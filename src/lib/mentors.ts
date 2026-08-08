// Daily inspiration — 10 great personalities. Client-safe data.
export type Mentor = {
  id: string;
  name: string;
  role: string;
  image: string;
  quote: string;
};

export const MENTORS: Mentor[] = [
  {
    id: "kalam",
    name: "Dr. A.P.J. Abdul Kalam",
    role: "Missile Man · 11th President of India",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/A._P._J._Abdul_Kalam_in_2008.jpg?width=512",
    quote: "Dream is not that which you see while sleeping, it is something that does not let you sleep.",
  },
  {
    id: "muhammad",
    name: "Prophet Muhammad ﷺ",
    role: "Prophet of Islam",
    image: "/mentors/emblem.jpg",
    quote: "Seeking knowledge is an obligation upon every Muslim.",
  },
  {
    id: "einstein",
    name: "Albert Einstein",
    role: "Theoretical Physicist",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Albert_Einstein_Head.jpg?width=512",
    quote: "It's not that I'm so smart, it's just that I stay with problems longer.",
  },
  {
    id: "gandhi",
    name: "Mahatma Gandhi",
    role: "Father of the Nation",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Mahatma-Gandhi%2C_studio%2C_1931.jpg?width=512",
    quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
  },
  {
    id: "curie",
    name: "Marie Curie",
    role: "Two-time Nobel Laureate",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Marie_Curie_c._1920s.jpg?width=512",
    quote: "Nothing in life is to be feared, it is only to be understood.",
  },
  {
    id: "newton",
    name: "Sir Isaac Newton",
    role: "Physicist & Mathematician",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg?width=512",
    quote: "If I have seen further, it is by standing on the shoulders of giants.",
  },
  {
    id: "vivekananda",
    name: "Swami Vivekananda",
    role: "Monk & Philosopher",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Swami_Vivekananda-1893-09-signed.jpg?width=512",
    quote: "Arise, awake, and stop not till the goal is reached.",
  },
  {
    id: "mandela",
    name: "Nelson Mandela",
    role: "Statesman & Nobel Laureate",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Nelson_Mandela_1994.jpg?width=512",
    quote: "Education is the most powerful weapon which you can use to change the world.",
  },
  {
    id: "ramanujan",
    name: "Srinivasa Ramanujan",
    role: "Mathematician",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Srinivasa_Ramanujan_-_OPC_-_1.jpg?width=512",
    quote: "An equation for me has no meaning unless it expresses a thought of God.",
  },
  {
    id: "nightingale",
    name: "Florence Nightingale",
    role: "Founder of Modern Nursing",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Florence_Nightingale_%28H_Hering_NPG_x82368%29.jpg?width=512",
    quote: "I attribute my success to this: I never gave or took any excuse.",
  },
];

/** Deterministic mentor of the day, so everyone sees the same one each day. */
export function mentorOfTheDayIndex(date = new Date()) {
  const days = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );
  return days % MENTORS.length;
}

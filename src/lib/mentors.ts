// Daily inspiration — great personalities, each with a rotating set of quotes.
// Client-safe data.
export type Mentor = {
  id: string;
  name: string;
  role: string;
  image: string;
  quotes: string[];
};

export const MENTORS: Mentor[] = [
  {
    id: "kalam",
    name: "Dr. A.P.J. Abdul Kalam",
    role: "Missile Man · 11th President of India",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/A._P._J._Abdul_Kalam_in_2008.jpg?width=512",
    quotes: [
      "Dream is not that which you see while sleeping, it is something that does not let you sleep.",
      "All of us do not have equal talent, but all of us have an equal opportunity to develop our talents.",
      "Failure will never overtake me if my determination to succeed is strong enough.",
      "Excellence is a continuous process and not an accident.",
      "If you want to shine like a sun, first burn like a sun.",
      "Man needs difficulties in life because they are necessary to enjoy the success.",
      "Don't take rest after your first victory, because if you fail in second, more lips are waiting to say that your first victory was just luck.",
    ],
  },
  {
    id: "muhammad",
    name: "Prophet Muhammad ﷺ",
    role: "Prophet of Islam",
    image: "/mentors/emblem.jpg",
    quotes: [
      "Seeking knowledge is an obligation upon every Muslim.",
      "The best among you are those who have the best manners and character.",
      "Whoever treads a path in search of knowledge, Allah makes easy for him the path to Paradise.",
      "The ink of the scholar is more sacred than the blood of the martyr.",
      "He who does not thank people, does not thank Allah.",
      "Make things easy and do not make them difficult; cheer people up and do not repel them.",
      "The strong is not the one who overcomes people by his strength, but the one who controls himself while in anger.",
    ],
  },
  {
    id: "einstein",
    name: "Albert Einstein",
    role: "Theoretical Physicist",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Albert_Einstein_Head.jpg?width=512",
    quotes: [
      "It's not that I'm so smart, it's just that I stay with problems longer.",
      "Education is not the learning of facts, but the training of the mind to think.",
      "Anyone who has never made a mistake has never tried anything new.",
      "Imagination is more important than knowledge.",
      "In the middle of difficulty lies opportunity.",
      "The important thing is not to stop questioning.",
      "Try not to become a person of success, but rather try to become a person of value.",
    ],
  },
  {
    id: "gandhi",
    name: "Mahatma Gandhi",
    role: "Father of the Nation",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Mahatma-Gandhi%2C_studio%2C_1931.jpg?width=512",
    quotes: [
      "Live as if you were to die tomorrow. Learn as if you were to live forever.",
      "Strength does not come from physical capacity. It comes from an indomitable will.",
      "The future depends on what you do today.",
      "An ounce of practice is worth more than tons of preaching.",
      "Satisfaction lies in the effort, not in the attainment.",
      "First they ignore you, then they laugh at you, then they fight you, then you win.",
      "A man is but the product of his thoughts; what he thinks, he becomes.",
    ],
  },
  {
    id: "curie",
    name: "Marie Curie",
    role: "Two-time Nobel Laureate",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Marie_Curie_c._1920s.jpg?width=512",
    quotes: [
      "Nothing in life is to be feared, it is only to be understood.",
      "Be less curious about people and more curious about ideas.",
      "One never notices what has been done; one can only see what remains to be done.",
      "I was taught that the way of progress was neither swift nor easy.",
      "Have no fear of perfection — you'll never reach it.",
      "Life is not easy for any of us. But what of that? We must have perseverance.",
      "You cannot hope to build a better world without improving the individuals.",
    ],
  },
  {
    id: "newton",
    name: "Sir Isaac Newton",
    role: "Physicist & Mathematician",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg?width=512",
    quotes: [
      "If I have seen further, it is by standing on the shoulders of giants.",
      "Genius is patience.",
      "To every action there is always an equal and opposite reaction.",
      "I can calculate the motion of heavenly bodies, but not the madness of people.",
      "No great discovery was ever made without a bold guess.",
      "Truth is ever to be found in simplicity, and not in the multiplicity of things.",
      "What we know is a drop, what we don't know is an ocean.",
    ],
  },
  {
    id: "vivekananda",
    name: "Swami Vivekananda",
    role: "Monk & Philosopher",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Swami_Vivekananda-1893-09-signed.jpg?width=512",
    quotes: [
      "Arise, awake, and stop not till the goal is reached.",
      "Take up one idea. Make that one idea your life.",
      "All the powers in the universe are already ours. It is we who have put our hands before our eyes and cry that it is dark.",
      "The great secret of true success is this: ask no questions of the world, give the world what you have.",
      "You cannot believe in God until you believe in yourself.",
      "Strength is life, weakness is death.",
      "In a day, when you don't come across any problems, you can be sure that you are travelling in a wrong path.",
    ],
  },
  {
    id: "mandela",
    name: "Nelson Mandela",
    role: "Statesman & Nobel Laureate",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Nelson_Mandela_1994.jpg?width=512",
    quotes: [
      "Education is the most powerful weapon which you can use to change the world.",
      "It always seems impossible until it is done.",
      "Do not judge me by my successes, judge me by how many times I fell down and got back up again.",
      "The greatest glory in living lies not in never falling, but in rising every time we fall.",
      "A winner is a dreamer who never gives up.",
      "There is no passion to be found in settling for a life that is less than the one you are capable of living.",
      "I never lose. I either win or learn.",
    ],
  },
  {
    id: "ramanujan",
    name: "Srinivasa Ramanujan",
    role: "Mathematician",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Srinivasa_Ramanujan_-_OPC_-_1.jpg?width=512",
    quotes: [
      "An equation for me has no meaning unless it expresses a thought of God.",
      "Every positive integer is one of my personal friends.",
      "I have not trodden through a conventional university course, but I am striking out a new path for myself.",
      "A mathematician's patience is his greatest instrument.",
      "Sir, an equation has no meaning for me unless it expresses a thought of the divine.",
      "The mind must be trained to see beauty in numbers.",
      "Work done with love never feels like work at all.",
    ],
  },
  {
    id: "nightingale",
    name: "Florence Nightingale",
    role: "Founder of Modern Nursing",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Florence_Nightingale_%28H_Hering_NPG_x82368%29.jpg?width=512",
    quotes: [
      "I attribute my success to this: I never gave or took any excuse.",
      "How very little can be done under the spirit of fear.",
      "Live life when you have it. Life is a splendid gift.",
      "Let us never consider ourselves finished, we must always be improving.",
      "I never lose sight of the fact that the greatest results come from small daily habits.",
      "Were there none who were discontented with what they have, the world would never reach anything better.",
      "Nursing is an art, and if it is to be made an art it requires an exclusive devotion.",
    ],
  },
];

/** Whole-day number since epoch (UTC) — the seed for every daily rotation. */
export function dayNumber(date = new Date()) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );
}

/** Deterministic mentor of the day, so everyone sees the same one each day. */
export function mentorOfTheDayIndex(date = new Date()) {
  return dayNumber(date) % MENTORS.length;
}

/**
 * Quote of the day for a given mentor.
 * Offsetting by the mentor's position means each personality shows a
 * different quote every single day, and never the same combination twice
 * within a full cycle.
 */
export function quoteOfTheDay(mentor: Mentor, mentorIndex = 0, date = new Date()) {
  const day = dayNumber(date);
  const cycle = Math.floor(day / MENTORS.length) + mentorIndex;
  return mentor.quotes[((cycle % mentor.quotes.length) + mentor.quotes.length) % mentor.quotes.length];
}

import { nanoid } from "nanoid";

const ADJECTIVES = [
  "Silent", "Quantum", "Cosmic", "Lunar", "Solar", "Crimson", "Golden",
  "Swift", "Shadow", "Neon", "Crystal", "Electric", "Velvet", "Spectral"
];

const NOUNS = [
  "Tiger", "Coder", "Panda", "Comet", "Knight", "Dragon", "Phoenix",
  "Ninja", "Raven", "Falcon", "Wolf", "Ghost", "Sphinx", "Viper"
];

export const generateAnonymousUsername = (): string => {
  const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const randomId = nanoid(4);

  return `${randomAdjective}${randomNoun}_${randomId}`;
};

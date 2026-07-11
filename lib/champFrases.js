export const FRASES_CAMPEON = [
  "No quiero ser cagón, quiero quiero.",
  "No quiero echar moco, FALTA ENVIDO",
  "¿Y si quiero cuántos puntos son?",
  "Quiero los dos",
  "Tampoco quiero",
  "Puntos máximos",
];

export function fraseCampeonAlAzar() {
  return FRASES_CAMPEON[Math.floor(Math.random() * FRASES_CAMPEON.length)];
}

import { CardSchema } from "../lib/cardSchema.js";
//this function is intended to take a card written in RML format and convert it to YuGiOh Problem Solving Card text
export function konamiWriter(input: CardSchema, cardID): CardSchema {}

//returns a status code of sucess
//reads the RML format
export function konamiWriterToFile(input): number {
  //get ID

  const result = konamiWriter(input, cardID);
  //write result to file
}

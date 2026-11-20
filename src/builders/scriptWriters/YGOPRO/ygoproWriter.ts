import { CardSchema } from "../lib/cardSchema.js";
//this function is intended to take a card written in RML format and convert it to YGOPro script
export function ygoproWriter(input: CardSchema, cardID): CardSchema {}

//returns a status code of sucess
//reads the RML format
export function ygoproWriterToFile(input): number {
  //get ID

  const result = ygoproWriter(input, cardID);
  //write result to file
}
export type Written = string | null;

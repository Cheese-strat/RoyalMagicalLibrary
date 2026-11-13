import { CardSchema } from "../lib/cardSchema.js";
//this function is intended to take a YGOPro script file and convert it to RML format
export function ygoproReader(input: CardSchema, cardID): CardSchema {}

//returns a status code of sucess
//reads the YGOPro script format
export function ygoproReaderToFile(input): number {
  //get ID

  const result = ygoproReader(input, cardID);
  //write result to file
}

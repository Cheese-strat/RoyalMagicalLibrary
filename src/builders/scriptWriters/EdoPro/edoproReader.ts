import { CardSchema } from "../lib/cardSchema.js";
//this function is intended to take a edopro script file and convert it to RML format
export function edoproReader(input: CardSchema, cardID): CardSchema {}

//returns a status code of sucess
//reads the edoPro script format
export function edoproReaderToFile(input): number {
  //get ID

  const result = edoproReader(input, cardID);
  //write result to file
}

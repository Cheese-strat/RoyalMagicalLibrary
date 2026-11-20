import { CardSchema } from "../lib/cardSchema.js";
//this function is intended to take a card written in RML format and convert it to EdoPro script
export function edoproWriter(input: CardSchema, cardID): CardSchema {}

//returns a status code of sucess
//reads the RML format
export function edoproWriterToFile(input): number {
  //get ID

  const result = edoproWriter(input, cardID);
  //write result to file
}

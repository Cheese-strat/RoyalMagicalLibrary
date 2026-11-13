import { CardSchema } from "../lib/cardSchema.js";
//this function is intended to take a card written in RML format and convert it to an OmegaYGO script file
export function omegaWriter(input: CardSchema, cardID): CardSchema {}

//returns a status code of sucess
//reads the RML format
export function omegaWriterToFile(input): number {
  //get ID

  const result = omegaWriter(input, cardID);
  //write result to file
}

import { CardSchema } from "../lib/cardSchema.js";
//this function is intended to take a OmegaYGO script file and convert it to RML format
export function omegaReader(input: CardSchema, cardID): CardSchema {}

//returns a status code of sucess
//reads the OmegaYGO script format
export function omegaReaderToFile(input): number {
  //get ID

  const result = omegaReader(input, cardID);
  //write result to file
}

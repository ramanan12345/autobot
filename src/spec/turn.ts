import { DialogueInvalidError } from './dialogue_invalid_error';
import { Response } from './response';
export enum TurnType {
  Human,
  Bot,
  Branch,
}

export class Turn {
  turnType: TurnType;
  responses: Response[];
  queries: string[];
  humanBranches: Turn[][];
  botBranches: Turn[][];

  constructor(turnData: any) {
    let data;
    if (turnData.Human || turnData.Bot) {
      if (turnData.Human) {
        this.turnType = TurnType.Human;
        data = turnData.Human;
      } else if (turnData.Bot) {
        this.turnType = TurnType.Bot;
        data = turnData.Bot;
      }
      if (typeof data === 'string') {
        data = [data];
      }
      if (turnData.Human) {
        this.queries = data;
      } else {
        this.responses = data.map(responseData => new Response(responseData));
      }
    } else if (turnData.Branch) {
      this.turnType = TurnType.Branch;
      data = turnData.Branch;

      const numBranches = Object.keys(data).length;
      const branches: Turn[][] = [...Array(numBranches)]
        .map((_, i) => data[i + 1])
        .filter(x => x && x instanceof Array)
        .map(x => x.map(y => new Turn(y)));
      if (branches.length !== numBranches) {
        throw new DialogueInvalidError(
          `Branch numbers do not go from 1 to ${numBranches}: ${JSON.stringify(data)}`);
      }
      this.humanBranches = branches.filter(branch => branch[0].turnType === TurnType.Human);
      this.botBranches = branches.filter(branch => branch[0].turnType === TurnType.Bot);
    } else {
      throw new DialogueInvalidError(`No Human, Bot, or Branch key on ${JSON.stringify(turnData)}`);
    }
  }
  
  /** Tests if this phrase matches this turn.
   *  Returns:
   *    - true if it is a simple text match
   *    - Turn[] if it matches a branch, returns the branch to go to.
   *    - false if there is no match **/
  matches(text: string): Turn[] | boolean {
    if (this.turnType === TurnType.Bot) {
      return this.responses.some((response) => {
        return response.matches(text);
      });
    } else if (this.turnType === TurnType.Branch) {
      const matchingBranch = this.botBranches.find((turnList) => {
        if (turnList[0].turnType === TurnType.Bot) {
          return turnList[0].matches(text) !== false;
        } else {
          return false;
        }
      });
      return matchingBranch ? matchingBranch : false;
    } else {
      return false;
    }
  }

  toString(): string {
    switch (this.turnType) {
      case TurnType.Bot:
        return this.responses.map(response => response.original).join(' | ');
      case TurnType.Human:
        return this.queries.join(' | ');
      case TurnType.Branch:
        return this.botBranches.concat(this.humanBranches)
          .map(branch => branch[0].toString()).join(' | ');
    }
  }
}

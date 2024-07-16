import { HandleRequest, HttpRequest, HttpResponse, Kv } from "@fermyon/spin-sdk";
import { Logger } from "tslog";
import { v4 as uuidv4 } from 'uuid';

interface InternalGame {
  id: string,
  solution: string,
  grid: string[][],
  currentRow: number,
  solved: boolean
}

interface Response {
  message: string,
  gameId?: string,
  grid?: string[][],
  currentRow?: number,
  solved?: boolean
}

const dictionary = ["apple", "banana", "cherry", "dates", "elder"];

export const handleRequest: HandleRequest = async function (request: HttpRequest): Promise<HttpResponse> {
  const requestId = uuidv4();
  const log = new Logger({
    prefix: [requestId],
    stylePrettyLogs: false,
  });

  let internalGame: InternalGame;
  let response: Response = { message: "" };
  let store;

  try {
    store = Kv.openDefault();
  } catch (error) {
    log.error("Failed to open KV store:", error);
    return {
      status: 500,
      headers: { "content-type": "text/plain" },
      body: "Internal Server Error"
    };
  }

  if (request.uri.toLowerCase().includes("/api/start") && request.method === "POST") {
    const id = uuidv4();
    log.info(`Starting new game: ${id}`);

    const solution = dictionary[Math.floor(Math.random() * dictionary.length)];

    internalGame = {
      id: id,
      solution: solution,
      grid: Array(6).fill([]).map(() => Array(5).fill("")),
      currentRow: 0,
      solved: false
    };

    await store.setJson(internalGame.id, internalGame);
    log.info(`Game status: ${JSON.stringify(internalGame)}`);

    response.gameId = internalGame.id;
    response.grid = internalGame.grid;
    response.currentRow = internalGame.currentRow;
    response.solved = internalGame.solved;
    response.message = "New game started";

    return {
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(response)
    };
  }

  if (request.uri.toLowerCase().includes("/api/guess") && request.method === "POST") {
    const body = JSON.parse(new TextDecoder().decode(request.body));
    const id = body.gameId;
    const guess = body.guess;

    try {
      internalGame = await store.getJson(id);
    } catch (error) {
      log.error(error);
      return {
        status: 500,
        headers: { "content-type": "text/plain" },
        body: `Error retrieving game with id: ${id}`
      };
    }
    log.info(`Continuing game: ${internalGame.id}`);

    if (guess.length !== 5 || !/^[a-zA-Z]+$/.test(guess)) {
      log.error("Guess is wrong format");
      return {
        status: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Guess must be a 5-letter word." })
      };
    }

    const normalizedGuess = guess.toLowerCase();

    if (!dictionary.includes(normalizedGuess)) {
      log.error("Invalid word");
      return {
        status: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Not a valid word." })
      };
    }

    internalGame.grid[internalGame.currentRow] = normalizedGuess.split("");

    if (normalizedGuess === internalGame.solution) {
      internalGame.solved = true;
      response.message = "Congratulations!";
    } else if (internalGame.currentRow === 5) {
      response.message = `Game over. The word was ${internalGame.solution}.`;
    } else {
      response.message = "Keep trying!";
      internalGame.currentRow++;
    }

    await store.setJson(internalGame.id, internalGame);

    response.gameId = internalGame.id;
    response.grid = internalGame.grid;
    response.currentRow = internalGame.currentRow;
    response.solved = internalGame.solved;

    return {
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(response)
    };
  }

  return {
    status: 400,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "Invalid request" })
  };
}

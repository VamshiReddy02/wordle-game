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
  solved?: boolean,
  correctLetters?: string[]
}

const dictionary = ["apple", "again", "alarm", "alone", "along"];

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
    response.message = "The game has started, start guessing the word";

    return {
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(response)
    };
  }

  if (request.uri.toLowerCase().includes("/api/guess") && request.method === "GET") {
    const url = new URL(request.uri, `http://${request.headers.host}`);
    const id = url.searchParams.get("gameId");
    const guess = url.searchParams.get("guess");

    if (!id || !guess) {
      return {
        status: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing gameId or guess in the query parameters" })
      };
    }

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

    const correctLetters = Array(5).fill("_");
    for (let i = 0; i < normalizedGuess.length; i++) {
      if (normalizedGuess[i] === internalGame.solution[i]) {
        correctLetters[i] = normalizedGuess[i];
      }
    }

    if (normalizedGuess === internalGame.solution) {
      internalGame.solved = true;
      response.message = "Congratulations!";
    } else if (internalGame.currentRow === 5) {
      response.message = `Game over. The word was ${internalGame.solution}.`;
    } else {
      response.message = `Keep trying! Correct letters: ${correctLetters.filter(l => l !== "_").join(", ")}`;
      internalGame.currentRow++;
    }

    await store.setJson(internalGame.id, internalGame);

    response.gameId = internalGame.id;
    response.grid = internalGame.grid;
    response.currentRow = internalGame.currentRow;
    response.solved = internalGame.solved;
    response.correctLetters = correctLetters;

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

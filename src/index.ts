import { Kv, ResponseBuilder } from "@fermyon/spin-sdk"; // Importing the Kv store and ResponseBuilder from the Spin SDK
import { v4 as uuidv4 } from 'uuid'; // Importing the uuid library to generate unique IDs

// Defining an interface for the internal game state
interface InternalGame {
  id: string, // Unique identifier for the game
  solution: string, // The correct word that the player needs to guess
  grid: string[][], // 2D array representing the player's guesses
  currentRow: number, // Tracks the current row the player is on
  solved: boolean // Boolean to check if the game is solved
}

// Defining an interface for the response structure
interface Response {
  message: string, // Message to be returned to the client
  gameId?: string, // Optional game ID to be returned in the response
  grid?: string[][], // Optional grid representing the current state of guesses
  currentRow?: number, // Optional current row the player is on
  solved?: boolean, // Optional boolean indicating if the game is solved
  correctLetters?: string[] // Optional array of correct letters guessed so far
}

// Dictionary of valid words for the game
const dictionary = ["apple", "again", "alarm", "alone", "along"];
const decoder = new TextDecoder(); // Initializing a TextDecoder to decode stored data

// Main handler function for processing requests
export async function handler(req: Request, res: ResponseBuilder) {
  const store = Kv.openDefault(); // Opening the default key-value store
  const response: Response = { message: "" }; // Initializing an empty response object
  let status = 200; // Default status code is 200 (OK)
  let body: string | undefined; // Body of the response to be sent to the client

  try {
    // Handling a POST request to start a new game
    if (req.method === "POST" && req.url.toLowerCase().includes("/api/start")) {
      const id = uuidv4(); // Generating a unique ID for the new game
      const solution = dictionary[Math.floor(Math.random() * dictionary.length)]; // Randomly selecting a solution word

      // Creating a new internal game state
      const internalGame: InternalGame = {
        id: id,
        solution: solution,
        grid: Array(6).fill([]).map(() => Array(5).fill("")), // Initializing the grid with empty strings
        currentRow: 0, // Starting at the first row
        solved: false // The game is not solved initially
      };

      await store.set(id, JSON.stringify(internalGame)); // Storing the new game state in the Kv store
      response.gameId = internalGame.id; // Setting the game ID in the response
      response.grid = internalGame.grid; // Setting the initial grid in the response
      response.currentRow = internalGame.currentRow; // Setting the current row in the response
      response.solved = internalGame.solved; // Indicating the game is not solved
      response.message = "The game has started, start guessing the word"; // Informing the player that the game has started

      body = JSON.stringify(response); // Converting the response object to a JSON string
      res.headers.set("content-type", "application/json"); // Setting the content type to JSON
      res.status(status).send(body); // Sending the response with the appropriate status
      return; // Exiting the function as the response is sent
    }

    // Handling a GET request to make a guess
    if (req.method === "GET" && req.url.toLowerCase().includes("/api/guess")) {
      const url = new URL(req.url, `http://${req.headers.get("host")}`); // Parsing the URL to extract parameters
      const id = url.searchParams.get("gameId"); // Extracting the gameId from the query parameters
      const guess = url.searchParams.get("guess"); // Extracting the guess from the query parameters

      if (!id || !guess) { // Checking if both gameId and guess are provided
        status = 400; // Setting status to 400 (Bad Request)
        response.message = "Missing gameId or guess in the query parameters"; // Informing the client about the missing parameters
        body = JSON.stringify(response); // Converting the response to JSON
        res.headers.set("content-type", "application/json"); // Setting the content type to JSON
        res.status(status).send(body); // Sending the response
        return; // Exiting the function as the response is sent
      }

      const val = store.get(id); // Retrieving the game state from the Kv store using the gameId
      if (!val) { // Checking if the game state is found
        status = 404; // Setting status to 404 (Not Found)
        response.message = `Game with id: ${id} not found`; // Informing the client that the game was not found
        body = JSON.stringify(response); // Converting the response to JSON
        res.headers.set("content-type", "application/json"); // Setting the content type to JSON
        res.status(status).send(body); // Sending the response
        return; // Exiting the function as the response is sent
      }

      const internalGame: InternalGame = JSON.parse(decoder.decode(val)); // Decoding and parsing the stored game state

      if (guess.length !== 5 || !/^[a-zA-Z]+$/.test(guess)) { // Validating the guess to ensure it is a 5-letter word
        status = 400; // Setting status to 400 (Bad Request)
        response.message = "Guess must be a 5-letter word."; // Informing the client about the invalid guess
        body = JSON.stringify(response); // Converting the response to JSON
        res.headers.set("content-type", "application/json"); // Setting the content type to JSON
        res.status(status).send(body); // Sending the response
        return; // Exiting the function as the response is sent
      }

      const normalizedGuess = guess.toLowerCase(); // Normalizing the guess to lowercase

      if (!dictionary.includes(normalizedGuess)) { // Checking if the guess is a valid word in the dictionary
        status = 400; // Setting status to 400 (Bad Request)
        response.message = "Not a valid word."; // Informing the client that the word is not valid
        body = JSON.stringify(response); // Converting the response to JSON
        res.headers.set("content-type", "application/json"); // Setting the content type to JSON
        res.status(status).send(body); // Sending the response
        return; // Exiting the function as the response is sent
      }

      internalGame.grid[internalGame.currentRow] = normalizedGuess.split(""); // Updating the grid with the guessed word

      const correctLetters = Array(5).fill("_"); // Initializing an array to track correct letters
      for (let i = 0; i < normalizedGuess.length; i++) { // Looping through the guess to compare with the solution
        if (normalizedGuess[i] === internalGame.solution[i]) { // Checking if the guessed letter matches the solution
          correctLetters[i] = normalizedGuess[i]; // Storing the correct letter in the correctLetters array
        }
      }

      if (normalizedGuess === internalGame.solution) { // Checking if the guess is the correct solution
        internalGame.solved = true; // Marking the game as solved
        response.message = "Congratulations!"; // Congratulating the player
      } else if (internalGame.currentRow === 5) { // Checking if the player has used all attempts
        response.message = `Game over. The word was ${internalGame.solution}.`; // Informing the player that the game is over
      } else { // If the guess is incorrect and there are remaining attempts
        response.message = `Keep trying! Correct letters: ${correctLetters.filter(l => l !== "_").join(", ")}`; // Encouraging the player to keep trying
        internalGame.currentRow++; // Incrementing the current row to move to the next attempt
      }

      await store.set(internalGame.id, JSON.stringify(internalGame)); // Updating the game state in the Kv store

      response.gameId = internalGame.id; // Setting the gameId in the response
      response.grid = internalGame.grid; // Setting the updated grid in the response
      response.currentRow = internalGame.currentRow; // Setting the updated current row in the response
      response.solved = internalGame.solved; // Indicating if the game is solved
      response.correctLetters = correctLetters; // Including the correct letters in the response

      body = JSON.stringify(response); // Converting the response to JSON
      res.headers.set("content-type", "application/json"); // Setting the content type to JSON
      res.status(status).send(body); // Sending the response
      return; // Exiting the function as the response is sent
    }

    status = 400; // Setting status to 400 (Bad Request) for invalid requests
    response.message = "Invalid request"; // Informing the client that the request is invalid
    body = JSON.stringify(response); // Converting the response to JSON
    res.headers.set("content-type", "application/json"); // Setting the content type to JSON
    res.status(status).send(body); // Sending the response

  } catch (error) { // Catching any errors that occur during request processing
    status = 500; // Setting status to 500 (Internal Server Error)
    response.message = "Internal Server Error"; // Informing the client about the server error
    body = JSON.stringify(response); // Converting the response to JSON
    res.headers.set("content-type", "application/json"); // Setting the content type to JSON
    res.status(status).send(body); // Sending the response
  }
}

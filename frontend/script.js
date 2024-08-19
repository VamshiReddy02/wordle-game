document.addEventListener("DOMContentLoaded", () => {
    const startGameButton = document.getElementById("startGame");
    const submitGuessButton = document.getElementById("submitGuess");
    const gameBoard = document.getElementById("gameBoard");
    const gridElement = document.getElementById("grid");
    const guessInput = document.getElementById("guessInput");
    const messageElement = document.getElementById("message");
  
    let gameId = "";
  
    startGameButton.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/start", { method: "POST" });
        const data = await response.json();
        if (response.ok) {
          gameId = data.gameId;
          renderGrid(data.grid, []);
          messageElement.textContent = data.message;
          gameBoard.classList.remove("hidden");
          guessInput.style.display = "block";  // Show the input field
          submitGuessButton.style.display = "block"; // Show the submit button
        } else {
          messageElement.textContent = "Failed to start the game.";
        }
      } catch (error) {
        console.error("Error starting the game:", error);
        messageElement.textContent = "An error occurred. Please try again.";
      }
    });
  
    submitGuessButton.addEventListener("click", async () => {
      const guess = guessInput.value.trim();
      if (guess.length !== 5) {
        messageElement.textContent = "Guess must be a 5-letter word.";
        return;
      }
  
      try {
        const response = await fetch(`/api/guess?gameId=${gameId}&guess=${guess}`, { method: "GET" });
        const data = await response.json();
        if (response.ok) {
          renderGrid(data.grid, data.correctLetters);
          messageElement.textContent = data.message;
          guessInput.value = "";
        } else {
          messageElement.textContent = data.message || "Failed to submit guess.";
        }
      } catch (error) {
        console.error("Error making a guess:", error);
        messageElement.textContent = "An error occurred. Please try again.";
      }
    });
  
    function renderGrid(grid, correctLetters) {
      gridElement.innerHTML = "";
      grid.forEach((row, rowIndex) => {
        row.forEach((letter, letterIndex) => {
          const gridItem = document.createElement("div");
          gridItem.classList.add("grid-item");
          gridItem.textContent = letter;
  
          // Highlight correctly placed letters
          if (correctLetters[letterIndex] && correctLetters[letterIndex] === letter) {
            gridItem.classList.add("correct-letter");
          }
  
          gridElement.appendChild(gridItem);
        });
      });
    }
  });
  
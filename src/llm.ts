import { Llm, InferencingModels } from "@fermyon/spin-sdk";

const model = InferencingModels.Llama2Chat;
const sysprompt = `
<<SYS>>
  You are an assistant who helps users guess words by providing hints. 
  Please provide a hint for the given word in a clear and concise manner.
<</SYS>>
`;

export async function getHint(solution: string): Promise<string> {
  const hintPrompt = `Give a hint for the word: ${solution}`;
  try {
    const result = await Llm.infer(model, hintPrompt);
    return result.text;
  } catch (error) {
    console.error("Failed to get hint from LLM:", error instanceof Error ? error.message : String(error));
    throw new Error("Failed to generate hint. Please try again later.");
  }
}

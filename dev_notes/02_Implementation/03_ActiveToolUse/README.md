# Active Tool Use - Current Status

## Problem Statement
Similar to the issues observed in passive tool use, our tests of active tool use (also known as function calling) reveal that the LLM is not receiving the results of tool executions.

## Current Behavior
1.  The `GenerativeModel` is initialized with a set of available tools.
2.  The LLM correctly identifies when one of the provided functions should be called and generates the appropriate `functionCall` in its response.
3.  The client-side code successfully intercepts the `functionCall`, executes the corresponding tool, and captures the output.
4.  **The client-side logic fails to send this output back to the model for further processing.** The model expects the output to continue the conversation (e.g., to summarize the tool's findings), but this step is missing.

## Impact
This limitation prevents the successful completion of any multi-step task that relies on function calling. The model can request an action but cannot act upon the result of that action, rendering the feature incomplete.

## Next Steps
- Implement the client-side loop required for active tool use.
- After receiving a `functionCall` from the model, execute the tool.
- Send a new `generateContent` request that includes the original `functionCall` and the `functionResponse` containing the tool's output in the conversation history.
- Ensure the model correctly processes this new information and generates a final, user-facing response.
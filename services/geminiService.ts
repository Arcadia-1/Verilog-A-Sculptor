
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ModelConfig, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let activeChat: Chat | null = null;

export const startNewSession = (config: ModelConfig, referenceCode?: string) => {
  const transitionLogic = config.transitionStyle === 'macro' 
    ? "Define a macro `define default_transition 10p at the top of the file and use it in all transition() calls as the rise/fall time. Do not add 'tr' as a module parameter."
    : "Use a module parameter 'tr' for transition rise/fall times in all transition() calls.";

  const hiddenStateLogic = config.ignoreHiddenState 
    ? "Always start the module definition with the attribute: (* ignore_hidden_state *) module ..."
    : "Do not include the ignore_hidden_state attribute.";

  const referenceLogic = referenceCode?.trim() 
    ? `USER REFERENCE CODE (Follow this style/structure if provided):
       ${referenceCode}`
    : "";

  const systemInstruction = `
    You are an expert Analog IC Modeling Engineer specializing in Verilog-A for advanced nodes (GF22, TSMC N7, etc.).
    Your goal is to generate models that match industrial standards and specifically follow any reference code patterns provided by the user.

    STRICT CODING GUIDELINES:
    1. **Module Header**: ${hiddenStateLogic}
    2. **Transition Handling**: ${transitionLogic}
    3. **Supply Logic**: If Global Configuration includes Power Ports, use 'inout electrical VDD, VSS'. 
       Thresholds (vth) MUST be calculated dynamically: 'vth = (V(VDD) + V(VSS)) / 2.0;'.
    4. **Outputs**: ALWAYS use the 'transition()' filter for assignments to electrical nodes.
    5. **Digital Interface**: For digital buses, use indices (e.g., 'input electrical [15:0] din').
    6. **Logging**: Use '$strobe' for meaningful simulation logging, showing time in ns and internal state variables.
    7. **Resets**: Use asynchronous active-low reset logic: 'if (V(rst_ni) < vth) ...'.
    8. **Discipline**: Use 'electrical' by default unless configured otherwise. Include 'disciplines.vams' and 'constants.vams'.
    
    ${referenceLogic}

    CONFIG SETTINGS:
    - Primary Discipline: ${config.discipline}
    - Include Dedicated Power Ports: ${config.includePowerPorts}
    - Parameterized Power: ${config.parameterizedPower}
    - Include Noise Models: ${config.includeNoise}

    FORMAT:
    Return the FULL Verilog-A code in a markdown block, followed by a 'Documentation' section explaining the implementation details.
  `;

  activeChat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction,
      temperature: 0.3,
    },
  });
};

export const refineModel = async (prompt: string): Promise<{ code: string; explanation: string }> => {
  if (!activeChat) {
    throw new Error("No active session.");
  }

  try {
    const response = await activeChat.sendMessage({ message: prompt });
    const text = response.text || "";
    
    const codeMatch = text.match(/```(?:veriloga|verilog|vams)?([\s\S]*?)```/i);
    const code = codeMatch ? codeMatch[1].trim() : "";
    const explanation = text.replace(/```[\s\S]*?```/g, "").trim();

    return { code, explanation };
  } catch (error) {
    console.error("Gemini Iteration Error:", error);
    throw error;
  }
};

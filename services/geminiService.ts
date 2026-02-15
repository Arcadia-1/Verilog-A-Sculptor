
import { GoogleGenAI, Chat } from "@google/genai";
import { BlockParams } from "../types";

let activeChat: Chat | null = null;

export const startNewSession = (envParams: BlockParams, customization?: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

  const transitionLogic = envParams.transitionStyle === 'global-macro' 
    ? "Define `define default_transition 10p` at the top. Use it for all transition() calls."
    : "Use a module parameter 'tr' for transition rise/fall times.";

  const powerLogic = envParams.powerStyle === 'dedicated-ports'
    ? "Use dedicated supply ports: 'inout electrical vdd, vss;'."
    : `Use module parameters for supply voltages:\nparameter real vdd = ${envParams.vdd};\nparameter real vss = ${envParams.vss};\nparameter real vth = ${(envParams.vdd! + envParams.vss!) / 2.0};`;

  const formatLogicStyle = (style: string | undefined) => {
    if (!style || style === 'none') return "None.";
    const parts = style.split('-');
    return `${parts[0].toUpperCase()} logic with ${parts[1]}-${parts[2]} polarity.`;
  };

  const hasSync = (envParams.resetStyle?.startsWith('sync') || envParams.masterEnableStyle?.startsWith('sync'));
  const clockRequirement = hasSync ? "MANDATORY: Include a 'clk' port for synchronous operations." : "";

  const systemInstruction = `
    You are an Expert Analog Verilog-A Modeler. Generate code following high-performance industry standards (reference: Arcadia-1/veriloga-skills).
    
    GLOBAL ARCHITECTURE:
    - Naming Style: ${envParams.namingStyle === 'uppercase' ? "Module name and ALL ports MUST be UPPERCASE." : "Module name and ports should be lowercase."}
    - Header: ${envParams.ignoreHiddenState ? "Include (* ignore_hidden_state *) attribute on a separate line above the module." : "Standard module header."}
    - Transition Style: ${transitionLogic}
    - Power Management: ${powerLogic}
    - ${clockRequirement}
    
    LOGIC PATTERNS:
    - Reset Logic: ${formatLogicStyle(envParams.resetStyle)}
    - Master Enable: ${formatLogicStyle(envParams.masterEnableStyle)}
    
    SYNCHRONOUS LOGIC RULES:
    If a synchronous style is selected, you MUST use a clock 'clk'. 
    Example pattern for Sync Reset (Active-Low):
    @(cross(V(clk) - vth, +1)) begin
        if (V(rst_n) < vth) begin
            // Reset logic here
        end else if (enable > vth) begin
            // Normal operation
        end
    end

    ANALOG MODELING SKILLS:
    1. Include 'disciplines.vams' and 'constants.vams'.
    2. Use electrical disciplines for all physical ports.
    3. Use transition(value, delay, trise, tfall) for all electrical outputs to prevent convergence issues.
    4. Implement ADC/DAC ranges strictly with the provided Voltage limits.
    5. Implement TDC/DTC ranges strictly with the provided Time limits.
    6. Ensure robust behavior at the boundaries of full-scale ranges.
    
    CUSTOMIZATION:
    ${customization || "None provided."}

    Format: Return ONLY the code in a markdown block, followed by a brief 'Sculptor Insight' explanation.
  `;

  activeChat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction,
      temperature: 0.1,
    },
  });
};

export const refineModel = async (prompt: string): Promise<{ code: string; explanation: string }> => {
  if (!activeChat) throw new Error("Session expired.");

  try {
    const response = await activeChat.sendMessage({ message: prompt });
    const text = response.text || "";
    const codeMatch = text.match(/```(?:veriloga|verilog|vams)?([\s\S]*?)```/i);
    return { 
      code: codeMatch ? codeMatch[1].trim() : "", 
      explanation: text.replace(/```[\s\S]*?```/g, "").trim() 
    };
  } catch (error) {
    console.error("Gemini Failure:", error);
    throw error;
  }
};

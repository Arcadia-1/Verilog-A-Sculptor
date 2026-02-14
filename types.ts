
export interface ModelConfig {
  includePowerPorts: boolean;
  parameterizedPower: boolean;
  includeNoise: boolean;
  discipline: 'electrical' | 'thermal' | 'mechanical';
  ignoreHiddenState: boolean;
  transitionStyle: 'parameter' | 'macro';
}

export interface BlockParams {
  bits?: number;
  polarity?: 'high' | 'low';
  vstep?: number;
  vth?: number;
  tr?: string;
  gain?: number;
  freq?: string;
}

export interface Block {
  id: string;
  type: string;
  label: string;
  description: string;
  basePrompt: string;
  category: string;
  params?: BlockParams;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  code?: string;
  explanation?: string;
  timestamp: number;
}

export const DEFAULT_CONFIG: ModelConfig = {
  includePowerPorts: false,
  parameterizedPower: true,
  includeNoise: false,
  discipline: 'electrical',
  ignoreHiddenState: true,
  transitionStyle: 'parameter'
};

export const LIBRARY_BLOCKS: Block[] = [
  // Data Converters
  { id: 'dac_bin', category: 'Converters', type: 'core', label: 'Binary DAC', description: 'N-bit binary weighted', basePrompt: 'a binary-weighted DAC', params: { bits: 8, vstep: 1.0, tr: '10n' } },
  { id: 'dac_thm', category: 'Converters', type: 'core', label: 'Therm DAC', description: 'N-bit thermometer', basePrompt: 'a thermometer-coded DAC', params: { bits: 16, vstep: 1.0, tr: '10n' } },
  { id: 'adc_flash', category: 'Converters', type: 'core', label: 'Flash ADC', description: 'N-bit flash ADC', basePrompt: 'a flash ADC model', params: { bits: 4, vth: 0.5 } },
  { id: 'adc_sar', category: 'Converters', type: 'core', label: 'SAR Logic', description: 'Successive approx logic', basePrompt: 'SAR ADC control logic', params: { bits: 10 } },

  // Logic & Digital
  { id: 'logic_dec', category: 'Logic', type: 'logic', label: 'Decoder', description: 'Binary-to-OneHot', basePrompt: 'a binary-to-onehot decoder', params: { bits: 4, polarity: 'high' } },
  { id: 'logic_ptr', category: 'Logic', type: 'logic', label: 'Pointer Gen', description: 'Rotating pointer', basePrompt: 'a rotating pointer generator', params: { bits: 8, polarity: 'low' } },
  { id: 'logic_mux', category: 'Logic', type: 'logic', label: 'Analog MUX', description: 'N-channel multiplexer', basePrompt: 'an analog multiplexer', params: { bits: 4 } },
  { id: 'logic_lshift', category: 'Logic', type: 'logic', label: 'Lvl Shifter', description: 'Domain shifter', basePrompt: 'a level shifter', params: { polarity: 'high' } },
  { id: 'logic_div', category: 'Logic', type: 'logic', label: 'Freq Div', description: 'Integer divider', basePrompt: 'a frequency divider', params: { bits: 4 } },

  // Analog Mixed-Signal
  { id: 'comp', category: 'Mixed-Signal', type: 'ams', label: 'Comparator', description: 'High-speed comp', basePrompt: 'a voltage comparator', params: { vth: 0.5, tr: '1n' } },
  { id: 'opamp', category: 'Mixed-Signal', type: 'ams', label: 'Ideal OpAmp', description: 'VCVS based amp', basePrompt: 'an ideal operational amplifier', params: { gain: 100000, tr: '100n' } },
  { id: 'cpump', category: 'Mixed-Signal', type: 'ams', label: 'Charge Pump', description: 'PLL charge pump', basePrompt: 'a PLL charge pump with UP/DN inputs', params: { polarity: 'high' } },
  { id: 'pdet', category: 'Mixed-Signal', type: 'ams', label: 'Phase Det', description: 'PFD for PLL', basePrompt: 'a phase frequency detector', params: { polarity: 'high' } },

  // Control & Infrastructure
  { id: 'feat_rst', category: 'Control', type: 'feat', label: 'Async Reset', description: 'Reset control', basePrompt: 'asynchronous reset logic', params: { polarity: 'low' } },
  { id: 'feat_en', category: 'Control', type: 'feat', label: 'Enable', description: 'Enable/Disable pin', basePrompt: 'a master enable pin', params: { polarity: 'high' } },
  { id: 'feat_clk', category: 'Control', type: 'feat', label: 'Clock Sync', description: 'Edge-trigger', basePrompt: 'clock-synchronous updates', params: { vth: 0.5 } },

  // Physical & Ref
  { id: 'phys_pwr', category: 'Physical', type: 'phys', label: 'Power Pins', description: 'VDD/VSS ports', basePrompt: 'dedicated VDD and VSS power ports' },
  { id: 'phys_noise', category: 'Physical', type: 'phys', label: 'Noise Gen', description: 'Thermal/Flicker', basePrompt: 'thermal and flicker noise sources' },
  { id: 'phys_res', category: 'Physical', type: 'phys', label: 'Trim Res', description: 'Binary weighted R', basePrompt: 'a trimmable resistor network', params: { bits: 8 } },
  { id: 'phys_cap', category: 'Physical', type: 'phys', label: 'Varactor', description: 'Voltage-variable C', basePrompt: 'a behavioral varactor model', params: { gain: 1.0 } }
];

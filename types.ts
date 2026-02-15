
export type EncodingType = 'binary' | 'thermometer' | 'gray' | 'one-hot';
export type LogicStyle = 'async-active-low' | 'async-active-high' | 'sync-active-low' | 'sync-active-high' | 'none';
export type ComparatorEnableMode = 'active-high-enable' | 'active-low-enable' | 'always-enabled' | 'always-disabled' | 'none';
export type TransitionStyle = 'global-macro' | 'module-parameter';
export type PowerStyle = 'dedicated-ports' | 'parameter-defined';
export type ConverterType = 'static' | 'clocked';
export type NamingStyle = 'lowercase' | 'uppercase';

export interface BlockParams {
  // Global / Environment
  moduleName?: string;
  namingStyle?: NamingStyle;
  vdd?: number;
  vss?: number;
  resetStyle?: LogicStyle;
  masterEnableStyle?: LogicStyle;
  ignoreHiddenState?: boolean;
  transitionStyle?: TransitionStyle;
  powerStyle?: PowerStyle;
  
  // Functional
  bits?: number;
  tr?: string;
  encoding?: EncodingType;
  converterType?: ConverterType;
  
  // Range Params
  upperLimit?: string;
  lowerLimit?: string;
  
  // Comparator Specific
  enableMode?: ComparatorEnableMode;
}

export interface Block {
  id: string;
  baseId: string;
  type: 'component' | 'environment' | 'customization';
  label: string;
  description: string;
  params: BlockParams;
  customNotes?: string;
  isMandatory?: boolean;
}

export const LIBRARY_BLOCKS: Block[] = [
  { 
    id: 'env_global', 
    baseId: 'env_global',
    type: 'environment', 
    label: 'Global Configuration', 
    description: 'Infrastructure and supply settings', 
    isMandatory: true,
    params: { 
      moduleName: '', 
      namingStyle: 'lowercase',
      vdd: 1.2, 
      vss: 0.0, 
      resetStyle: 'async-active-low', 
      masterEnableStyle: 'async-active-high',
      ignoreHiddenState: true,
      transitionStyle: 'global-macro',
      powerStyle: 'dedicated-ports'
    }
  },
  { 
    id: 'adc', 
    baseId: 'adc',
    type: 'component', 
    label: 'Analog to Digital Converter', 
    description: 'High speed sampling', 
    params: { bits: 12, encoding: 'binary', upperLimit: '1.2', lowerLimit: '0.0', enableMode: 'always-enabled', converterType: 'clocked' } 
  },
  { 
    id: 'dac', 
    baseId: 'dac',
    type: 'component', 
    label: 'Digital to Analog Converter', 
    description: 'Precision voltage output', 
    params: { bits: 12, encoding: 'binary', upperLimit: '1.2', lowerLimit: '0.0', enableMode: 'always-enabled', converterType: 'static' } 
  },
  { 
    id: 'tdc', 
    baseId: 'tdc',
    type: 'component', 
    label: 'Time to Digital Converter', 
    description: 'Delay measurement', 
    params: { bits: 10, encoding: 'binary', upperLimit: '200p', lowerLimit: '100p', enableMode: 'always-enabled', converterType: 'clocked' } 
  },
  { 
    id: 'dtc', 
    baseId: 'dtc',
    type: 'component', 
    label: 'Digital to Time Converter', 
    description: 'Phase interpolation', 
    params: { bits: 10, encoding: 'binary', upperLimit: '200p', lowerLimit: '100p', enableMode: 'always-enabled', converterType: 'static' } 
  }
];

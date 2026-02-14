
import React, { useState, useEffect, useRef } from 'react';
import { 
  CpuIcon, 
  Settings2Icon, 
  Trash2Icon, 
  CopyIcon, 
  CheckIcon, 
  RefreshCcwIcon,
  SparklesIcon,
  FileCodeIcon,
  Loader2Icon,
  PlusCircleIcon,
  GripVerticalIcon,
  LayoutIcon,
  Wand2Icon,
  InfoIcon,
  XIcon,
  Code2Icon,
  LibraryIcon
} from 'lucide-react';
import { ModelConfig, DEFAULT_CONFIG, Block, LIBRARY_BLOCKS, BlockParams } from './types';
import { startNewSession, refineModel } from './services/geminiService';

const App: React.FC = () => {
  const [recipe, setRecipe] = useState<Block[]>([]);
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'recipe' | 'reference'>('recipe');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    startNewSession(config, referenceCode);
  }, [config, referenceCode]);

  const updateBlockParam = (id: string, key: keyof BlockParams, value: any) => {
    setRecipe(prev => prev.map(b => b.id === id ? {
      ...b,
      params: { ...b.params, [key]: value }
    } : b));
  };

  const constructPrompt = () => {
    const parts = recipe.map(b => {
      let prompt = b.basePrompt;
      if (b.params) {
        if (b.params.bits !== undefined) prompt += ` with ${b.params.bits} bits`;
        if (b.params.polarity) prompt += ` (${b.params.polarity}-active)`;
        if (b.params.vstep !== undefined) prompt += ` at ${b.params.vstep}V step`;
        if (b.params.vth !== undefined) prompt += ` with ${b.params.vth}V threshold`;
        if (b.params.tr) prompt += ` with transition time ${b.params.tr}`;
        if (b.params.gain !== undefined) prompt += ` with gain factor ${b.params.gain}`;
        if (b.params.freq) prompt += ` centered at ${b.params.freq}`;
      }
      return prompt;
    });
    return parts.join(', ');
  };

  const handleGenerate = async () => {
    if (recipe.length === 0 && !referenceCode.trim()) return;
    setLoading(true);
    const prompt = recipe.length > 0 
      ? `Synthesize a professional Verilog-A module of ${constructPrompt()}.`
      : "Synthesize a new Verilog-A module based on the provided reference code style and structure.";
    
    try {
      const { code, explanation } = await refineModel(prompt + " Adhere to the configured transition and header styles.");
      setGeneratedCode(code);
      setExplanation(explanation);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addBlockToRecipe = (block: Block) => {
    setRecipe(prev => [...prev, { ...block, id: `${block.id}-${Date.now()}` }]);
    setActiveTab('recipe');
  };

  const removeBlock = (id: string) => {
    setRecipe(prev => prev.filter(b => b.id !== id));
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetAll = () => {
    setRecipe([]);
    setReferenceCode('');
    setGeneratedCode(null);
    setExplanation(null);
    startNewSession(config, '');
  };

  const onDragStart = (block: Block) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/veriloga-block', JSON.stringify(block));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/veriloga-block');
    if (data) addBlockToRecipe(JSON.parse(data));
  };

  const categories = Array.from(new Set(LIBRARY_BLOCKS.map(b => b.category)));

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* library Pane */}
      <aside className="w-64 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm z-20">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <CpuIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">Element Pool</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
          {categories.map(cat => (
            <div key={cat} className="space-y-1.5">
              <h3 className="px-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-indigo-200 ml-1">{cat}</h3>
              <div className="grid grid-cols-2 gap-1.5 p-1">
                {LIBRARY_BLOCKS.filter(b => b.category === cat).map(block => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={onDragStart(block)}
                    onClick={() => addBlockToRecipe(block)}
                    className="p-1.5 bg-slate-50 border border-slate-100 rounded-md cursor-grab hover:border-indigo-400 hover:bg-white transition-all group active:scale-95 shadow-xs flex flex-col items-center justify-center text-center"
                  >
                    <span className="text-[9px] font-bold text-slate-700 leading-tight mb-0.5">{block.label}</span>
                    <div className="w-4 h-1 bg-slate-200 rounded-full group-hover:bg-indigo-300"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
          <div className="space-y-3">
             <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Global Config</h3>
             <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Supply Ports', key: 'includePowerPorts' },
                  { label: 'Noise Injection', key: 'includeNoise' },
                  { label: 'Ignore Hidden State', key: 'ignoreHiddenState' }
                ].map(opt => (
                  <label key={opt.key} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white cursor-pointer group">
                    <span className="text-[9px] font-bold text-slate-500 group-hover:text-indigo-600 uppercase tracking-tighter">{opt.label}</span>
                    <input 
                      type="checkbox" 
                      className="w-3 h-3 rounded accent-indigo-600"
                      checked={(config as any)[opt.key]}
                      onChange={e => setConfig({...config, [opt.key]: e.target.checked})}
                    />
                  </label>
                ))}
                
                <div className="px-2 py-1.5 space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Transition Style</span>
                  <select 
                    value={config.transitionStyle}
                    onChange={e => setConfig({...config, transitionStyle: e.target.value as any})}
                    className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[9px] font-bold outline-none focus:border-indigo-400 transition-all"
                  >
                    <option value="parameter">Module Parameter (tr)</option>
                    <option value="macro">`default_transition Macro</option>
                  </select>
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Input Workspace with Tabs */}
      <section 
        className="w-[420px] h-full bg-slate-100/30 border-r border-slate-200 flex flex-col shrink-0 relative"
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
      >
        <div className="bg-white border-b border-slate-200 flex items-center justify-between px-2">
          <div className="flex">
            <button 
              onClick={() => setActiveTab('recipe')}
              className={`flex items-center gap-2 px-4 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'recipe' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <LibraryIcon className="w-3.5 h-3.5" /> Recipe
            </button>
            <button 
              onClick={() => setActiveTab('reference')}
              className={`flex items-center gap-2 px-4 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'reference' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <Code2Icon className="w-3.5 h-3.5" /> Reference
            </button>
          </div>
          <button 
            onClick={resetAll}
            className="text-[9px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors px-3 py-1 rounded hover:bg-red-50 mr-2"
          >
            <Trash2Icon className="w-3 h-3" /> Reset
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200">
          {activeTab === 'recipe' ? (
            <div className="space-y-4">
              {recipe.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl opacity-40 group">
                  <PlusCircleIcon className="w-8 h-8 text-slate-300 mb-2 group-hover:text-indigo-300 transition-colors" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Architect your model by dropping blocks</p>
                </div>
              ) : (
                recipe.map((block) => (
                  <div key={block.id} className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm group animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 text-[10px] font-black text-indigo-500">
                          {block.label.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[12px] font-black text-slate-800 tracking-tight">{block.label}</span>
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">{block.category}</p>
                        </div>
                      </div>
                      <button onClick={() => removeBlock(block.id)} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-300 transition-all">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {block.params && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-50 pt-4">
                        {block.params.bits !== undefined && (
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bit Width</label>
                            <input 
                              type="number"
                              value={block.params.bits}
                              onChange={(e) => updateBlockParam(block.id, 'bits', parseInt(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                            />
                          </div>
                        )}
                        {block.params.polarity !== undefined && (
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Polarity</label>
                            <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                               {['high', 'low'].map(p => (
                                 <button
                                   key={p}
                                   onClick={() => updateBlockParam(block.id, 'polarity', p)}
                                   className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${block.params?.polarity === p ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   {p}
                                 </button>
                               ))}
                            </div>
                          </div>
                        )}
                        {block.params.vstep !== undefined && (
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Step size (V)</label>
                            <input 
                              type="number"
                              step="0.05"
                              value={block.params.vstep}
                              onChange={(e) => updateBlockParam(block.id, 'vstep', parseFloat(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                            />
                          </div>
                        )}
                        {block.params.tr !== undefined && (
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Transition Time</label>
                            <input 
                              type="text"
                              value={block.params.tr}
                              onChange={(e) => updateBlockParam(block.id, 'tr', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-mono"
                              placeholder="e.g. 10n"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-300">
               <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                  <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">Reference Studio</h3>
                  <p className="text-[10px] text-indigo-400 leading-relaxed font-medium">Paste reference Verilog-A code or custom module patterns. The AI will prioritize these structural signatures in synthesis.</p>
               </div>
               <div className="flex-1 bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm relative focus-within:border-indigo-400 transition-colors">
                  <div className="absolute top-3 left-4 text-[9px] font-bold text-slate-300 uppercase pointer-events-none">Reference Code Area</div>
                  <textarea 
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    className="w-full h-full p-8 pt-10 text-[12px] font-mono text-slate-800 outline-none resize-none selection:bg-indigo-100 scrollbar-hide"
                    placeholder="module dac_ref(out, in, vdd, vss); ..."
                  />
               </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button 
            disabled={(recipe.length === 0 && !referenceCode.trim()) || loading}
            onClick={handleGenerate}
            className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all ${
              (recipe.length === 0 && !referenceCode.trim()) || loading 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 hover:-translate-y-1 active:translate-y-0 active:scale-95'
            }`}
          >
            {loading ? <Loader2Icon className="w-5 h-5 animate-spin" /> : <Wand2Icon className="w-5 h-5" />}
            {loading ? 'Synthesizing...' : 'Synthesize Verilog-A'}
          </button>
        </div>
      </section>

      {/* Code Canvas Pane */}
      <main className="flex-1 h-full bg-[#fafafa] flex flex-col min-w-0 shadow-inner relative overflow-hidden">
        <header className="px-8 py-5 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-4 h-4 text-indigo-600 fill-indigo-600/10" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Generated Canvas</h2>
          </div>
          {generatedCode && (
            <button 
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-[10px] font-black uppercase transition-all text-white shadow-lg shadow-indigo-100"
            >
              {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Source'}
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-10 scrollbar-thin scrollbar-thumb-slate-200">
          {!generatedCode && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-40">
              <div className="relative">
                 <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-10 rounded-full animate-pulse"></div>
                 <div className="relative w-24 h-24 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-center rotate-3 shadow-xl">
                    <FileCodeIcon className="w-12 h-12 text-slate-300" />
                 </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Synthesis Idle</p>
                <p className="text-sm text-slate-300 max-w-[280px] leading-relaxed font-medium">Build your model using blocks or provide a reference code structure to begin.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-pulse">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="text-center space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Synthesizing Verilog-A</p>
              </div>
            </div>
          )}

          {generatedCode && !loading && (
            <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/90"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500/90"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500/90"></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono border-l border-slate-700 pl-4">generated_model.va</span>
                  </div>
                  <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Standard: VAMS 2.4</div>
                </div>
                <div className="p-10 overflow-x-auto bg-[#0d1117] relative">
                  <div className="absolute top-0 left-0 w-12 h-full bg-[#161b22] border-r border-slate-800 flex flex-col pt-10 text-[11px] font-mono text-slate-700 text-right pr-3 select-none leading-7 opacity-50">
                    {generatedCode.split('\n').map((_, i) => <div key={i}>{i+1}</div>)}
                  </div>
                  <pre className="code-font text-[13px] leading-7 text-blue-50/90 whitespace-pre ml-8 selection:bg-indigo-500/30">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              </div>

              {explanation && (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 space-y-8 shadow-sm ring-1 ring-slate-900/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[4rem] -mr-8 -mt-8 opacity-50"></div>
                  <div className="flex items-center gap-4 text-indigo-600 border-b border-slate-100 pb-6">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                      <InfoIcon className="w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="text-[11px] font-black uppercase tracking-widest">Model Documentation</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Architectural Summary</p>
                    </div>
                  </div>
                  <div className="text-[14px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                    {explanation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">
          <div className="flex items-center gap-6">
             <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Verilog-A 2.4 Compliant</span>
             <span className="text-slate-200 text-xs">|</span>
             <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Optimized for Cadence Spectre</span>
          </div>
          <span>Sculptor Studio v2.0</span>
        </footer>
      </main>

    </div>
  );
};

export default App;

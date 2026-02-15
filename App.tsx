
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  CopyIcon, CheckIcon, RefreshCcwIcon, FileCodeIcon, 
  Loader2Icon, Wand2Icon, InfoIcon, XIcon, LayersIcon, 
  PlusCircleIcon, Settings2Icon, MessageSquareCodeIcon, SparklesIcon,
  BracesIcon, UsersIcon, MenuIcon
} from 'lucide-react';
import { Block, LIBRARY_BLOCKS, BlockParams, LogicStyle } from './types';
import { startNewSession, refineModel } from './services/geminiService';

const App: React.FC = () => {
  const [recipe, setRecipe] = useState<Block[]>(() => [LIBRARY_BLOCKS.find(b => b.id === 'env_global')!]);
  const [customization, setCustomization] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Resizable column widths
  const [leftWidth, setLeftWidth] = useState(220); // Sidebar
  const [midWidth, setMidWidth] = useState(480);  // Recipe Zone

  const isResizingLeft = useRef(false);
  const isResizingMid = useRef(false);

  useEffect(() => {
    const env = recipe.find(b => b.id === 'env_global')!;
    startNewSession(env.params, customization);
  }, [recipe, customization]);

  const startResizingLeft = useCallback(() => { isResizingLeft.current = true; document.body.style.cursor = 'col-resize'; }, []);
  const startResizingMid = useCallback(() => { isResizingMid.current = true; document.body.style.cursor = 'col-resize'; }, []);

  const stopResizing = useCallback(() => {
    isResizingLeft.current = false;
    isResizingMid.current = false;
    document.body.style.cursor = 'default';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingLeft.current) {
      setLeftWidth(Math.max(160, Math.min(400, e.clientX)));
    }
    if (isResizingMid.current) {
      setMidWidth(Math.max(300, Math.min(800, e.clientX - leftWidth)));
    }
  }, [leftWidth]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  const updateBlockParam = (id: string, key: keyof BlockParams, value: any) => {
    setRecipe(prev => prev.map(b => b.id === id ? {
      ...b, params: { ...b.params, [key]: value }
    } : b));
  };

  const handleGenerate = async () => {
    const main = recipe.find(b => !b.isMandatory);
    if (!main) return;
    setLoading(true);
    // Scroll to results on mobile
    if (window.innerWidth < 768) {
      const mainEl = document.querySelector('main');
      mainEl?.scrollIntoView({ behavior: 'smooth' });
    }
    
    try {
      const prompt = `Generate Verilog-A for ${main.label}. Config: ${JSON.stringify(main.params)}. Global: ${JSON.stringify(recipe.find(b => b.isMandatory)!.params)}. User: ${customization}`;
      const { code, explanation } = await refineModel(prompt);
      setGeneratedCode(code);
      setExplanation(explanation);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addBlockToRecipe = (block: Block) => {
    setRecipe(prev => {
      const env = prev.find(b => b.isMandatory)!;
      return [{ ...block, id: `${block.id}-${Date.now()}` }, env];
    });
    setMobileMenuOpen(false);
  };

  const removeBlock = (id: string) => {
    if (recipe.find(b => b.id === id)?.isMandatory) return;
    setRecipe(prev => prev.filter(b => b.id !== id));
  };

  const CompactSelector = ({ options, current, onSelect, label, snippet, vertical }: { options: {id: string, label: string, sub?: string}[], current: string, onSelect: (id: any) => void, label: string, snippet?: string, vertical?: boolean }) => (
    <div className={`flex flex-col py-2 border-b border-slate-100 last:border-0 group transition-all`}>
      <div className={`flex ${vertical ? 'flex-col gap-2' : 'items-center justify-between'}`}>
        <span className="text-[10px] font-bold text-slate-900 transition-colors uppercase tracking-wider">{label}</span>
        <div className={`flex ${vertical ? 'flex-col w-full' : 'gap-1'} bg-white p-0.5 rounded-lg border border-slate-300`}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`px-3 py-1.5 text-[9px] font-bold rounded-md transition-all flex items-center justify-between ${current === opt.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-900 hover:bg-slate-50'}`}
            >
              <span>{opt.label}</span>
              {opt.sub && <span className={`${current === opt.id ? 'text-indigo-100' : 'text-slate-500'} font-mono ml-2 text-[8px]`}>{opt.sub}</span>}
            </button>
          ))}
        </div>
      </div>
      {snippet && (
        <code className="mt-2 text-[9px] font-mono text-indigo-700 block bg-indigo-50/50 p-2.5 rounded-lg whitespace-pre overflow-x-auto border border-indigo-100">
          {snippet}
        </code>
      )}
    </div>
  );

  const mainBlock = recipe.find(b => !b.isMandatory);
  const envBlock = recipe.find(b => b.isMandatory)!;

  const snippets = useMemo(() => {
    const p = envBlock.params;
    let name = p.moduleName || 'analog_block';
    if (p.namingStyle === 'uppercase') name = name.toUpperCase();
    
    const formatPort = (style: LogicStyle | undefined, portName: string) => {
      if (!style || style === 'none') return `/* No ${portName} logic */`;
      const [type, polarity, active] = style.split('-');
      const isLow = active === 'low';
      const cond = isLow ? `< vth` : `> vth`;
      
      if (type === 'sync') {
        return `input electrical clk, ${portName};\n\n@(cross(V(clk) - vth, +1)) begin\n    if (V(${portName}) ${cond}) begin\n        // reset/enable triggered\n    end\nend`;
      }
      return `input electrical ${portName};\n// ASYNC logic\nif (V(${portName}) ${cond}) begin ... end`;
    };

    return {
      name: `module ${name}(...);`,
      hidden: p.ignoreHiddenState ? `(* ignore_hidden_state *)\nmodule ${name}(...);` : `module ${name}(...);`,
      transition: p.transitionStyle === 'global-macro' ? '`define default_transition 10p' : 'parameter real tr = 10p;',
      power: p.powerStyle === 'dedicated-ports' ? 
        `inout electrical vdd, vss;\nanalog begin\n    @(initial_step) begin\n        vh  = V(vdd);\n        vl  = V(vss);\n        vth = (vh + vl) / 2.0;\n    end\nend` : 
        `parameter real vdd = ${p.vdd};\nparameter real vss = ${p.vss};\nparameter real vth = ${(p.vdd! + p.vss!) / 2.0};`,
      reset: formatPort(p.resetStyle, 'reset'),
      enable: formatPort(p.masterEnableStyle, 'enable'),
    };
  }, [envBlock.params]);

  const logicOptions = [
    {id:'async-active-low', label:'Async Low'},
    {id:'async-active-high', label:'Async High'},
    {id:'sync-active-low', label:'Sync Low'},
    {id:'sync-active-high', label:'Sync High'},
    {id:'none', label:'None'}
  ];

  const GITHUB_URL = "https://github.com/Arcadia-1/veriloga-skills";

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white text-slate-900 font-sans md:overflow-hidden overflow-y-auto">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">VA</span>
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Sculptor</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
          <MenuIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar - Element Pool */}
      <aside 
        style={{ width: window.innerWidth >= 768 ? leftWidth : '100%' }} 
        className={`${mobileMenuOpen ? 'flex' : 'hidden md:flex'} h-full border-r border-slate-200 flex-col shrink-0 bg-white relative z-40 transition-all`}
      >
        <div className="hidden md:flex p-5 border-b border-slate-100 items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-black text-xs">VA</span>
          </div>
          <h1 className="text-[11px] font-black text-slate-900 leading-tight">
            Verilog-A<br/><span className="text-indigo-600">Sculptor</span>
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
          <div className="space-y-1.5">
            <p className="px-2 text-[9px] font-black text-slate-900 uppercase tracking-widest">Element Pool</p>
            <div className="space-y-1">
              {LIBRARY_BLOCKS.filter(b => !b.isMandatory).map(block => (
                <button
                  key={block.id}
                  onClick={() => addBlockToRecipe(block)}
                  className="w-full p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center gap-4 group text-left shadow-sm"
                >
                  <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                    <LayersIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[12px] font-black text-slate-900 uppercase tracking-tighter">{block.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-3 border-t border-slate-100 bg-slate-50">
           <button onClick={() => { setRecipe([LIBRARY_BLOCKS.find(b => b.id === 'env_global')!]); setGeneratedCode(null); }} className="w-full py-2.5 text-slate-900 hover:text-red-600 font-black rounded-lg transition-all text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 border border-slate-200 bg-white hover:border-red-200">
              <RefreshCcwIcon className="w-3 h-3" /> Reset Session
           </button>
        </div>

        {/* Resizer Handle */}
        <div 
          onMouseDown={startResizingLeft}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 transition-colors z-30 hidden md:block" 
        />
      </aside>

      {/* Recipe Zone Workspace */}
      <section 
        style={{ width: window.innerWidth >= 768 ? midWidth : '100%' }} 
        className="h-full border-r border-slate-200 flex flex-col shrink-0 bg-white relative"
      >
        <header className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
          <h2 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Recipe Zone</h2>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide">
          
          {/* Main Core Block */}
          {mainBlock ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-base font-black text-slate-900 tracking-tight">{mainBlock.label}</h3>
                   <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">Type: {mainBlock.baseId.toUpperCase()}</span>
                </div>
                <button onClick={() => removeBlock(mainBlock.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                {/* 1. BITS */}
                <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                   <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Resolution</span>
                   <div className="flex items-center gap-2">
                      <input type="number" min="1" max="64" value={mainBlock.params.bits} onChange={(e) => updateBlockParam(mainBlock.id, 'bits', parseInt(e.target.value))} className="w-14 bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-center text-[11px] font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-100" />
                      <span className="text-[9px] text-slate-900 font-bold uppercase tracking-tight">bits</span>
                   </div>
                </div>

                {/* 2. SCALE (RANGE) */}
                <div className="py-3 border-b border-slate-100">
                   <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-2.5">
                     {mainBlock.id.includes('dc') ? 'Analog Scaling (Full Scale)' : 'Temporal Scaling (Limit)'}
                   </p>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                         <span className="text-[8px] font-black text-slate-800 uppercase">Lower Limit</span>
                         <input value={mainBlock.params.lowerLimit} onChange={(e) => updateBlockParam(mainBlock.id, 'lowerLimit', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[11px] font-mono font-bold text-slate-900 outline-none focus:border-indigo-400" />
                      </div>
                      <div className="space-y-1.5">
                         <span className="text-[8px] font-black text-slate-800 uppercase">Upper Limit</span>
                         <input value={mainBlock.params.upperLimit} onChange={(e) => updateBlockParam(mainBlock.id, 'upperLimit', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[11px] font-mono font-bold text-slate-900 outline-none focus:border-indigo-400" />
                      </div>
                   </div>
                </div>

                {/* 3. CLOCK / CONVERTER TYPE */}
                <CompactSelector 
                  label="Converter Engine"
                  options={[{id:'static', label:'Static Converter'}, {id:'clocked', label:'Clock Driven'}]}
                  current={mainBlock.params.converterType!}
                  onSelect={(v) => updateBlockParam(mainBlock.id, 'converterType', v)}
                />

                {/* 4. ENCODING (Vertical) */}
                <CompactSelector 
                  vertical
                  label="Data Encoding Scheme"
                  options={[
                    {id:'binary', label:'Binary', sub: '7 -> 0111'}, 
                    {id:'gray', label:'Gray Code', sub: '7 -> 0100'}, 
                    {id:'thermometer', label:'Thermometer', sub: '3 -> 0...111'}, 
                    {id:'one-hot', label:'One-Hot', sub: '3 -> 1000'}
                  ]}
                  current={mainBlock.params.encoding!}
                  onSelect={(v) => updateBlockParam(mainBlock.id, 'encoding', v)}
                />
              </div>
            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50">
               <PlusCircleIcon className="w-8 h-8 text-slate-400 mb-2" />
               <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Select Element to Sculpt</p>
            </div>
          )}

          {/* Global Environment Settings */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-2">
               Infrastructure Settings <Settings2Icon className="w-3.5 h-3.5 text-indigo-600" />
            </h3>
            
            <div className="space-y-1">
              <div className="flex flex-col py-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-2">Module Naming</span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={envBlock.params.moduleName} 
                    onChange={(e) => updateBlockParam(envBlock.id, 'moduleName', e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-[11px] font-mono font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Auto-generated"
                  />
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300 shrink-0">
                    <button onClick={() => updateBlockParam(envBlock.id, 'namingStyle', 'lowercase')} className={`px-2 py-1 text-[8px] font-black rounded ${envBlock.params.namingStyle === 'lowercase' ? 'bg-white text-indigo-600 shadow' : 'text-slate-600'}`}>abc</button>
                    <button onClick={() => updateBlockParam(envBlock.id, 'namingStyle', 'uppercase')} className={`px-2 py-1 text-[8px] font-black rounded ${envBlock.params.namingStyle === 'uppercase' ? 'bg-white text-indigo-600 shadow' : 'text-slate-600'}`}>ABC</button>
                  </div>
                </div>
              </div>

              <CompactSelector 
                label="Header Metadata"
                options={[{id:'true', label:'Ignore Hidden'}, {id:'false', label:'Standard'}]}
                current={String(envBlock.params.ignoreHiddenState)}
                onSelect={(v) => updateBlockParam(envBlock.id, 'ignoreHiddenState', v === 'true')}
                snippet={snippets.hidden}
              />

              <CompactSelector 
                label="Transition Style"
                options={[{id:'global-macro', label:'Global Macro'}, {id:'module-parameter', label:'Module Parameter'}]}
                current={envBlock.params.transitionStyle!}
                onSelect={(v) => updateBlockParam(envBlock.id, 'transitionStyle', v)}
                snippet={snippets.transition}
              />

              <CompactSelector 
                label="Power Rails Definition"
                options={[{id:'dedicated-ports', label:'Ports Interface'}, {id:'parameter-defined', label:'Params Defined'}]}
                current={envBlock.params.powerStyle!}
                onSelect={(v) => updateBlockParam(envBlock.id, 'powerStyle', v)}
                snippet={snippets.power}
              />

              {envBlock.params.powerStyle === 'parameter-defined' && (
                <div className="bg-indigo-50/50 p-3.5 rounded-xl space-y-2 border border-indigo-200 mt-1.5 animate-in slide-in-from-top-1">
                   <div className="grid grid-cols-1 gap-2">
                      <div className="relative">
                         <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-600">VDD</span>
                         <input type="number" step="0.1" value={envBlock.params.vdd} onChange={(e) => updateBlockParam(envBlock.id, 'vdd', parseFloat(e.target.value))} className="w-full bg-white border border-indigo-200 rounded-lg pl-9 pr-2 py-2 text-[11px] font-black text-slate-900 outline-none" />
                      </div>
                      <div className="relative">
                         <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-600">VSS</span>
                         <input type="number" step="0.1" value={envBlock.params.vss} onChange={(e) => updateBlockParam(envBlock.id, 'vss', parseFloat(e.target.value))} className="w-full bg-white border border-indigo-200 rounded-lg pl-9 pr-2 py-2 text-[11px] font-black text-slate-900 outline-none" />
                      </div>
                      <div className="relative">
                         <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-600">VTH</span>
                         <input disabled type="number" step="0.1" value={(envBlock.params.vdd! + envBlock.params.vss!) / 2.0} className="w-full bg-slate-50 border border-indigo-100 rounded-lg pl-9 pr-2 py-2 text-[11px] font-black text-slate-500 outline-none cursor-not-allowed" />
                      </div>
                   </div>
                </div>
              )}

              <CompactSelector 
                label="Reset Style"
                options={logicOptions}
                current={envBlock.params.resetStyle!}
                onSelect={(v) => updateBlockParam(envBlock.id, 'resetStyle', v)}
                snippet={snippets.reset}
              />

              <CompactSelector 
                label="Master Enable Style"
                options={logicOptions}
                current={envBlock.params.masterEnableStyle!}
                onSelect={(v) => updateBlockParam(envBlock.id, 'masterEnableStyle', v)}
                snippet={snippets.enable}
              />
            </div>
          </div>

          {/* Customization Textarea */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
               Refined Prompting <MessageSquareCodeIcon className="w-3.5 h-3.5 text-indigo-600" />
            </h3>
            <textarea 
              value={customization}
              onChange={(e) => setCustomization(e.target.value)}
              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[11px] text-slate-900 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all resize-none shadow-inner"
              placeholder="Inject proprietary logic, specific non-idealities, or custom interface requirements..."
            />
          </div>

        </div>

        <div className="p-5 border-t border-slate-100 bg-white">
          <button 
            disabled={!mainBlock || loading} 
            onClick={handleGenerate} 
            className={`w-full py-3.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] ${ !mainBlock || loading ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200' : 'bg-slate-900 text-white hover:bg-indigo-700' }`}
          >
            {loading ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <Wand2Icon className="w-4 h-4" />}
            {loading ? 'Processing Model...' : 'Sculpt Verilog-A Model'}
          </button>
        </div>

        {/* Resizer Handle */}
        <div 
          onMouseDown={startResizingMid}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 transition-colors z-30 hidden md:block" 
        />
      </section>

      {/* Code Zone Output Area */}
      <main className="flex-1 h-full bg-slate-50 flex flex-col min-w-0 overflow-hidden relative">
        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
             <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Synthesis Canvas</h2>
          </div>
          <div className="flex items-center gap-3">
             {generatedCode && (
               <button onClick={() => {navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(()=>setCopied(false),2000)}} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all">
                 {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                 {copied ? 'Copied' : 'Copy'}
               </button>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center scrollbar-thin">
           {!generatedCode && !loading && (
             <div className="h-full py-20 flex flex-col items-center justify-center text-center opacity-30 select-none">
               <FileCodeIcon className="w-20 h-20 text-slate-600 mb-6 stroke-[0.5]" />
               <p className="text-[14px] font-black text-slate-900 uppercase tracking-[0.5em]">Synthesis Idle</p>
             </div>
           )}

           {loading && (
             <div className="h-full py-20 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
               <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-xl animate-pulse rounded-full"></div>
                  <div className="relative w-12 h-12 border-[4px] border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
               </div>
               <p className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.4em] animate-pulse">Sculpting Silicon-ready Logic...</p>
             </div>
           )}

           {generatedCode && !loading && (
             <div className="w-full max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-3 duration-700 pb-12">
               <div className="bg-[#0d1117] rounded-2xl shadow-2xl overflow-hidden group border border-slate-800 ring-1 ring-white/10 relative">
                 <button 
                  onClick={() => {navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(()=>setCopied(false),2000)}}
                  className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                 >
                   {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                 </button>
                 <div className="px-6 py-3.5 bg-[#161b22] border-b border-slate-800 flex justify-between items-center">
                    <div className="flex gap-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest">
                      {(envBlock.params.moduleName || 'model_output').toLowerCase()}.va
                    </span>
                 </div>
                 <div className="p-4 md:p-8 overflow-x-auto selection:bg-indigo-500/30">
                   <pre className="code-font text-[12px] leading-6 text-indigo-50/95 whitespace-pre"><code>{generatedCode}</code></pre>
                 </div>
               </div>
               
               {explanation && (
                 <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-5 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
                   <div className="flex items-center gap-4 text-indigo-700 border-b border-slate-100 pb-4 relative z-10">
                      <div className="p-2.5 bg-indigo-100 rounded-xl"><InfoIcon className="w-5 h-5" /></div>
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Sculptor Insights</h3>
                   </div>
                   <div className="text-[13px] text-slate-900 leading-relaxed font-bold whitespace-pre-wrap relative z-10">{explanation}</div>
                 </div>
               )}
             </div>
           )}
        </div>
        
        <footer className="px-4 md:px-8 py-4 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-slate-900 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-2 transition-colors">
                 <SparklesIcon className="w-4 h-4 text-indigo-600" /> Agent skills
              </a>
              <span id="busuanzi_container_site_pv" className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 md:border-l md:border-slate-200 md:pl-8">
                 <UsersIcon className="w-4 h-4 text-emerald-600" /> View: <span id="busuanzi_value_site_pv" className="text-emerald-600"></span>
              </span>
           </div>
           <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">© 2026 Token Zhang</span>
        </footer>
      </main>
    </div>
  );
};

export default App;

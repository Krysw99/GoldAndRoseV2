import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Check, Delete, Keyboard, Move } from 'lucide-react';

interface NumpadCalculatorProps {
  // Can be left empty as we'll listen globally for focus
}

export default function NumpadCalculator({}: NumpadCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState('');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState<HTMLInputElement | null>(null);
  const [keyboardMode, setKeyboardMode] = useState<'calculator' | 'native'>('calculator');

  // Draggable window state
  const [position, setPosition] = useState({ x: 100, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Keep track of elements that we set inputmode="none" on, so we can restore them
  const originalInputModesRef = useRef<Map<HTMLInputElement, string>>(new Map());

  // Detect whether an input requires numbers and should trigger the calculator
  const isNumericInput = (el: HTMLInputElement): boolean => {
    const type = (el.type || '').toLowerCase();
    const inputMode = (el.getAttribute('inputmode') || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const classes = (el.className || '').toLowerCase();

    // Check if explicitly typed/marked as numeric
    if (type === 'number') return true;
    if (inputMode === 'numeric' || inputMode === 'decimal') return true;
    if (classes.includes('numpad-input')) return true;

    // Check if name/id/placeholder suggests a numeric field
    const numericKeywords = [
      'weight', 'gram', 'ct', 'carat', 'price', 'rate', 'cost', 'markup', 
      'discount', 'purity', 'size', 'width', 'multiplier', 'fee', 
      'amount', 'spot', 'qty', 'quantity', 'fraction', 'purity'
    ];

    const isExplicitlyNumeric = numericKeywords.some(keyword => 
      name.includes(keyword) || 
      id.includes(keyword) || 
      placeholder.includes(keyword)
    );

    // Exclude fields that are clearly textual or identity-based
    const excludeKeywords = [
      'name', 'email', 'address', 'phone', 'license', 'id', 'desc', 
      'job', 'note', 'signature', 'search', 'password', 'date', 'num', 'text'
    ];

    const shouldExclude = excludeKeywords.some(keyword => 
      name.includes(keyword) || 
      id.includes(keyword) || 
      placeholder.includes(keyword)
    );

    if (shouldExclude && type !== 'number') {
      return false;
    }

    return isExplicitlyNumeric;
  };

  // Setup global event delegation for inputs
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (!target || target.tagName !== 'INPUT') return;

      if (isNumericInput(target)) {
        // Prevent native keyboard from popping up on mobile/iPad
        if (keyboardMode === 'calculator') {
          // Store original inputmode to restore it later
          if (!originalInputModesRef.current.has(target)) {
            originalInputModesRef.current.set(target, target.getAttribute('inputmode') || '');
          }
          target.setAttribute('inputmode', 'none');
        }

        // Initialize calculator with current input value
        const currentVal = target.value;
        setDisplay(currentVal || '0');
        setHistory('');
        setPrevValue(null);
        setOperation(null);
        setActiveInput(target);
        setIsOpen(true);

        // Position calculator reasonably close to the viewport center or slightly offset
        // to avoid covering the bottom inputs, but keeping it visible.
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Place it on the right side of the screen by default to avoid blocking central content
        setPosition({
          x: Math.max(20, width - 380),
          y: Math.max(20, height / 2 - 250)
        });
      } else {
        // If focusing a text field (e.g. name, email), make sure native keyboard triggers
        target.removeAttribute('inputmode');
        // Close numeric calculator so it doesn't clutter the screen
        setIsOpen(false);
        setActiveInput(null);
      }
    };

    const handleInputClick = (e: MouseEvent) => {
      const target = e.target as HTMLInputElement;
      if (!target || target.tagName !== 'INPUT') return;

      if (isNumericInput(target) && !isOpen) {
        // Trigger same opening logic if clicked while already focused
        if (keyboardMode === 'calculator') {
          target.setAttribute('inputmode', 'none');
        }
        setDisplay(target.value || '0');
        setHistory('');
        setPrevValue(null);
        setOperation(null);
        setActiveInput(target);
        setIsOpen(true);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('click', handleInputClick);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('click', handleInputClick);
    };
  }, [keyboardMode, isOpen]);

  // Handle dragging the calculator window
  const handleDragStart = (e: React.PointerEvent) => {
    // Only drag via the header bar or the move icon
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) return;

    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    if (calculatorRef.current) {
      calculatorRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;

    // Bound within window limits
    const boundedX = Math.max(10, Math.min(window.innerWidth - 340, newX));
    const boundedY = Math.max(10, Math.min(window.innerHeight - 480, newY));

    setPosition({ x: boundedX, y: boundedY });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (calculatorRef.current) {
      calculatorRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Helper to programmatically trigger React's onChange state hook in the target input
  const writeValueToInput = (valueStr: string) => {
    if (!activeInput) return;

    // Handle React state binding perfectly
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(activeInput, valueStr);
      const event = new Event('input', { bubbles: true });
      activeInput.dispatchEvent(event);
    } else {
      activeInput.value = valueStr;
      const event = new Event('change', { bubbles: true });
      activeInput.dispatchEvent(event);
    }
  };

  // Calculator logic
  const handleDigit = (digit: string) => {
    setDisplay((prev) => {
      if (prev === '0' && digit !== '.') return digit;
      if (digit === '.' && prev.includes('.')) return prev;
      return prev + digit;
    });
  };

  const handleOperator = (op: string) => {
    const current = parseFloat(display) || 0;
    
    if (prevValue === null) {
      setPrevValue(current);
      setHistory(`${current} ${op}`);
    } else if (operation) {
      const result = evaluateMath(prevValue, current, operation);
      setPrevValue(result);
      setHistory(`${result} ${op}`);
      setDisplay(result.toString());
    }
    
    setOperation(op);
    // Clear display on next digit entry
    setDisplay('0');
  };

  const handlePercentage = () => {
    const current = parseFloat(display) || 0;
    if (prevValue !== null && operation) {
      // Calculate percentage relative to the previous accumulator (e.g. 1000 + 10% = 1000 + 100)
      const percentVal = (prevValue * current) / 100;
      setDisplay(percentVal.toString());
    } else {
      // Standard division by 100
      setDisplay((current / 100).toString());
    }
  };

  const evaluateMath = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEquals = () => {
    if (prevValue === null || !operation) return;
    const current = parseFloat(display) || 0;
    const result = evaluateMath(prevValue, current, operation);
    
    setHistory(`${prevValue} ${operation} ${current} =`);
    setDisplay(result.toString());
    setPrevValue(null);
    setOperation(null);
    
    // Automatically write intermediate results to input
    writeValueToInput(result.toString());
  };

  const handleClear = () => {
    setDisplay('0');
    setHistory('');
    setPrevValue(null);
    setOperation(null);
    writeValueToInput('');
  };

  const handleBackspace = () => {
    setDisplay((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleToggleSign = () => {
    setDisplay((prev) => {
      if (prev === '0') return '0';
      if (prev.startsWith('-')) return prev.slice(1);
      return '-' + prev;
    });
  };

  const handleApply = () => {
    let finalValue = display;
    if (prevValue !== null && operation) {
      const current = parseFloat(display) || 0;
      const result = evaluateMath(prevValue, current, operation);
      finalValue = result.toString();
    }
    
    writeValueToInput(finalValue);
    setIsOpen(false);
  };

  const handleSwitchToNativeKeyboard = () => {
    setKeyboardMode('native');
    if (activeInput) {
      const orig = originalInputModesRef.current.get(activeInput) || '';
      if (orig) {
        activeInput.setAttribute('inputmode', orig);
      } else {
        activeInput.removeAttribute('inputmode');
      }
      activeInput.focus();
    }
    setIsOpen(false);
  };

  // Synchronize input focus value changes if they edit on physical keyboard directly
  useEffect(() => {
    if (!isOpen || !activeInput) return;
    
    const handleInputChange = () => {
      setDisplay(activeInput.value || '0');
    };

    activeInput.addEventListener('input', handleInputChange);
    return () => {
      activeInput.removeEventListener('input', handleInputChange);
    };
  }, [isOpen, activeInput]);

  if (!isOpen) return null;

  return (
    <div
      ref={calculatorRef}
      onPointerDown={handleDragStart}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none'
      }}
      className="fixed w-[320px] bg-slate-950/95 backdrop-blur-xl border border-brand-500/30 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] z-[9999] overflow-hidden select-none animate-in fade-in zoom-in duration-150"
    >
      {/* Header / Drag Bar */}
      <div className="drag-handle bg-brand-950 px-4 py-3 border-b border-brand-500/10 flex items-center justify-between cursor-move text-white">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-brand-gold animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-100">
            Smart Pad Calculator
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSwitchToNativeKeyboard}
            title="Use standard keyboard"
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            title="Close calculator"
            className="p-1 hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Screen Display */}
      <div className="bg-slate-900 p-4 border-b border-slate-800/80 flex flex-col items-end justify-center min-h-[84px]">
        {history && (
          <div className="text-[10px] font-mono text-slate-400 tracking-tight text-right mb-1">
            {history}
          </div>
        )}
        <div className="text-2xl font-black text-brand-gold font-mono tracking-tight break-all text-right select-all">
          {display}
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="p-3 bg-slate-950/60 grid grid-cols-4 gap-2">
        {/* Row 1 */}
        <button
          onClick={handleClear}
          className="h-11 bg-red-950/40 hover:bg-red-950/60 border border-red-900/30 text-red-300 font-black rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        >
          C
        </button>
        <button
          onClick={handleToggleSign}
          className="h-11 bg-slate-800/60 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        >
          ±
        </button>
        <button
          onClick={handlePercentage}
          className="h-11 bg-slate-800/60 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        >
          %
        </button>
        <button
          onClick={() => handleOperator('/')}
          className={`h-11 font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
            operation === '/' ? 'bg-brand-gold text-slate-950' : 'bg-brand-950 hover:bg-brand-900 text-brand-gold border border-brand-500/20'
          }`}
        >
          ÷
        </button>

        {/* Row 2 */}
        <button
          onClick={() => handleDigit('7')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          7
        </button>
        <button
          onClick={() => handleDigit('8')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          8
        </button>
        <button
          onClick={() => handleDigit('9')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          9
        </button>
        <button
          onClick={() => handleOperator('*')}
          className={`h-11 font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
            operation === '*' ? 'bg-brand-gold text-slate-950' : 'bg-brand-950 hover:bg-brand-900 text-brand-gold border border-brand-500/20'
          }`}
        >
          ×
        </button>

        {/* Row 3 */}
        <button
          onClick={() => handleDigit('4')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          4
        </button>
        <button
          onClick={() => handleDigit('5')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          5
        </button>
        <button
          onClick={() => handleDigit('6')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          6
        </button>
        <button
          onClick={() => handleOperator('-')}
          className={`h-11 font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
            operation === '-' ? 'bg-brand-gold text-slate-950' : 'bg-brand-950 hover:bg-brand-900 text-brand-gold border border-brand-500/20'
          }`}
        >
          -
        </button>

        {/* Row 4 */}
        <button
          onClick={() => handleDigit('1')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          1
        </button>
        <button
          onClick={() => handleDigit('2')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          2
        </button>
        <button
          onClick={() => handleDigit('3')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          3
        </button>
        <button
          onClick={() => handleOperator('+')}
          className={`h-11 font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
            operation === '+' ? 'bg-brand-gold text-slate-950' : 'bg-brand-950 hover:bg-brand-900 text-brand-gold border border-brand-500/20'
          }`}
        >
          +
        </button>

        {/* Row 5 */}
        <button
          onClick={() => handleDigit('0')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          0
        </button>
        <button
          onClick={() => handleDigit('.')}
          className="h-11 bg-slate-900 hover:bg-slate-850 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
        >
          .
        </button>
        <button
          onClick={handleBackspace}
          className="h-11 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          onClick={handleEquals}
          className="h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-md"
        >
          =
        </button>
      </div>

      {/* Apply / Close Row */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex gap-2">
        <button
          onClick={handleApply}
          className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/50"
        >
          <Check className="w-4 h-4" /> Apply to Field
        </button>
      </div>
    </div>
  );
}

import React, { useRef, useEffect } from 'react';

export default function OtpInput({ value, onChange, error }) {
  const inputsRef = useRef([]);

  useEffect(() => {
    
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (val && isNaN(Number(val))) return; 

    const codeArray = value.split('');
    codeArray[index] = val.slice(-1); 
    const newCode = codeArray.join('');
    onChange(newCode);

    
    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const codeArray = value.split('');
      if (!codeArray[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        codeArray[index - 1] = '';
        onChange(codeArray.join(''));
      } else {
        codeArray[index] = '';
        onChange(codeArray.join(''));
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    onChange(pastedData);
    
    
    const focusIndex = Math.min(pastedData.length, 5);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 md:gap-3.5 my-6">
      {Array.from({ length: 6 }).map((_, idx) => {
        const val = value[idx] || '';
        return (
          <input
            key={idx}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            ref={(el) => (inputsRef.current[idx] = el)}
            onChange={(e) => handleChange(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            className={`w-10 h-12 md:w-12 md:h-14 bg-[#161617] border rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:border-transparent transition-all ${
              error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/5'
            }`}
          />
        );
      })}
    </div>
  );
}

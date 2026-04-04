"use client";

import { useState, useCallback, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface VoiceInputProps {
  onResult: (text: string) => void;
  className?: string;
}

export function VoiceInput({ onResult, className = "" }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggle = useCallback(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
      setListening(false);
    };

    recognition.onerror = () => { setListening(false); };
    recognition.onend = () => { setListening(false); };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, onResult]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
        listening
          ? "bg-[#ff6e84]/20 text-[#ff6e84] animate-pulse"
          : "bg-[#262627] text-[#adaaab] hover:bg-[#2c2c2d] hover:text-white"
      } ${className}`}
      title={listening ? "Arreter" : "Dicter"}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    </button>
  );
}

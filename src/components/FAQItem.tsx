"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FAQItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div 
            className="border border-black/10 rounded-2xl p-6 bg-[#F5F2EB]/50 font-sans cursor-pointer group hover:bg-[#F5F2EB] transition-colors" 
            onClick={() => setIsOpen(!isOpen)}
        >
            <div className="flex justify-between items-center font-serif text-2xl text-[#1A1A1A] select-none outline-none">
                {question}
                <motion.span 
                    animate={{ rotate: isOpen ? 45 : 0 }} 
                    transition={{ duration: 0.3 }}
                    className="text-[#8B3A18] font-sans text-3xl font-light ml-4 flex-shrink-0 origin-center"
                >
                    +
                </motion.span>
            </div>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="text-gray-600 leading-relaxed font-light border-t border-black/5 pt-4 mt-6">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

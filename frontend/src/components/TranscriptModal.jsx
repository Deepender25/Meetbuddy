import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText } from 'lucide-react';

const TranscriptModal = ({ isOpen, onClose, transcript, isLoading }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col pointer-events-auto">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <FileText className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-100">Full Transcript</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                                        <p>Loading transcript...</p>
                                    </div>
                                ) : transcript ? (
                                    <div className="prose prose-invert max-w-none">
                                        <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                                            {transcript}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-500 py-12">
                                        <p>No transcript available.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-2xl flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default TranscriptModal;

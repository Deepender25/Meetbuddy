import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';

const steps = [
    { id: 'upload', label: 'Uploading Video' },
    { id: 'transcribe', label: 'Transcribing Audio' },
    { id: 'structure', label: 'Structuring Data' },
    { id: 'complete', label: 'Finalizing' }
];

const ProcessingStatus = ({ status, progress }) => {
    // Determine current step index based on status message
    const getCurrentStepIndex = () => {
        if (!status) return 0;
        const s = status.toLowerCase();
        if (s.includes('upload')) return 0;
        if (s.includes('transcrib')) return 1;
        if (s.includes('structur') || s.includes('analyz')) return 2;
        if (s.includes('complete')) return 3;
        return 0;
    };

    const currentStepIndex = getCurrentStepIndex();

    return (
        <div className="w-full max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
            <div className="text-center mb-8">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="inline-block mb-4"
                >
                    <Loader2 className="w-12 h-12 text-blue-500" />
                </motion.div>
                <h2 className="text-2xl font-semibold text-slate-100 mb-2">
                    Processing Your Meeting
                </h2>
                <p className="text-slate-400">
                    {status || 'Initializing...'}
                </p>
            </div>

            <div className="relative">
                {/* Progress Bar Background */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-800" />

                {/* Steps */}
                <div className="space-y-8 relative z-10">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-4"
                            >
                                <div
                                    className={clsx(
                                        "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-300 bg-slate-950",
                                        isCompleted ? "border-green-500 text-green-500" :
                                            isCurrent ? "border-blue-500 text-blue-500" :
                                                "border-slate-700 text-slate-700"
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-6 h-6" />
                                    ) : isCurrent ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <Circle className="w-6 h-6" />
                                    )}
                                </div>
                                <div>
                                    <h3 className={clsx(
                                        "font-medium text-lg transition-colors duration-300",
                                        isCompleted ? "text-green-400" :
                                            isCurrent ? "text-blue-400" :
                                                "text-slate-600"
                                    )}>
                                        {step.label}
                                    </h3>
                                    {isCurrent && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            In progress...
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ProcessingStatus;

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileVideo, X, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const UploadSection = ({ onUploadStart }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        validateAndSetFile(droppedFile);
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        validateAndSetFile(selectedFile);
    };

    const validateAndSetFile = (file) => {
        setError(null);
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            setError('Please select a valid video file.');
            return;
        }

        // Check size (e.g., 4GB limit)
        const maxSize = 4 * 1024 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('File size exceeds 4GB limit.');
            return;
        }

        setFile(file);
    };

    const clearFile = () => {
        setFile(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUpload = () => {
        if (file) {
            onUploadStart(file);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"
                    >
                        <AlertCircle className="w-5 h-5" />
                        <p>{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {!file ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={clsx(
                        "relative group cursor-pointer p-12 border-2 border-dashed rounded-2xl transition-all duration-300",
                        isDragging
                            ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
                            : "border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 bg-slate-900/50"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="video/*"
                        className="hidden"
                    />

                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-4 rounded-full bg-slate-800 group-hover:bg-blue-500/20 transition-colors duration-300">
                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-slate-200 mb-1">
                                Upload Video
                            </h3>
                            <p className="text-slate-400">
                                Drag & drop or click to browse
                            </p>
                        </div>
                        <p className="text-sm text-slate-500">
                            Supports MP4, MOV, AVI (Max 4GB)
                        </p>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <FileVideo className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-200">{file.name}</h3>
                                <p className="text-sm text-slate-400">
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={clearFile}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-red-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={handleUpload}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Start Processing
                    </button>
                </motion.div>
            )}
        </div>
    );
};

export default UploadSection;

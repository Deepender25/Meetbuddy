import React from 'react';
import { motion } from 'framer-motion';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
                <header className="mb-12 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-4"
                    >
                        Meeting Intelligence
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-lg"
                    >
                        Transform your video meetings into actionable insights
                    </motion.p>
                </header>

                <main className="relative">
                    {children}
                </main>

                <footer className="mt-16 text-center text-slate-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Meeting Intelligence. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default Layout;

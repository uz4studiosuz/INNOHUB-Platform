"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n";

/** Only what differs between cards. The words come from the dictionary. */
const MODULES = [
  { id: "glider", link: "/modules/glider", icon: "✈️", color: "from-blue-600 to-indigo-600", shadow: "shadow-blue-500/10" },
  { id: "rockets", link: "/modules/rockets", icon: "🚀", color: "from-red-600 to-orange-600", shadow: "shadow-red-500/10" },
  { id: "electronics", link: "/modules/electronics", icon: "🔌", color: "from-emerald-600 to-teal-600", shadow: "shadow-emerald-500/10" },
  { id: "structures", link: "/modules/structures", icon: "🏗️", color: "from-violet-600 to-purple-600", shadow: "shadow-violet-500/10" },
  { id: "hardware", link: "/modules/hardware", icon: "🧩", color: "from-amber-600 to-orange-700", shadow: "shadow-amber-500/10" },
] as const;

export default function Home() {
  const { t } = useI18n();
  const modules = MODULES.map((m) => ({
    ...m,
    title: t(`mod.${m.id}.title`),
    description: t(`mod.${m.id}.desc`),
    tag: t(`mod.${m.id}.tag`),
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto py-4">
      {/* Hero Welcome banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative rounded-3xl overflow-hidden glass-panel border border-[rgba(255,255,255,0.06)] p-8 md:p-12 flex flex-col gap-4 bg-gradient-to-r from-[#0d1322] to-[#121a2e] shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex flex-col gap-2 max-w-2xl">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs font-bold text-blue-500 tracking-widest uppercase"
            >
              {t("dash.eyebrow")}
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-5xl font-extrabold tracking-tight text-white"
            >
              {t("dash.title")}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm md:text-base text-gray-400 leading-relaxed mt-2"
            >
              {t("dash.intro")}
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            whileHover={{ scale: 1.05 }}
            className="flex flex-col gap-2 bg-[#080b11]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 min-w-[200px]"
          >
            <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">{t("dash.engineLabel")}</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-pulse">🤖</span>
              <div>
                <div className="text-xs font-bold text-white">{t("dash.engineName")}</div>
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  {t("dash.engineStatus", { n: MODULES.length })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Grid listing modules */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold tracking-tight text-white px-2">
          {t("dash.modulesHeading")}
        </h2>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {modules.map((m, idx) => (
            <motion.div key={idx} variants={itemVariants} whileHover={{ y: -8 }}>
              <Link 
                href={m.link} 
                className={`group flex flex-col justify-between p-6 h-full rounded-2xl glass-panel border border-[rgba(255,255,255,0.06)] bg-[#0d1220]/50 hover:bg-[#11182c]/80 transition-colors shadow-xl ${m.shadow} hover:border-blue-500/30`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${m.color} flex items-center justify-center text-2xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                      {m.icon}
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                      {m.tag}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors mt-2">
                    {m.title}
                  </h3>
                  
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {m.description}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors mt-6 pt-4 border-t border-[rgba(255,255,255,0.04)]">
                  <span>{t("dash.start")}</span>
                  <motion.span 
                    animate={{ x: [0, 4, 0] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="inline-block"
                  >
                    →
                  </motion.span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

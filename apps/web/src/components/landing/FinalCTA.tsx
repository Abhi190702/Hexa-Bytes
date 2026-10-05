'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-[#0a0b0d] px-6 py-32 md:py-40">
      {/* faint animated backdrop */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 30% 40%, rgba(230,126,34,0.18), transparent 45%), radial-gradient(circle at 70% 60%, rgba(231,76,60,0.16), transparent 45%)',
        }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-15%' }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
          Explore the Environmental Pulse of Delhi NCR
        </h2>
        <p className="mt-6 text-lg text-white/65">
          A living, hexagon-by-hexagon map of the city&apos;s hidden environmental burden.
        </p>
        <Link
          href="/map"
          className="group mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-transform hover:scale-[1.03]"
        >
          Open Live Environmental Stress Map
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </section>
  );
}

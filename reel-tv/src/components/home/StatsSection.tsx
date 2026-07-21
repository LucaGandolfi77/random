"use client";

import { motion } from "motion/react";
import { Users, Video, Clock, DollarSign } from "lucide-react";

const stats = [
  { icon: Users, label: "Active Creators", value: "10,000+", color: "text-blue-500" },
  { icon: Video, label: "Videos Broadcast", value: "50,000+", color: "text-reel" },
  { icon: Clock, label: "Hours Watched", value: "1M+", color: "text-green-500" },
  { icon: DollarSign, label: "Creator Earnings", value: "€500K+", color: "text-yellow-500" },
];

export function StatsSection() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass rounded-xl p-6 text-center"
            >
              <stat.icon className={`mx-auto mb-3 h-8 w-8 ${stat.color}`} />
              <div className="mb-1 text-2xl font-bold md:text-3xl">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

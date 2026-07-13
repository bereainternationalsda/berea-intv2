"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Card3DProps = {
  href: string;
  title: string;
  description?: string;
  icon?: string;
  index?: number;
};

function useTilt() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 15, mass: 0.5 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), springConfig);

  function handleMouseMove(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return { rotateX, rotateY, handleMouseMove, handleMouseLeave };
}

export function Card3D({ href, title, description, icon, index = 0 }: Card3DProps) {
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTilt();

  return (
    <div className="perspective-1000">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.04 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group"
      >
        <Link
          href={href}
          className="block h-full rounded-2xl border border-navy-100 bg-white p-8 shadow-md transition-shadow duration-300 group-hover:shadow-2xl"
        >
          <div
            style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}
            className="flex h-full flex-col"
          >
            {icon && (
              <span
                style={{ transform: "translateZ(30px)" }}
                className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-navy-50 text-3xl"
              >
                {icon}
              </span>
            )}
            <h3 className="font-serif text-xl font-bold text-navy-900">{title}</h3>
            {description && (
              <p className="mt-3 text-sm leading-relaxed text-navy-700/80">
                {description}
              </p>
            )}
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-navy-600 group-hover:text-navy-800">
              Learn more
              <span className="transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </span>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

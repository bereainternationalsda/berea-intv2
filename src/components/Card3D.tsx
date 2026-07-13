"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Card3DProps = {
  href: string;
  title: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  index?: number;
};

function useTilt() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 15, mass: 0.5 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), springConfig);

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

export function Card3D({
  href,
  title,
  description,
  icon,
  imageUrl,
  index = 0,
}: Card3DProps) {
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTilt();

  return (
    <div className="perspective-1000">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.03 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group h-full"
      >
        <Link
          href={href}
          className="flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-md transition-shadow duration-300 group-hover:shadow-2xl"
        >
          <div
            style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
            className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gradient-to-br from-navy-100 to-navy-50"
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              icon && (
                <span className="flex h-full w-full items-center justify-center text-6xl">
                  {icon}
                </span>
              )
            )}
          </div>

          <div
            style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}
            className="flex flex-1 flex-col p-7"
          >
            <h3 className="font-serif text-xl font-bold text-navy-900 underline decoration-2 underline-offset-4">
              {title}
            </h3>
            {description && (
              <p className="mt-4 flex-1 text-sm leading-relaxed text-navy-700/80">
                {description}
              </p>
            )}
            <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-navy-800 px-5 py-2 text-xs font-bold uppercase tracking-wide text-navy-800 transition-colors group-hover:bg-navy-800 group-hover:text-white">
              <span className="transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
              Read More
            </span>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

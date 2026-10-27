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
  /** Small line above the title, e.g. an event's dates. */
  eyebrow?: string;
  /** Pill shown over the image, e.g. "Happening now". */
  badge?: string;
  /** Small line under the description, e.g. an event's venue. */
  footnote?: string;
  /** Text of the button; defaults to "Read More". */
  ctaLabel?: string;
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
  eyebrow,
  badge,
  footnote,
  ctaLabel = "Read More",
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
                // Mirrors CardGrid: 3 columns from lg, 2 from sm, 1 below. The
                // 347px cap is the column width once the 72rem container maxes out.
                sizes="(min-width: 1280px) 347px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              icon && (
                <span className="flex h-full w-full items-center justify-center text-6xl">
                  {icon}
                </span>
              )
            )}
            {badge && (
              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-navy-800 shadow">
                {badge}
              </span>
            )}
          </div>

          <div
            style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}
            className="flex flex-1 flex-col p-7"
          >
            {eyebrow && (
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-600">
                {eyebrow}
              </p>
            )}
            <h3 className="font-serif text-xl font-bold text-navy-900 underline decoration-2 underline-offset-4">
              {title}
            </h3>
            {(description || footnote) && (
              <div className="mt-4 flex-1">
                {description && (
                  <p className="text-sm leading-relaxed text-navy-700/80">{description}</p>
                )}
                {footnote && (
                  <p className="mt-3 text-xs font-semibold text-navy-700">{footnote}</p>
                )}
              </div>
            )}
            <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-navy-800 px-5 py-2 text-xs font-bold uppercase tracking-wide text-navy-800 transition-colors group-hover:bg-navy-800 group-hover:text-white">
              <span className="transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
              {ctaLabel}
            </span>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

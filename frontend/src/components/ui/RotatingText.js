import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RotatingText = forwardRef(({
  texts,
  mainClassName = "",
  staggerFrom = "last",
  initial = { y: "100%" },
  animate = { y: 0 },
  exit = { y: "-120%" },
  staggerDuration = 0.025,
  splitLevelClassName = "",
  transition = { type: "spring", damping: 30, stiffness: 400 },
  rotationInterval = 2000,
  splitBy = "characters",
  auto = true,
  loop = true,
  onClick
}, ref) => {
  const [index, setIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    next: () => setIndex((prev) => prev + 1)
  }));

  useEffect(() => {
    if (!auto) return;
    const interval = setInterval(() => {
      setIndex((prev) => {
        if (!loop && prev >= texts.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, rotationInterval);
    return () => clearInterval(interval);
  }, [texts.length, rotationInterval, auto, loop]);

  const handleContainerClick = (e) => {
    if (onClick) onClick(e);
    setIndex((prev) => prev + 1);
  };

  const textIndex = index % texts.length;
  const currentText = texts[textIndex] || "";
  const items = splitBy === "characters" ? currentText.split("") : currentText.split(" ");

  return (
    <div 
      className={mainClassName} 
      onClick={handleContainerClick} 
      style={{ display: 'inline-flex', overflow: 'hidden', cursor: 'pointer' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className={splitLevelClassName}
          style={{ display: 'inline-flex', overflow: 'hidden' }}
        >
          {items.map((item, i) => {
            const isLast = staggerFrom === "last";
            const delay = isLast 
              ? (items.length - 1 - i) * staggerDuration 
              : i * staggerDuration;

            return (
              <motion.span
                key={i}
                initial={initial}
                animate={animate}
                exit={exit}
                transition={{ ...transition, delay }}
                style={{ display: 'inline-block', whiteSpace: 'pre' }}
              >
                {item}
              </motion.span>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export default RotatingText;

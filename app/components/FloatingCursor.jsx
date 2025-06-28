"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function FloatingCursor() {
  const cursorRef = useRef(null);
  const followerRef = useRef(null);

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const followerX = useMotionValue(0);
  const followerY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 700 };
  const springX = useSpring(cursorX, springConfig);
  const springY = useSpring(cursorY, springConfig);
  const followerSpringX = useSpring(followerX, { damping: 25, stiffness: 300 });
  const followerSpringY = useSpring(followerY, { damping: 25, stiffness: 300 });

  useEffect(() => {
    const moveCursor = (e) => {
      cursorX.set(e.clientX - 10);
      cursorY.set(e.clientY - 10);
      followerX.set(e.clientX - 4);
      followerY.set(e.clientY - 4);
    };

    const handleMouseEnter = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = "scale(1.5)";
      }
    };

    const handleMouseLeave = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = "scale(1)";
      }
    };

    window.addEventListener("mousemove", moveCursor);

    // Add hover effects to interactive elements
    const interactiveElements = document.querySelectorAll(
      "button, a, input, textarea, select"
    );
    interactiveElements.forEach((el) => {
      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      interactiveElements.forEach((el) => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, [cursorX, cursorY, followerX, followerY]);

  return (
    <>
      <motion.div
        ref={cursorRef}
        className="cursor hidden md:block"
        style={{
          x: springX,
          y: springY,
        }}
      />
      <motion.div
        ref={followerRef}
        className="cursor-follower hidden md:block"
        style={{
          x: followerSpringX,
          y: followerSpringY,
        }}
      />
    </>
  );
}

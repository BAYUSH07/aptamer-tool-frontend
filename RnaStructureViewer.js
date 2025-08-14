// src/RnaStructureViewer.js

import React, { useRef, useEffect, useState } from "react";
import { FornaContainer } from "fornac";

const RnaStructureViewer = ({ sequence, structure, width = 340, height = 220 }) => {
  const containerRef = useRef();
  const [error, setError] = useState(null);

  // Helper: Validate balanced parentheses
  const isValidDotBracket = (str) => {
    let stack = [];
    for (let ch of str) {
      if (ch === "(") stack.push(ch);
      else if (ch === ")") {
        if (!stack.length) return false;
        stack.pop();
      }
    }
    return stack.length === 0;
  };

  // Optional: Validate base pair compatibility
  const isCompatibleBase = (b1, b2) => {
    const pairs = ["AU", "UA", "GC", "CG", "GU", "UG"];
    return pairs.includes(b1 + b2);
  };

  const validatePairing = (seq, struct) => {
    const stack = [];
    for (let i = 0; i < struct.length; i++) {
      const ch = struct[i];
      if (ch === "(") {
        stack.push(i);
      } else if (ch === ")") {
        const j = stack.pop();
        if (j === undefined) return false;
        const base1 = seq[j];
        const base2 = seq[i];
        if (!isCompatibleBase(base1, base2)) {
          setError(`Unmatched base at position ${j + 1}: ${base1}-${base2}`);
          return false;
        }
      }
    }
    return true;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (!sequence || !structure) {
      setError("Missing sequence or structure input.");
      return;
    }

    // Clean inputs
    let cleanSeq = sequence.toUpperCase().replace(/T/g, "U").replace(/[^AUGC]/g, "");
    let cleanStruct = structure.replace(/[^().]/g, "");

    // Validation
    if (cleanSeq.length !== cleanStruct.length) {
      setError(`Sequence length (${cleanSeq.length}) and structure length (${cleanStruct.length}) do not match.`);
      return;
    }

    if (!isValidDotBracket(cleanStruct)) {
      setError("Invalid structure: unbalanced parentheses.");
      return;
    }

    if (!validatePairing(cleanSeq, cleanStruct)) {
      return; // error already set inside validatePairing
    }

    setError(null);
    if (containerRef.current) containerRef.current.innerHTML = "";

    try {
      console.log("✅ FornaContainer is ready:", typeof FornaContainer);

      const fc = new FornaContainer(containerRef.current, {
        width,
        height,
        applyForce: false,
        allowPanningAndZooming: true,
        displayAllLinks: true,
      });

      fc.addRNA(cleanSeq, cleanStruct, { name: "Aptamer" });
      console.log("✅ RNA structure rendered successfully");

      return () => {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      };
    } catch (outer) {
      console.error("❌ Forna initialization failed:", outer);
      setError(`Initialization failed: ${outer?.message || outer || "Unknown error"}`);
    }
  }, [sequence, structure, width, height]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "red",
          fontWeight: "bold",
          padding: 10,
          border: "1px solid red",
          borderRadius: 6,
          backgroundColor: "#ffe6e6",
          fontSize: 14,
          textAlign: "center",
          userSelect: "text",
        }}
        role="alert"
        aria-live="assertive"
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        margin: "0 auto",
        border: "1px solid #ccc", // 🔍 Visual debug border
      }}
      aria-label="RNA secondary structure visualization"
      role="img"
    />
  );
};

export default RnaStructureViewer;


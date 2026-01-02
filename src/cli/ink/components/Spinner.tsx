import React, { useEffect, useState } from "react";
import { Text } from "ink";

export function Spinner({ label }: { label: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => v + 1), 200);
    return () => clearInterval(t);
  }, []);

  const dots = [".", "..", "...", ""][i % 4];
  return <Text>{label + dots}</Text>;
}



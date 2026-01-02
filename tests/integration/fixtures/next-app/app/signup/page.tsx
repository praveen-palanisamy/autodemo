"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main style={{ padding: 24, display: "grid", gap: 12, maxWidth: 420 }}>
      <h1>Signup</h1>
      <label>
        Email
        <input
          data-testid="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </label>
      <label>
        Password
        <input
          data-testid="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </label>
      <button
        data-testid="signup-button"
        onClick={() => {
          if (!email || !password) return;
          router.push("/dashboard");
        }}
        style={{ padding: 10 }}
      >
        Sign up
      </button>
    </main>
  );
}



import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>AutoDemo Fixture</h1>
      <p>This is a minimal Next.js app used for AutoDemo integration tests.</p>
      <ul>
        <li>
          <Link href="/signup" data-testid="nav-signup">
            Go to Signup
          </Link>
        </li>
      </ul>
    </main>
  );
}


